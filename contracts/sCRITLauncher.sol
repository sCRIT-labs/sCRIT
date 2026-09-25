// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./sCRITToken.sol";

interface IERC20like {
  function transferFrom(address f, address t, uint256 v) external returns (bool);
  function approve(address sp, uint256 v) external returns (bool);
  function balanceOf(address a) external view returns (uint256);
}

interface IV2Router02 {
  function addLiquidity(
    address tokenA,
    address tokenB,
    uint amountADesired,
    uint amountBDesired,
    uint amountAMin,
    uint amountBMin,
    address to,
    uint deadline
  ) external returns (uint amountA, uint amountB, uint liquidity);
}

/// @notice Launcher for tokens paired against sCRIT (ERC20-ERC20).
/// Either everything lands or all reverts (minus gas). No swap tax on-chain in pilot.
contract sCRITLauncher {
  address public immutable scrit;
  address public immutable router;
  address public owner;
  mapping(address => bool) public issuerApproved;

  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
  event IssuerApprovalUpdated(address indexed issuer, bool approved);

  event Launched(
    address indexed token,
    address indexed creator,
    uint pooledTokens,
    uint scritAdded,
    uint liquidity
  );

  constructor(address s, address r) {
    require(s != address(0) && r != address(0), "zero");
    scrit = s;
    router = r;
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
    string memory n,
    string memory s,
    uint supply,
    uint pooled,
    uint scritAmt,
    uint scritMin,
    uint deadline
  ) external returns (address token, uint liquidity) {
    require(issuerApproved[msg.sender], "issuer not approved");
    require(pooled > 0 && pooled <= supply, "pooled");
    require(scritAmt > 0, "scrit");
    require(deadline > block.timestamp, "deadline");
    require(IERC20like(scrit).transferFrom(msg.sender, address(this), scritAmt), "pull");
    sCRITToken t = new sCRITToken(n, s, supply);
    token = address(t);
    require(t.approve(router, pooled), "approveT");
    require(IERC20like(scrit).approve(router, scritAmt), "approveS");
    (,, liquidity) = IV2Router02(router).addLiquidity(
      token, scrit, pooled, scritAmt, pooled, scritMin, msg.sender, deadline
    );
    uint bal = t.balanceOf(address(this));
    if (bal > 0) {
      require(t.transfer(msg.sender, bal), "payout");
    }
    emit Launched(token, msg.sender, pooled, scritAmt, liquidity);
  }
}
