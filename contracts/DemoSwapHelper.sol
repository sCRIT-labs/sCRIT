// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice DEMO ONLY pilot helper: executes one exact-input single swap through
/// the V4 PoolManager and delivers output to the caller. Deployed for the
/// sCRIT mainnet pilot rehearsal to exercise the taxed project pool; it is not
/// audited, not part of the protocol, and must not hold funds.
contract DemoSwapHelper {
    using SafeERC20 for IERC20;
    using PoolIdLibrary for PoolKey;

    IPoolManager public immutable manager;

    event DemoSwap(address indexed caller, bytes32 indexed poolId, uint256 amountIn, uint256 amountOut);

    constructor(IPoolManager poolManager) {
        require(address(poolManager) != address(0), "zero manager");
        manager = poolManager;
    }

    /// @dev Caller must approve this helper for amountIn of the input token first.
    function swapExactInputSingle(
        PoolKey calldata key,
        bool zeroForOne,
        uint128 amountIn,
        uint128 minOut,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut) {
        Currency input = zeroForOne ? key.currency0 : key.currency1;
        IERC20(Currency.unwrap(input)).safeTransferFrom(msg.sender, address(this), amountIn);
        bytes memory ret = manager.unlock(
            abi.encode(key, zeroForOne, amountIn, minOut, sqrtPriceLimitX96, msg.sender)
        );
        amountOut = abi.decode(ret, (uint256));
        emit DemoSwap(msg.sender, PoolId.unwrap(key.toId()), amountIn, amountOut);
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(manager), "only manager");
        (
            PoolKey memory key,
            bool zeroForOne,
            uint128 amountIn,
            uint128 minOut,
            uint160 sqrtPriceLimitX96,
            address recipient
        ) = abi.decode(data, (PoolKey, bool, uint128, uint128, uint160, address));
        Currency input = zeroForOne ? key.currency0 : key.currency1;
        Currency output = zeroForOne ? key.currency1 : key.currency0;
        BalanceDelta delta = manager.swap(
            key,
            SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: -int256(uint256(amountIn)),
                sqrtPriceLimitX96: sqrtPriceLimitX96
            }),
            ""
        );
        int128 outDelta = zeroForOne ? delta.amount1() : delta.amount0();
        require(outDelta > 0, "no output");
        uint256 amountOut = uint256(uint128(outDelta));
        require(amountOut >= minOut, "slippage");
        manager.sync(input);
        IERC20(Currency.unwrap(input)).safeTransfer(address(manager), amountIn);
        manager.settle();
        manager.take(output, recipient, amountOut);
        return abi.encode(amountOut);
    }
}
