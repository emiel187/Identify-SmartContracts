pragma solidity ^0.4.18;


import "./CustomToken.sol";
 

/**
 * @title SimpleToken
 * @dev Very simple ERC20 Token example, where all tokens are pre-assigned to the creator.
 * Note they can later distribute these tokens as they wish using `transfer` and other
 * `StandardToken` functions.
 */
contract Identify is CustomToken {

  string public constant name = "IDENTIFY";
  string public constant symbol = "IDF"; 
  uint8 public constant decimals = 6;

  uint256 public constant INITIAL_SUPPLY = 49253333333 * (10 ** uint256(decimals));

  /**
   * @dev Constructor that gives the vault all of existing tokens.
   * Needs to be discussed where to store all tokens when created.
   */

  function Identify() public {
    totalSupply = INITIAL_SUPPLY;
    balances[this] = INITIAL_SUPPLY;
    Transfer(0x0, this, INITIAL_SUPPLY);
  }

}