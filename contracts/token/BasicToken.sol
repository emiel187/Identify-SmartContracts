pragma solidity ^0.4.18;

import "./ERC20Basic.sol";
import "../math/SafeMath.sol";

/**
 * @title Basic token
 * @dev Basic version of StandardToken, with no allowances.
 */
contract BasicToken is ERC20Basic {
  using SafeMath for uint256;
  
  // mapping of addresses with according balances
  mapping(address => uint256) balances;

  uint256 public totalSupply;

  /**
  * @dev Gets the totalSupply.
  * @return An uint256 representing the total supply of tokens.
  */
  function totalSupply() public view returns (uint256) {
    return totalSupply;
  } 

  /**
  * @dev Gets the balance of the specified address.
  * @param _owner The address to query the the balance of.
  * @return An uint256 representing the amount owned by the passed address.
  */
  function balanceOf(address _owner) public view returns (uint256 balance) {
    return balances[_owner];
  }

}