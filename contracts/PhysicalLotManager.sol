// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {CustodianRegistry} from "./CustodianRegistry.sol";
import {PhysicalLotToken} from "./PhysicalLotToken.sol";

/// @notice Mints 100 tradeable units only after a scoped custodian signs the lot certificate record.
contract PhysicalLotManager is AccessControl, Pausable, EIP712 {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 private constant LOT_TYPEHASH = keccak256(
        "LotAttestation(bytes32 lotId,uint8 commodity,bytes32 certificateHash,bytes32 gradeSpecHash,bytes32 vaultIdHash,bytes32 provenanceHash,uint64 timestamp,uint256 nonce,address recipient)"
    );
    uint64 public constant MAX_AGE = 7 days;
    uint64 public constant FUTURE_SKEW = 5 minutes;
    /// @dev Index commodities 0..8 plus individually certified diamonds at index 9.
    uint8 public constant LOT_COMMODITY_COUNT = 10;

    struct LotAttestation {
        bytes32 lotId;
        uint8 commodity;
        bytes32 certificateHash;
        bytes32 gradeSpecHash;
        bytes32 vaultIdHash;
        bytes32 provenanceHash;
        uint64 timestamp;
        uint256 nonce;
        address recipient;
    }

    CustodianRegistry public immutable custodians;
    PhysicalLotToken public immutable lots;
    mapping(bytes32 => bool) public usedLotId;
    mapping(address => mapping(uint256 => bool)) public usedNonce;
    mapping(uint256 => bytes32) public lotRecordId;

    event LotAttested(bytes32 indexed lotId, uint256 indexed tokenId, uint8 commodity, bytes32 certificateHash, address indexed custodian);

    constructor(address admin, address guardian, address registry, address lotToken)
        EIP712("sCRIT Physical Lots", "1")
    {
        require(admin != address(0) && guardian != address(0) && registry != address(0) && lotToken != address(0), "zero address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, guardian);
        custodians = CustodianRegistry(registry);
        lots = PhysicalLotToken(lotToken);
    }

    function pause() external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    function createLot(LotAttestation calldata a, bytes calldata signature) external whenNotPaused returns (uint256 tokenId) {
        require(a.lotId != bytes32(0) && !usedLotId[a.lotId], "lot already exists");
        require(a.commodity < LOT_COMMODITY_COUNT && a.certificateHash != bytes32(0) && a.gradeSpecHash != bytes32(0) && a.vaultIdHash != bytes32(0), "incomplete lot evidence");
        require(a.recipient != address(0), "zero recipient");
        require(a.timestamp <= block.timestamp + FUTURE_SKEW && a.timestamp >= block.timestamp - MAX_AGE, "stale attestation");
        bytes32 structHash = keccak256(abi.encode(LOT_TYPEHASH, a.lotId, a.commodity, a.certificateHash, a.gradeSpecHash, a.vaultIdHash, a.provenanceHash, a.timestamp, a.nonce, a.recipient));
        address signer = ECDSA.recover(_hashTypedDataV4(structHash), signature);
        require(custodians.isAuthorized(signer, a.commodity), "unauthorized custodian scope");
        require(!usedNonce[signer][a.nonce], "nonce already used");
        usedLotId[a.lotId] = true;
        usedNonce[signer][a.nonce] = true;
        tokenId = uint256(a.lotId);
        lotRecordId[tokenId] = a.lotId;
        lots.mintLot(a.recipient, tokenId, a.certificateHash);
        emit LotAttested(a.lotId, tokenId, a.commodity, a.certificateHash, signer);
    }
}
