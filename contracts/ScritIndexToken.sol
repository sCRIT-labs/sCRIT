// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";

/// @notice New, mint-controlled sCRIT token. Existing deployments are not upgraded.
contract ScritIndexToken is ERC20, ERC20Pausable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    event Minted(address indexed recipient, uint256 amount, bytes32 indexed batchId);

    constructor(address admin, address reserveManager, address guardian)
        ERC20("sCRIT Index", "sCRIT")
    {
        require(admin != address(0) && reserveManager != address(0) && guardian != address(0), "zero address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, reserveManager);
        _grantRole(PAUSER_ROLE, guardian);
    }

    function mint(address to, uint256 amount, bytes32 batchId) external onlyRole(MINTER_ROLE) {
        require(to != address(0) && amount > 0, "invalid mint");
        _mint(to, amount);
        emit Minted(to, amount, batchId);
    }

    function pause() external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}
