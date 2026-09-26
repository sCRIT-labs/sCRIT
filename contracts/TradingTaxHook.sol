// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {BaseHook} from "@uniswap/v4-periphery/src/utils/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

/// @notice Fixed 2.5% output-side project-pool hook; base sCRIT/WETH pool is hookless.
/// @dev For exact-input swaps the fee is taken from output; for exact-output swaps it is
///      charged in input currency. Tax is split 75/25 and credited immediately to treasuries.
contract TradingTaxHook is BaseHook {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    uint256 public constant TAX_BPS = 250;
    uint256 public constant RESERVE_SHARE_BPS = 7_500;
    uint256 private constant BPS = 10_000;

    address public immutable scrit;
    address public immutable weth;
    address public immutable reserveTreasury;
    address public immutable operationsTreasury;

    error InvalidPool();
    error InvalidTreasury();
    error FeeOverflow();

    event TaxCollected(bytes32 indexed poolId, address indexed currency, uint256 totalAmount, uint256 reserveAmount, uint256 operationsAmount);

    constructor(IPoolManager manager, address scritToken, address wrappedNative, address reserve, address operations)
        BaseHook(manager)
    {
        if (scritToken == address(0) || wrappedNative == address(0) || scritToken == wrappedNative) revert InvalidPool();
        if (reserve == address(0) || operations == address(0)) revert InvalidTreasury();
        scrit = scritToken;
        weth = wrappedNative;
        reserveTreasury = reserve;
        operationsTreasury = operations;
    }

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: true,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: false,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: true,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    function _beforeInitialize(address, PoolKey calldata key, uint160) internal view override returns (bytes4) {
        address currency0 = Currency.unwrap(key.currency0);
        address currency1 = Currency.unwrap(key.currency1);
        bool hasScrit = currency0 == scrit || currency1 == scrit;
        address paired = currency0 == scrit ? currency1 : currency0;
        // The base sCRIT/WETH market must remain untaxed and must not use this hook.
        if (!hasScrit || paired == address(0) || paired == weth || address(key.hooks) != address(this)) revert InvalidPool();
        return BaseHook.beforeInitialize.selector;
    }

    function _afterSwap(address, PoolKey calldata key, SwapParams calldata params, BalanceDelta delta, bytes calldata)
        internal override returns (bytes4, int128)
    {
        bool exactInput = params.amountSpecified < 0;
        bool currency0IsFeeCurrency = exactInput ? !params.zeroForOne : params.zeroForOne;
        int128 signedAmount = currency0IsFeeCurrency ? delta.amount0() : delta.amount1();
        if (signedAmount == 0) return (BaseHook.afterSwap.selector, 0);
        uint256 feeBase = uint256(signedAmount > 0 ? int256(signedAmount) : -int256(signedAmount));
        uint256 feeAmount = feeBase * TAX_BPS / BPS;
        if (feeAmount == 0) return (BaseHook.afterSwap.selector, 0);
        if (feeAmount > uint256(uint128(type(int128).max))) revert FeeOverflow();

        Currency feeCurrency = currency0IsFeeCurrency ? key.currency0 : key.currency1;
        _collectTax(key, feeCurrency, feeAmount);
        return (BaseHook.afterSwap.selector, int128(uint128(feeAmount)));
    }

    function _collectTax(PoolKey calldata key, Currency currency, uint256 amount) private {
        uint256 reserveAmount = amount * RESERVE_SHARE_BPS / BPS;
        uint256 operationsAmount = amount - reserveAmount;
        poolManager.take(currency, reserveTreasury, reserveAmount);
        poolManager.take(currency, operationsTreasury, operationsAmount);
        emit TaxCollected(PoolId.unwrap(key.toId()), Currency.unwrap(currency), amount, reserveAmount, operationsAmount);
    }
}
