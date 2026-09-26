// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @notice Testnet interface boundary. Production must replace its reviewer with an approved KYC provider.
contract KycRegistry is AccessControl {
    bytes32 public constant KYC_REVIEWER_ROLE = keccak256("KYC_REVIEWER_ROLE");
    mapping(address => bytes32) public approvalEvidence;
    event KycStatusChanged(address indexed account, bool approved, bytes32 evidenceHash);

    constructor(address admin) {
        require(admin != address(0), "zero admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(KYC_REVIEWER_ROLE, admin);
    }

    function setApproval(address account, bytes32 evidenceHash) external onlyRole(KYC_REVIEWER_ROLE) {
        require(account != address(0), "zero account");
        approvalEvidence[account] = evidenceHash;
        emit KycStatusChanged(account, evidenceHash != bytes32(0), evidenceHash);
    }

    function isApproved(address account) external view returns (bool) { return approvalEvidence[account] != bytes32(0); }
}
