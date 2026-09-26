// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

/// @notice Two-day minimum delay for protocol administration; production proposers must be a multisig.
contract ScritTimelockController is TimelockController {
    constructor(uint256 minDelay, address[] memory proposers, address[] memory executors, address admin)
        TimelockController(minDelay, proposers, executors, admin)
    {}
}
