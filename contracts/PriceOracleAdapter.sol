// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @notice Signed price provenance store. A quote is an operator statement, not an exchange oracle.
contract PriceOracleAdapter is AccessControl, EIP712 {
    bytes32 public constant PRICE_SIGNER_ADMIN_ROLE = keccak256("PRICE_SIGNER_ADMIN_ROLE");
    bytes32 private constant PRICE_TYPEHASH = keccak256(
        "CommodityPrice(uint8 commodity,uint256 usdPerKgE8,bytes32 sourceHash,uint64 updatedAt,uint256 nonce)"
    );
    uint8 public constant COMMODITY_COUNT = 9;

    struct Price { uint192 usdPerKgE8; bytes32 sourceHash; uint64 updatedAt; uint64 nonce; }
    mapping(uint8 => Price) public latestPrice;
    mapping(address => bool) public priceSigners;

    event PriceSignerUpdated(address indexed signer, bool active);
    event PriceUpdated(uint8 indexed commodity, uint256 usdPerKgE8, bytes32 indexed sourceHash, uint64 updatedAt, uint64 nonce, address signer);

    constructor(address admin, address signer) EIP712("sCRIT Price", "1") {
        require(admin != address(0) && signer != address(0), "zero address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PRICE_SIGNER_ADMIN_ROLE, admin);
        priceSigners[signer] = true;
        emit PriceSignerUpdated(signer, true);
    }

    function setPriceSigner(address signer, bool active) external onlyRole(PRICE_SIGNER_ADMIN_ROLE) {
        require(signer != address(0), "zero signer");
        priceSigners[signer] = active;
        emit PriceSignerUpdated(signer, active);
    }

    function publishPrice(
        uint8 commodity,
        uint192 usdPerKgE8,
        bytes32 sourceHash,
        uint64 updatedAt,
        uint64 nonce,
        bytes calldata signature
    ) external {
        require(commodity < COMMODITY_COUNT && usdPerKgE8 > 0 && sourceHash != bytes32(0), "invalid price");
        Price memory previous = latestPrice[commodity];
        require(nonce == previous.nonce + 1, "bad nonce");
        require(updatedAt <= block.timestamp && updatedAt >= block.timestamp - 1 days, "stale price");
        bytes32 structHash = keccak256(abi.encode(PRICE_TYPEHASH, commodity, usdPerKgE8, sourceHash, updatedAt, nonce));
        address signer = ECDSA.recover(_hashTypedDataV4(structHash), signature);
        require(priceSigners[signer], "unauthorized price signer");
        latestPrice[commodity] = Price(usdPerKgE8, sourceHash, updatedAt, nonce);
        emit PriceUpdated(commodity, usdPerKgE8, sourceHash, updatedAt, nonce, signer);
    }

    function freshPrice(uint8 commodity, uint64 maxAge) external view returns (Price memory p) {
        require(commodity < COMMODITY_COUNT, "invalid commodity");
        p = latestPrice[commodity];
        require(p.usdPerKgE8 > 0 && p.updatedAt <= block.timestamp && block.timestamp - p.updatedAt <= maxAge, "missing or stale price");
    }
}
