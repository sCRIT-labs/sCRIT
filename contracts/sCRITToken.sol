// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

contract sCRITToken {
  string public name;
  string public symbol;
  uint8 public decimals = 18;
  uint256 public totalSupply;
  mapping(address => uint256) public balanceOf;
  mapping(address => mapping(address => uint256)) public allowance;
  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);

  constructor(string memory n, string memory s, uint256 supply) {
    name = n;
    symbol = s;
    totalSupply = supply;
    balanceOf[msg.sender] = supply;
    emit Transfer(address(0), msg.sender, supply);
  }

  function transfer(address to, uint256 v) external returns (bool) {
    _move(msg.sender, to, v);
    return true;
  }

  function approve(address sp, uint256 v) external returns (bool) {
    allowance[msg.sender][sp] = v;
    emit Approval(msg.sender, sp, v);
    return true;
  }

  function transferFrom(address f, address t, uint256 v) external returns (bool) {
    uint256 a = allowance[f][msg.sender];
    require(a >= v, "allowance");
    unchecked {
      allowance[f][msg.sender] = a - v;
    }
    _move(f, t, v);
    return true;
  }

  function _move(address f, address t, uint256 v) internal {
    require(balanceOf[f] >= v, "balance");
    unchecked {
      balanceOf[f] -= v;
      balanceOf[t] += v;
    }
    emit Transfer(f, t, v);
  }
}
