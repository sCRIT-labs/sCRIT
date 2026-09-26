// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @notice Registers signing keys and their permitted pilot commodities.
/// Key registration does not assert that a custodian is contracted or that assets exist.
contract CustodianRegistry is AccessControl {
    uint8 public constant AU = 0;
    uint8 public constant AG = 1;
    uint8 public constant PT = 2;
    uint8 public constant PD = 3;
    uint8 public constant ND = 4;
    uint8 public constant DY = 5;
    uint8 public constant TB = 6;
    uint8 public constant SC = 7;
    uint8 public constant LI = 8;
    uint8 public constant DIAMOND = 9;
    uint16 private constant ALLOWED_MASK = 0x03ff;

    struct Custodian { uint16 scopeMask; bool active; }
    mapping(address => Custodian) public custodians;

    event CustodianRegistered(address indexed custodian, uint16 scopeMask, bytes32 evidenceHash);
    event CustodianRevoked(address indexed custodian);
    event CustodianKeyRotated(address indexed oldKey, address indexed newKey, uint16 scopeMask);

    constructor(address admin) {
        require(admin != address(0), "zero admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function setCustodian(address signer, uint16 scopeMask, bytes32 evidenceHash)
        external onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(signer != address(0) && scopeMask != 0 && scopeMask & ~ALLOWED_MASK == 0, "invalid scope");
        custodians[signer] = Custodian(scopeMask, true);
        emit CustodianRegistered(signer, scopeMask, evidenceHash);
    }

    function revokeCustodian(address signer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(custodians[signer].active, "not active");
        custodians[signer].active = false;
        emit CustodianRevoked(signer);
    }

    function rotateKey(address oldKey, address newKey) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Custodian memory old = custodians[oldKey];
        require(old.active && newKey != address(0) && !custodians[newKey].active, "invalid rotation");
        custodians[oldKey].active = false;
        custodians[newKey] = Custodian(old.scopeMask, true);
        emit CustodianKeyRotated(oldKey, newKey, old.scopeMask);
    }

    function isAuthorized(address signer, uint8 commodity) external view returns (bool) {
        Custodian memory c = custodians[signer];
        return c.active && commodity < 10 && (c.scopeMask & (uint16(1) << commodity)) != 0;
    }
}
