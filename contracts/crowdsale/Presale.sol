
pragma solidity ^0.4.18;

import '../ownership/Ownable.sol';
import '../math/SafeMath.sol';
import '../token/Identify.sol';


/**
 * @title Crowdsale
 * @dev Crowdsale is a base contract for managing a token crowdsale.
 * Crowdsales have a start and end timestamps, where investors can make
 * token purchases and the crowdsale will assign them tokens based
 * on a token per ETH rate. Funds collected are forwarded to a wallet
 * as they arrive. The contract requires a MintableToken that will be
 * minted as contributions arrive, note that the crowdsale contract
 * must be owner of the token in order to be able to mint it.
 */
contract Presale is Ownable {
  using SafeMath for uint256;

  // The token being sold
  Identify public token;

  // start and end timestamps where investments are allowed (both inclusive)
  uint256 public startTime;
  uint256 public endTime;

  // address where funds are collected
  address public wallet;

  // how many token units a buyer gets per wei
  uint256 public rate = 4200000;

  // amount of raised money in wei
  uint256 public weiRaised;  
  
  // amount of tokens 
  uint256 public tokenRaised;

  // All parameters
  uint256 public capWEI = 8695 * (10 ** uint256(18));
  uint256 public capTokens = 4565000000 * (10 ** uint256(6));
  uint256 public bonusPercentage = 125; // 25% bonus
  uint256 public minimumWEI = 25 * (10 ** uint256(18));

  /**
   * event for token purchase logging
   * @param purchaser who paid for the tokens
   * @param beneficiary who got the tokens
   * @param value weis paid for purchase
   * @param amount amount of tokens purchased
   */
  event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);


  function Presale(uint256 _startTime, uint256 _endTime, address _wallet, Identify _token) public 
  {
    require(_startTime >= now);
    require(_endTime >= _startTime);
    require(_wallet != address(0));
    require(_token != address(0));

    startTime = _startTime;
    endTime = _startTime.add(10 weeks);
    wallet = _wallet;
    token = _token;
  }

  // fallback function can be used to buy tokens
  function () external payable 
  {
    buyTokens(msg.sender);
  }

  // low level token purchase function
  function buyTokens(address beneficiary) public payable returns (bool) {
    require(beneficiary != address(0));
    require(validPurchase());
    require(!hasEnded());

    uint256 weiAmount = msg.value;

    // calculate token amount to be created
    uint256 tokens = getTokenAmount(weiAmount);
    
    // update state
    weiRaised = weiRaised.add(weiAmount);
    tokenRaised = tokenRaised.add(tokens);

    // require(token.transferFrom(token, beneficiary, tokens));
    TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

    forwardFunds();
    return true;
  }

  // @return true if crowdsale event has ended
  function hasEnded() public view returns (bool) {
    bool capReached = weiRaised >= capWEI;
    bool capTokensReached = tokenRaised >= capTokens;
    bool ended = now > endTime;
    // bool combined1 = capReached || ended;
    return (capReached || capTokensReached) || ended;
  }

  // Override this method to have a way to add business logic to your crowdsale when buying
  function getTokenAmount(uint256 weiAmount) internal view returns(uint256) {
    return weiAmount.mul(rate).mul(bonusPercentage).div(100);
  }

  // send ether to the fund collection wallet
  // override to create custom fund forwarding mechanisms
  function forwardFunds() internal returns (bool) {
    wallet.transfer(msg.value);
    return true;
  }

  // @return true if the transaction can buy tokens
  function validPurchase() internal view returns (bool) {
    bool withinPeriod = now >= startTime && now <= endTime;
    bool nonZeroPurchase = msg.value != 0;
    bool minimumReached = msg.value >= minimumWEI;
    bool withinCap = weiRaised.add(msg.value) <= capWEI;
    // bool combined1 = withinPeriod && withinCap;
    // bool combined2 = nonZeroPurchase && minimumReached;
    return (withinPeriod && nonZeroPurchase) && (minimumReached && withinCap);
  }

  function transferOwnershipToken(address _newOwner) onlyOwner public returns (bool) {
    require(token.transferOwnership(_newOwner));
    return true;
  }

}