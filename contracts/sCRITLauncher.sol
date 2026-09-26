// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import "./sCRITToken.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

interface IERC20Launch {
  function transferFrom(address from, address to, uint256 amount) external returns (bool);
  function transfer(address to, uint256 amount) external returns (bool);
  function approve(address spender, uint256 amount) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
}

interface IUniswapV3FactoryLaunch {
  function feeAmountTickSpacing(uint24 fee) external view returns (int24);
}

interface INonfungiblePositionManagerLaunch {
  struct MintParams {
    address token0;
    address token1;
    uint24 fee;
    int24 tickLower;
    int24 tickUpper;
    uint256 amount0Desired;
    uint256 amount1Desired;
    uint256 amount0Min;
    uint256 amount1Min;
    address recipient;
    uint256 deadline;
  }

  function factory() external view returns (address);
  function WETH9() external view returns (address);
  function createAndInitializePoolIfNecessary(
    address token0,
    address token1,
    uint24 fee,
    uint160 sqrtPriceX96
  ) external payable returns (address pool);
  function mint(MintParams calldata params)
    external
    payable
    returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);
}

interface IUniswapV3PoolLaunch {
  function fee() external view returns (uint24);
  function tickSpacing() external view returns (int24);
}

/// @notice Creates a fixed-supply token and a full-range TOKEN/sCRIT V3 position.
/// The creator receives the standard Uniswap V3 position NFT directly.
contract sCRITLauncher {
  uint256 private constant BPS = 10_000;
  uint256 private constant Q128 = 1 << 128;
  int24 private constant MIN_TICK = -887272;
  int24 private constant MAX_TICK = 887272;
  uint160 private constant MIN_SQRT_RATIO = 4295128739;
  uint160 private constant MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342;

  struct LaunchConfig {
    address token;
    address creator;
    uint256 pooled;
    uint256 scritAmount;
    uint16 minimumBps;
    uint256 deadline;
  }

  struct PositionResult {
    address pool;
    uint256 positionId;
    uint128 liquidity;
    uint256 tokenAmount;
    uint256 scritAmount;
  }

  address public immutable scrit;
  INonfungiblePositionManagerLaunch public immutable positionManager;
  address public immutable factory;
  uint24 public immutable fee;
  int24 public immutable tickSpacing;
  address public owner;
  mapping(address => bool) public issuerApproved;

  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
  event IssuerApprovalUpdated(address indexed issuer, bool approved);
  event Launched(
    address indexed token,
    address indexed creator,
    address indexed pool,
    uint256 positionId,
    uint128 liquidity,
    uint256 tokenAmount,
    uint256 scritAmount
  );

  constructor(address scritToken, address manager, uint24 feeTier) {
    require(scritToken != address(0) && manager != address(0), "zero address");
    address v3Factory = INonfungiblePositionManagerLaunch(manager).factory();
    require(v3Factory != address(0), "invalid factory");
    require(INonfungiblePositionManagerLaunch(manager).WETH9() != address(0), "invalid weth");
    int24 spacing = IUniswapV3FactoryLaunch(v3Factory).feeAmountTickSpacing(feeTier);
    require(spacing > 0, "unsupported fee");

    scrit = scritToken;
    positionManager = INonfungiblePositionManagerLaunch(manager);
    factory = v3Factory;
    fee = feeTier;
    tickSpacing = spacing;
    owner = msg.sender;
    emit OwnershipTransferred(address(0), msg.sender);
  }

  modifier onlyOwner() {
    require(msg.sender == owner, "owner");
    _;
  }

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

  function launch(
    string memory name,
    string memory symbol,
    uint256 supply,
    uint256 pooled,
    uint256 scritAmount,
    uint16 minimumBps,
    uint256 deadline
  ) external returns (address token, uint256 positionId) {
    require(issuerApproved[msg.sender], "issuer not approved");
    require(supply > 0 && pooled > 0 && pooled <= supply, "invalid supply");
    require(scritAmount > 0, "zero scrit");
    require(minimumBps >= 5_000 && minimumBps <= BPS, "invalid minimum");
    require(deadline > block.timestamp, "expired");
    require(IERC20Launch(scrit).transferFrom(msg.sender, address(this), scritAmount), "scrit pull failed");

    sCRITToken created = new sCRITToken(name, symbol, supply);
    token = address(created);
    PositionResult memory position = _createPosition(
      LaunchConfig({
        token: token,
        creator: msg.sender,
        pooled: pooled,
        scritAmount: scritAmount,
        minimumBps: minimumBps,
        deadline: deadline
      })
    );
    positionId = position.positionId;
    _refund(token, msg.sender);
    _refund(scrit, msg.sender);
    emit Launched(
      token,
      msg.sender,
      position.pool,
      positionId,
      position.liquidity,
      position.tokenAmount,
      position.scritAmount
    );
  }

  function _createPosition(LaunchConfig memory config) private returns (PositionResult memory position) {
    address token0;
    address token1;
    uint256 amount0Desired;
    uint256 amount1Desired;
    if (uint160(config.token) < uint160(scrit)) {
      (token0, token1, amount0Desired, amount1Desired) =
        (config.token, scrit, config.pooled, config.scritAmount);
    } else {
      (token0, token1, amount0Desired, amount1Desired) =
        (scrit, config.token, config.scritAmount, config.pooled);
    }

    uint160 sqrtPriceX96 = _initialSqrtPriceX96(amount0Desired, amount1Desired);
    position.pool = positionManager.createAndInitializePoolIfNecessary(token0, token1, fee, sqrtPriceX96);
    require(position.pool != address(0), "pool creation failed");
    require(IUniswapV3PoolLaunch(position.pool).fee() == fee, "pool fee mismatch");
    require(IUniswapV3PoolLaunch(position.pool).tickSpacing() == tickSpacing, "pool spacing mismatch");
    require(IERC20Launch(config.token).approve(address(positionManager), config.pooled), "token approval failed");
    require(IERC20Launch(scrit).approve(address(positionManager), config.scritAmount), "scrit approval failed");

    int24 lower = (MIN_TICK / tickSpacing) * tickSpacing;
    int24 upper = (MAX_TICK / tickSpacing) * tickSpacing;
    INonfungiblePositionManagerLaunch.MintParams memory params;
    params.token0 = token0;
    params.token1 = token1;
    params.fee = fee;
    params.tickLower = lower;
    params.tickUpper = upper;
    params.amount0Desired = amount0Desired;
    params.amount1Desired = amount1Desired;
    params.amount0Min = Math.mulDiv(amount0Desired, config.minimumBps, BPS);
    params.amount1Min = Math.mulDiv(amount1Desired, config.minimumBps, BPS);
    params.recipient = config.creator;
    params.deadline = config.deadline;
    uint128 liquidity;
    uint256 amount0;
    uint256 amount1;
    (position.positionId, liquidity, amount0, amount1) = positionManager.mint(params);
    require(liquidity > 0, "empty position");
    position.liquidity = liquidity;
    position.tokenAmount = token0 == config.token ? amount0 : amount1;
    position.scritAmount = token0 == scrit ? amount0 : amount1;
  }

  function _initialSqrtPriceX96(uint256 amount0, uint256 amount1) private pure returns (uint160) {
    require(amount0 > 0 && amount1 > 0, "zero pool amount");
    uint256 ratioX128 = Math.mulDiv(amount1, Q128, amount0);
    uint256 sqrtPrice = Math.sqrt(ratioX128) << 32;
    require(sqrtPrice >= MIN_SQRT_RATIO && sqrtPrice < MAX_SQRT_RATIO, "price out of range");
    return uint160(sqrtPrice);
  }

  function _refund(address asset, address recipient) private {
    uint256 balance = IERC20Launch(asset).balanceOf(address(this));
    if (balance > 0) require(IERC20Launch(asset).transfer(recipient, balance), "refund failed");
  }
}
