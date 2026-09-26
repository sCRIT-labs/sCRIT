// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Fixed-supply fungible token created by the legacy Rail A launcher.
contract sCRITToken is ERC20 {
    constructor(string memory tokenName, string memory tokenSymbol, uint256 supply)
        ERC20(tokenName, tokenSymbol)
    {
        _mint(msg.sender, supply);
    }
}
