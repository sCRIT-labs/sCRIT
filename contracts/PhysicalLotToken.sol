// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC1155Pausable} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Pausable.sol";

/// @notice Each certified lot is represented by exactly 100 ERC-1155 units.
contract PhysicalLotToken is ERC1155, ERC1155Pausable, AccessControl {
    bytes32 public constant LOT_MANAGER_ROLE = keccak256("LOT_MANAGER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    uint256 public constant FRACTIONS_PER_LOT = 100;
    mapping(uint256 => bytes32) public certificateHash;
    mapping(uint256 => bool) public lotCreated;
    mapping(uint256 => bool) public lotRedeemed;
    mapping(uint256 => uint256) public lotSupply;
    mapping(address => mapping(uint256 => uint256)) public redemptionLocked;

    event LotMinted(uint256 indexed lotId, address indexed recipient, bytes32 certificateHash, uint256 fractions);
    event LotBurned(uint256 indexed lotId, address indexed account, uint256 fractions, bytes32 indexed redemptionId);
    event RedemptionLockChanged(address indexed account, uint256 indexed lotId, uint256 fractions, bool locked);

    constructor(address admin, address manager, address redemptionManager, address guardian, string memory uri_)
        ERC1155(uri_)
    {
        require(admin != address(0) && manager != address(0) && redemptionManager != address(0) && guardian != address(0), "zero address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(LOT_MANAGER_ROLE, manager);
        _grantRole(LOT_MANAGER_ROLE, redemptionManager);
        _grantRole(PAUSER_ROLE, guardian);
    }

    function mintLot(address to, uint256 lotId, bytes32 certHash) external onlyRole(LOT_MANAGER_ROLE) {
        require(to != address(0) && certHash != bytes32(0) && !lotCreated[lotId], "invalid lot");
        lotCreated[lotId] = true;
        certificateHash[lotId] = certHash;
        lotSupply[lotId] = FRACTIONS_PER_LOT;
        _mint(to, lotId, FRACTIONS_PER_LOT, "");
        emit LotMinted(lotId, to, certHash, FRACTIONS_PER_LOT);
    }

    function burnForRedemption(address account, uint256 lotId, uint256 fractions, bytes32 redemptionId)
        external onlyRole(LOT_MANAGER_ROLE)
    {
        require(lotCreated[lotId] && !lotRedeemed[lotId] && fractions > 0 && redemptionId != bytes32(0), "invalid redemption");
        require(redemptionLocked[account][lotId] == fractions, "redemption not locked");
        redemptionLocked[account][lotId] = 0;
        _burn(account, lotId, fractions);
        lotSupply[lotId] -= fractions;
        if (lotSupply[lotId] == 0) lotRedeemed[lotId] = true;
        emit LotBurned(lotId, account, fractions, redemptionId);
    }

    function lockForRedemption(address account, uint256 lotId, uint256 fractions) external onlyRole(LOT_MANAGER_ROLE) {
        require(account != address(0) && fractions > 0 && redemptionLocked[account][lotId] == 0, "invalid redemption lock");
        require(balanceOf(account, lotId) >= fractions, "insufficient lot units");
        redemptionLocked[account][lotId] = fractions;
        emit RedemptionLockChanged(account, lotId, fractions, true);
    }

    function unlockRedemption(address account, uint256 lotId, uint256 fractions) external onlyRole(LOT_MANAGER_ROLE) {
        require(redemptionLocked[account][lotId] == fractions && fractions > 0, "invalid redemption unlock");
        redemptionLocked[account][lotId] = 0;
        emit RedemptionLockChanged(account, lotId, fractions, false);
    }

    function pause() external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal override(ERC1155, ERC1155Pausable)
    {
        if (from != address(0) && to != address(0)) {
            for (uint256 i; i < ids.length; ++i) {
                require(balanceOf(from, ids[i]) - redemptionLocked[from][ids[i]] >= values[i], "lot units locked for redemption");
            }
        }
        super._update(from, to, ids, values);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC1155, AccessControl) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
