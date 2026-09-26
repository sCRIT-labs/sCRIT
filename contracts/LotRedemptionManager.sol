// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PhysicalLotToken} from "./PhysicalLotToken.sol";
import {KycRegistry} from "./KycRegistry.sol";

/// @notice Testnet physical redemption state machine. Shipping statuses require operator evidence.
contract LotRedemptionManager is AccessControl, Pausable, ReentrancyGuard {
    enum Status { None, Requested, Approved, Shipped, Completed, Rejected }
    struct Request { address holder; uint256 lotId; uint256 fractions; Status status; bytes32 evidenceHash; uint64 updatedAt; }
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    PhysicalLotToken public immutable lots;
    KycRegistry public immutable kyc;
    uint256 public nextRequestId = 1;
    mapping(uint256 => Request) public requests;

    event RedeemRequested(uint256 indexed requestId, address indexed holder, uint256 indexed lotId, uint256 fractions);
    event RedeemStatusChanged(uint256 indexed requestId, Status status, bytes32 evidenceHash);

    constructor(address admin, address guardian, address lotToken, address kycRegistry) {
        require(admin != address(0) && guardian != address(0) && lotToken != address(0) && kycRegistry != address(0), "zero address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, guardian);
        lots = PhysicalLotToken(lotToken);
        kyc = KycRegistry(kycRegistry);
    }

    function request(uint256 lotId, uint256 fractions) external whenNotPaused nonReentrant returns (uint256 id) {
        require(kyc.isApproved(msg.sender), "KYC required");
        require(fractions == 100 && lots.lotSupply(lotId) == fractions, "full physical lot required");
        require(lots.balanceOf(msg.sender, lotId) >= fractions, "insufficient lot units");
        lots.lockForRedemption(msg.sender, lotId, fractions);
        id = nextRequestId++;
        requests[id] = Request(msg.sender, lotId, fractions, Status.Requested, bytes32(0), uint64(block.timestamp));
        emit RedeemRequested(id, msg.sender, lotId, fractions);
        emit RedeemStatusChanged(id, Status.Requested, bytes32(0));
    }

    function setStatus(uint256 id, Status next, bytes32 evidenceHash) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        Request storage item = requests[id];
        require(item.status == Status.Requested || item.status == Status.Approved || item.status == Status.Shipped, "request closed");
        require(
            (item.status == Status.Requested && (next == Status.Approved || next == Status.Rejected)) ||
            (item.status == Status.Approved && next == Status.Shipped) ||
            (item.status == Status.Shipped && next == Status.Completed),
            "invalid transition"
        );
        if (next == Status.Shipped || next == Status.Completed || next == Status.Rejected) require(evidenceHash != bytes32(0), "evidence required");
        if (next == Status.Approved) {
            lots.burnForRedemption(item.holder, item.lotId, item.fractions, bytes32(id));
        } else if (next == Status.Rejected) {
            lots.unlockRedemption(item.holder, item.lotId, item.fractions);
        }
        item.status = next;
        item.evidenceHash = evidenceHash;
        item.updatedAt = uint64(block.timestamp);
        emit RedeemStatusChanged(id, next, evidenceHash);
    }

    function pause() external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }
}
