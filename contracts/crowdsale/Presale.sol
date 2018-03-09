pragma solidity ^0.4.18;

import '../ownership/Ownable.sol';
import '../math/SafeMath.sol';
import '../token/Identify.sol';
import '../token/ERC20.sol';
import '../crowdsale/Whitelist.sol';


/**
 * @title Presale
 * @dev Presale is a base contract for managing a token presale.
 * Presales have a start and end timestamps, where investors can make
 * token purchases and the presale will assign them tokens based
 * on a token per ETH rate. Funds collected are forwarded to a wallet
 * as they arrive. Note that the presale contract
 * must be owner of the token in order to be able to mint it.
 */
contract Presale is Ownable {
  using SafeMath for uint256;

  // token being sold
  Identify public token;
  // address of the token being sold
  address public tokenAddress;

  // start and end timestamps where investments are allowed (both inclusive)
  uint256 public startTime;
  uint256 public endTime;

  // address where funds are forwarded
  address public wallet;

  // whitelist contract
  Whitelist public whitelist;

  // how many token units a buyer gets per ETH
  uint256 public rate = 4200000;

  // amount of raised money in wei
  uint256 public weiRaised;  
  
  // amount of tokens raised
  uint256 public tokenRaised;

  // parameters for the presale:
  // maximum of wei the presale wants to raise
  uint256 public capWEI;
  // maximum of tokens the presale wants to raise
  uint256 public capTokens;
  // bonus investors get in the presale - 25%
  uint256 public bonusPercentage = 125;
  // minimum amount of wei an investor needs to send in order to get tokens
  uint256 public minimumWEI;
  // maximum amount of wei an investor can send in order to get tokens
  uint256 public maximumWEI;
  // a boolean to check if the presale is paused
  bool public paused = false;

  /**
   * event for token purchase logging
   * @param purchaser who paid for the tokens
   * @param beneficiary who got the tokens
   * @param value WEIs paid for purchase
   * @param amount amount of tokens purchased
   */
  event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);
  
  /**
   * event for claimed tokens logging
   * @param owner where tokens are sent to
   * @param claimtoken is the address of the ERC20 compliant token
   * @param amount amount of tokens sent back
   */
  event ClaimedTokens(address indexed owner, address claimtoken, uint amount);
  
  /**
   * event for pause logging
   * @param owner who invoked the pause function
   * @param timestamp when the pause function is invoked
   */
  event Paused(address indexed owner, uint256 timestamp);
  
  /**
   * event for resume logging
   * @param owner who invoked the resume function
   * @param timestamp when the resume function is invoked
   */
  event Resumed(address indexed owner, uint256 timestamp);

  /**
   * modifier to check if a participant is in the whitelist
   */
  modifier isInWhitelist(address beneficiary) {
    // first check if sender is in whitelist
    require(whitelist.isParticipant(beneficiary));
    _;
  }

  /**
   * modifier to check if the presale is not paused
   */
  modifier whenNotPaused() {
    require(!paused);
    _;
  }


  /**
   * constructor for Presale
   * @param _startTime start timestamps where investments are allowed (inclusive)
   * @param _wallet address where funds are forwarded
   * @param _token address of the token being sold
   * @param _whitelist whitelist contract address
   * @param _capETH maximum of ETH the presale wants to raise
   * @param _capTokens maximum amount of tokens the presale wants to raise
   * @param _minimumETH minimum amount of ETH an investor needs to send in order to get tokens
   * @param _maximumETH maximum amount of ETH an investor can send in order to get tokens
   */
  function Presale(uint256 _startTime, address _wallet, address _token, address _whitelist, uint256 _capETH, uint256 _capTokens, uint256 _minimumETH, uint256 _maximumETH) public {
  
    require(_startTime >= now);
    require(_wallet != address(0));
    require(_token != address(0));
    require(_whitelist != address(0));
    require(_capETH > 0);
    require(_capTokens > 0);
    require(_minimumETH > 0);
    require(_maximumETH > 0);

    startTime = _startTime;
    endTime = _startTime.add(10 weeks);
    wallet = _wallet;
    tokenAddress = _token;
    token = Identify(_token);
    whitelist = Whitelist(_whitelist);
    capWEI = _capETH * (10 ** uint256(18));
    capTokens = _capTokens * (10 ** uint256(6));
    minimumWEI = _minimumETH * (10 ** uint256(18));
    maximumWEI = _maximumETH * (10 ** uint256(18));
  }

  /**
   * fallback function can be used to buy tokens
   */
  function () external payable {
    buyTokens(msg.sender);
  }

  // low level token purchase function
  function buyTokens(address beneficiary) isInWhitelist(beneficiary) whenNotPaused public payable returns (bool) {
    require(beneficiary != address(0));
    require(validPurchase());
    require(!hasEnded());
    require(!isContract(msg.sender));

    uint256 weiAmount = msg.value;

    // calculate token amount to be created
    uint256 tokens = getTokenAmount(weiAmount);
    
    // update state
    weiRaised = weiRaised.add(weiAmount);
    tokenRaised = tokenRaised.add(tokens);

    require(token.transferFrom(tokenAddress, beneficiary, tokens));
    
    TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

    forwardFunds();
    return true;
  }

  /**
   * @return true if crowdsale event has ended
   */
  function hasEnded() public view returns (bool) {
    bool capReached = weiRaised >= capWEI;
    bool capTokensReached = tokenRaised >= capTokens;
    bool ended = now > endTime;
    return (capReached || capTokensReached) || ended;
  }



  /**
   * calculate the amount of tokens a participant gets for a specific weiAmount
   * @return the token amount
   */
  function getTokenAmount(uint256 weiAmount) internal view returns(uint256) {
    // wei has 18 decimals, our token has 6 decimals -> so need for convertion
    uint256 bonusIntegrated = weiAmount.div(10000000000000).mul(rate).mul(bonusPercentage).div(100);
    return bonusIntegrated;
  }

  /**
   * send ether to the fund collection wallet
   * @return true if successful
   */
  function forwardFunds() internal returns (bool) {
    wallet.transfer(msg.value);
    return true;
  }


  /**
   * @return true if the transaction can buy tokens
   */
  function validPurchase() internal view returns (bool) {
    bool withinPeriod = now >= startTime && now <= endTime;
    bool nonZeroPurchase = msg.value != 0;
    bool minimumWEIReached = msg.value >= minimumWEI;
    bool underMaximumWEI = msg.value <= maximumWEI;
    bool withinCap = weiRaised.add(msg.value) <= capWEI;
    return (withinPeriod && nonZeroPurchase) && (withinCap && (minimumWEIReached && underMaximumWEI));

  }

  /**
   * @return true if the owner transfered successful
   */
  function transferOwnershipToken(address _newOwner) onlyOwner public returns (bool) {
    require(token.transferOwnership(_newOwner));
    return true;
  }

  ////////////////////////
  /// SAFETY FUNCTIONS ///
  ////////////////////////

  /**
   * @dev Internal function to determine if an address is a contract
   * @param _addr The address being queried
   * @return True if `_addr` is a contract
   */
  function isContract(address _addr) constant internal returns (bool) {
    if (_addr == 0) { 
      return false; 
    }
    uint256 size;
    assembly {
        size := extcodesize(_addr)
     }
    return (size > 0);
  }


  /**
   * @notice This method can be used by the owner to extract mistakenly sent tokens to this contract.
   * @param _claimtoken The address of the token contract that you want to recover
   * set to 0 in case you want to extract ether.
   */
  function claimTokens(address _claimtoken) onlyOwner public returns (bool) {
    if (_claimtoken == 0x0) {
      owner.transfer(this.balance);
      return true;
    }

    ERC20 claimtoken = ERC20(_claimtoken);
    uint balance = claimtoken.balanceOf(this);
    claimtoken.transfer(owner, balance);
    ClaimedTokens(_claimtoken, owner, balance);
    return true;
  }

  /**
   * @notice Pauses the presale if there is an issue
   */
  function pausePresale() onlyOwner public returns (bool) {
    paused = true;
    Paused(owner, now);
    return true;
  }

  /**
   * @notice Resumes the presale
   */  
  function resumePresale() onlyOwner public returns (bool) {
    paused = false;
    Resumed(owner, now);
    return true;
  }


}