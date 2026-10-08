// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

contract RescueExecutor {
    address public immutable sponsor;

    error Unauthorized();
    error CallFailed(uint256 index, bytes reason);

    constructor(address _sponsor) {
        sponsor = _sponsor;
    }

    function executeBatch(address[] calldata targets, bytes[] calldata datas) external {
        if (msg.sender != sponsor) revert Unauthorized();
        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, bytes memory reason) = targets[i].call(datas[i]);
            if (!success) {
                revert CallFailed(i, reason);
            }
        }
    }
}
