// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

/// @notice Permissionless CREATE2 relay used to deploy hooks at permission-encoded addresses.
contract ScritCreate2Deployer {
    event Deployed(address indexed deployed, bytes32 indexed salt);

    function deploy(bytes32 salt, bytes calldata initCode) external returns (address deployed) {
        require(initCode.length != 0, "empty init code");
        bytes memory code = initCode;
        assembly ("memory-safe") {
            deployed := create2(0, add(code, 32), mload(code), salt)
        }
        require(deployed != address(0), "create2 failed");
        emit Deployed(deployed, salt);
    }
}
