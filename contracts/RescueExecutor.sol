// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

contract RescueExecutor {
    address public constant SPONSOR = 0x272568D25b9634Ad8A4e8E8CBB10b729f41C781d;

    error Unauthorized();
    error CallFailed(uint256 index, bytes reason);

    function executeBatch(address[] calldata targets, bytes[] calldata datas) external {
        if (msg.sender != SPONSOR) revert Unauthorized();
        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, bytes memory reason) = targets[i].call(datas[i]);
            if (!success) {
                revert CallFailed(i, reason);
            }
        }
    }
}
