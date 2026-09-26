// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {sCRITToken} from "./sCRITToken.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {LiquidityAmounts} from "@uniswap/v4-periphery/src/libraries/LiquidityAmounts.sol";
import {Actions} from "@uniswap/v4-periphery/src/libraries/Actions.sol";

interface IScritPositionManagerV4 {
    function nextTokenId() external view returns (uint256);
    function initializePool(PoolKey calldata key, uint160 sqrtPriceX96) external payable returns (int24);
    function modifyLiquidities(bytes calldata unlockData, uint256 deadline) external payable;
}

interface IAllowanceTransfer {
    function approve(address token, address spender, uint160 amount, uint48 expiration) external;
}

/// @notice Issuer-approved sCRIT pair launcher using the fixed-fee Uniswap v4 project hook.
contract sCRITV4Launcher {
    using SafeERC20 for IERC20;
    using PoolIdLibrary for PoolKey;

    uint256 private constant BPS = 10_000;
    uint256 private constant Q128 = 1 << 128;
    int24 private constant TICK_SPACING = 60;
    uint24 private constant LP_FEE = 3_000;
    uint160 private constant MIN_SQRT_RATIO = 4_295_128_739;
    uint160 private constant MAX_SQRT_RATIO = 1_461_446_703_485_210_103_287_273_052_203_988_822_378_723_970_342;

    address public immutable scrit;
    address public immutable hook;
    address public immutable permit2;
    IScritPositionManagerV4 public immutable positionManager;
    address public owner;
    mapping(address => bool) public issuerApproved;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event IssuerApprovalUpdated(address indexed issuer, bool approved);
    event LaunchedV4(address indexed token, address indexed creator, bytes32 indexed poolId, uint256 positionId, uint128 liquidity, uint256 tokenAmount, uint256 scritAmount);

    constructor(address scritToken, address manager, address taxHook, address permit2Address) {
        require(scritToken != address(0) && manager != address(0) && taxHook != address(0) && permit2Address != address(0), "zero address");
        scrit = scritToken;
        positionManager = IScritPositionManagerV4(manager);
        hook = taxHook;
        permit2 = permit2Address;
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    modifier onlyOwner() { require(msg.sender == owner, "owner"); _; }

    function setIssuerApproved(address issuer, bool approved) external onlyOwner {
        require(issuer != address(0), "zero issuer");
        issuerApproved[issuer] = approved;
        emit IssuerApprovalUpdated(issuer, approved);
    }

    function transferOwnership(address nextOwner) external onlyOwner {
        require(nextOwner != address(0), "zero owner");
        emit OwnershipTransferred(owner, nextOwner);
        owner = nextOwner;
    }

    function launch(string calldata name, string calldata symbol, uint256 supply, uint256 pooled, uint256 scritAmount, uint16 minimumBps, uint256 deadline)
        external returns (address token, uint256 positionId)
    {
        require(issuerApproved[msg.sender], "issuer not approved");
        require(supply > 0 && pooled > 0 && pooled <= supply && scritAmount > 0, "invalid amounts");
        require(minimumBps >= 5_000 && minimumBps <= BPS && deadline > block.timestamp, "invalid launch config");

        IERC20(scrit).safeTransferFrom(msg.sender, address(this), scritAmount);
        sCRITToken created = new sCRITToken(name, symbol, supply);
        token = address(created);

        (PoolKey memory key, uint160 sqrtPriceX96) = _poolKeyAndPrice(token, pooled, scritAmount);
        positionManager.initializePool(key, sqrtPriceX96);

        IERC20(token).forceApprove(permit2, pooled);
        IERC20(scrit).forceApprove(permit2, scritAmount);
        IAllowanceTransfer(permit2).approve(token, address(positionManager), uint160(pooled), uint48(deadline));
        IAllowanceTransfer(permit2).approve(scrit, address(positionManager), uint160(scritAmount), uint48(deadline));

        int24 tickLower = (TickMath.MIN_TICK / TICK_SPACING) * TICK_SPACING;
        int24 tickUpper = (TickMath.MAX_TICK / TICK_SPACING) * TICK_SPACING;
        uint128 amount0Desired = uint128(key.currency0 == Currency.wrap(token) ? pooled : scritAmount);
        uint128 amount1Desired = uint128(key.currency1 == Currency.wrap(token) ? pooled : scritAmount);
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            TickMath.getSqrtPriceAtTick(tickLower),
            TickMath.getSqrtPriceAtTick(tickUpper),
            amount0Desired,
            amount1Desired
        );
        require(liquidity > 0, "empty liquidity");
        positionId = positionManager.nextTokenId();
        bytes memory actions = abi.encodePacked(uint8(Actions.MINT_POSITION), uint8(Actions.SETTLE_PAIR));
        bytes[] memory params = new bytes[](2);
        params[0] = abi.encode(key, tickLower, tickUpper, uint256(liquidity), amount0Desired, amount1Desired, msg.sender, bytes(""));
        params[1] = abi.encode(key.currency0, key.currency1);
        positionManager.modifyLiquidities(abi.encode(actions, params), deadline);

        uint256 tokenUsed = supply - IERC20(token).balanceOf(address(this));
        uint256 scritUsed = scritAmount - IERC20(scrit).balanceOf(address(this));
        require(scritUsed >= Math.mulDiv(scritAmount, minimumBps, BPS), "scrit slippage");
        require(tokenUsed >= Math.mulDiv(pooled, minimumBps, BPS), "token slippage");
        IERC20(token).safeTransfer(msg.sender, IERC20(token).balanceOf(address(this)));
        IERC20(scrit).safeTransfer(msg.sender, IERC20(scrit).balanceOf(address(this)));
        emit LaunchedV4(token, msg.sender, PoolId.unwrap(key.toId()), positionId, liquidity, tokenUsed, scritUsed);
    }

    function _poolKeyAndPrice(address token, uint256 pooled, uint256 scritAmount) private view returns (PoolKey memory key, uint160 sqrtPriceX96) {
        Currency tokenCurrency = Currency.wrap(token);
        Currency scritCurrency = Currency.wrap(scrit);
        bool tokenFirst = uint160(token) < uint160(scrit);
        key = PoolKey({
            currency0: tokenFirst ? tokenCurrency : scritCurrency,
            currency1: tokenFirst ? scritCurrency : tokenCurrency,
            fee: LP_FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(hook)
        });
        uint256 amount0 = tokenFirst ? pooled : scritAmount;
        uint256 amount1 = tokenFirst ? scritAmount : pooled;
        require(amount0 <= type(uint128).max && amount1 <= type(uint128).max, "amount overflow");
        uint256 ratioX128 = Math.mulDiv(amount1, Q128, amount0);
        uint256 sqrtPrice = Math.sqrt(ratioX128) << 32;
        require(sqrtPrice >= MIN_SQRT_RATIO && sqrtPrice < MAX_SQRT_RATIO, "price out of range");
        sqrtPriceX96 = uint160(sqrtPrice);
    }
}
