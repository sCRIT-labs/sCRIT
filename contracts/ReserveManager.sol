// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {CustodianRegistry} from "./CustodianRegistry.sol";
import {PriceOracleAdapter} from "./PriceOracleAdapter.sol";

interface IScritMintable {
    function totalSupply() external view returns (uint256);
    function mint(address to, uint256 amount, bytes32 batchId) external;
}

/// @notice Testnet reserve accounting and attestation-gated, mint-at-NAV issuance.
/// Price sources and signed custody statements remain explicit trust assumptions.
contract ReserveManager is AccessControl, Pausable, EIP712 {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 private constant ATTESTATION_TYPEHASH = keccak256(
        "ReserveAttestation(bytes32 batchId,uint8 commodity,uint256 massKgE12,bytes32 gradeSpecHash,bytes32 certificateHash,bytes32 vaultIdHash,uint64 timestamp,uint256 nonce)"
    );
    uint256 public constant MASS_SCALE = 1e12;
    uint256 public constant USD_SCALE = 1e8;
    uint64 public constant ATTESTATION_MAX_AGE = 7 days;
    uint64 public constant PRICE_MAX_AGE = 1 days;
    uint64 public constant FUTURE_SKEW = 5 minutes;

    struct Attestation {
        bytes32 batchId;
        uint8 commodity;
        uint128 massKgE12;
        bytes32 gradeSpecHash;
        bytes32 certificateHash;
        bytes32 vaultIdHash;
        uint64 timestamp;
        uint256 nonce;
    }

    IScritMintable public immutable token;
    CustodianRegistry public immutable custodians;
    PriceOracleAdapter public immutable prices;
    address public immutable reserveTreasury;
    uint256 public immutable maxSupply;
    mapping(bytes32 => bool) public usedBatch;
    mapping(address => mapping(uint256 => bool)) public usedNonce;
    mapping(uint8 => uint256) public holdingsKgE12;
    uint256 public lastReserveValueUsdE8;

    event PhysicalPurchaseAttested(bytes32 indexed batchId, uint8 indexed commodity, uint256 massKgE12, bytes32 certificateHash, address indexed custodian);
    event ReserveMinted(bytes32 indexed batchId, uint256 reserveValueUsdE8, uint256 amount, uint256 newSupply);
    event NAVSnapshot(uint256 reserveValueUsdE8, uint256 supply, uint256 navUsdPerTokenE8, uint64 timestamp);

    constructor(
        address admin,
        address guardian,
        address treasury,
        address tokenAddress,
        address custodianRegistry,
        address priceAdapter,
        uint256 supplyCap
    ) EIP712("sCRIT Reserve", "2") {
        require(admin != address(0) && guardian != address(0) && treasury != address(0), "zero role address");
        require(tokenAddress != address(0) && custodianRegistry != address(0) && priceAdapter != address(0), "zero dependency");
        require(supplyCap > 0, "zero supply cap");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, guardian);
        reserveTreasury = treasury;
        token = IScritMintable(tokenAddress);
        custodians = CustodianRegistry(custodianRegistry);
        prices = PriceOracleAdapter(priceAdapter);
        maxSupply = supplyCap;
    }

    function pause() external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    function recordPurchase(Attestation calldata a, bytes calldata signature) external whenNotPaused returns (uint256 minted) {
        require(a.batchId != bytes32(0) && !usedBatch[a.batchId], "batch already used");
        require(a.massKgE12 > 0 && a.certificateHash != bytes32(0) && a.gradeSpecHash != bytes32(0) && a.vaultIdHash != bytes32(0), "incomplete evidence");
        require(a.timestamp <= block.timestamp + FUTURE_SKEW && a.timestamp >= block.timestamp - ATTESTATION_MAX_AGE, "stale attestation");
        bytes32 structHash = keccak256(abi.encode(ATTESTATION_TYPEHASH, a.batchId, a.commodity, a.massKgE12, a.gradeSpecHash, a.certificateHash, a.vaultIdHash, a.timestamp, a.nonce));
        address signer = ECDSA.recover(_hashTypedDataV4(structHash), signature);
        require(custodians.isAuthorized(signer, a.commodity), "unauthorized custodian scope");
        require(!usedNonce[signer][a.nonce], "nonce already used");

        PriceOracleAdapter.Price memory price = prices.freshPrice(a.commodity, PRICE_MAX_AGE);
        uint256 addedValueUsdE8 = Math.mulDiv(a.massKgE12, price.usdPerKgE8, MASS_SCALE);
        require(addedValueUsdE8 > 0, "zero reserve value");
        uint256 currentSupply = token.totalSupply();
        uint256 currentValueUsdE8 = _currentReserveValue();
        if (currentSupply == 0) {
            require(currentValueUsdE8 == 0, "inconsistent reserve state");
            minted = addedValueUsdE8 * (1e18 / USD_SCALE);
        } else {
            require(currentValueUsdE8 > 0, "inconsistent reserve state");
            minted = Math.mulDiv(addedValueUsdE8, currentSupply, currentValueUsdE8);
        }
        require(minted > 0 && currentSupply + minted <= maxSupply, "supply cap");

        usedBatch[a.batchId] = true;
        usedNonce[signer][a.nonce] = true;
        holdingsKgE12[a.commodity] += a.massKgE12;
        uint256 newReserveValue = _currentReserveValue();
        lastReserveValueUsdE8 = newReserveValue;

        token.mint(reserveTreasury, minted, a.batchId);
        emit PhysicalPurchaseAttested(a.batchId, a.commodity, a.massKgE12, a.certificateHash, signer);
        emit ReserveMinted(a.batchId, addedValueUsdE8, minted, currentSupply + minted);
        emit NAVSnapshot(newReserveValue, currentSupply + minted, Math.mulDiv(newReserveValue, 1e18, currentSupply + minted), uint64(block.timestamp));
    }

    function snapshotNav() external whenNotPaused returns (uint256 valueUsdE8, uint256 navUsdE8) {
        valueUsdE8 = _currentReserveValue();
        uint256 supply = token.totalSupply();
        require(supply > 0, "no supply");
        lastReserveValueUsdE8 = valueUsdE8;
        navUsdE8 = Math.mulDiv(valueUsdE8, 1e18, supply);
        emit NAVSnapshot(valueUsdE8, supply, navUsdE8, uint64(block.timestamp));
    }

    function currentReserveValue() external view returns (uint256) { return _currentReserveValue(); }

    function _currentReserveValue() internal view returns (uint256 totalValue) {
        for (uint8 commodity = 0; commodity < 9; commodity++) {
            uint256 mass = holdingsKgE12[commodity];
            if (mass == 0) continue;
            PriceOracleAdapter.Price memory price = prices.freshPrice(commodity, PRICE_MAX_AGE);
            totalValue += Math.mulDiv(mass, price.usdPerKgE8, MASS_SCALE);
        }
    }
}
