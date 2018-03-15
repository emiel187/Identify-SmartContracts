pragma solidity ^0.4.18;

import "./BasicToken.sol";
import "./ERC20.sol";
import "../ownership/Ownable.sol";

/**
 * @title Custom ERC20 token
 *
 * @dev Implementation of the basic standard token.
 * @dev https://github.com/ethereum/EIPs/issues/20
 */
contract CustomToken is ERC20, BasicToken, Ownable {

  mapping (address => mapping (address => uint256)) internal allowed;

  // boolean if transfers can be done
  bool public enableTransfer = true;

  /**
   * @dev Modifier to make a function callable only when the contract is not paused.
   */
  modifier whenTransferEnabled() {
    require(enableTransfer);
    _;
  }

  event Burn(address indexed burner, uint256 value);
  event EnableTransfer(address indexed owner, uint256 timestamp);
  event DisableTransfer(address indexed owner, uint256 timestamp);

  
  /**
  * @dev transfer token for a specified address
  * @param _to The address to transfer to.
  * @param _value The amount to be transferred.
  */
  function transfer(address _to, uint256 _value) whenTransferEnabled public returns (bool) {
    require(_to != address(0));
    require(_value <= balances[msg.sender]);

    // SafeMath.sub will throw if there is not enough balance.
    balances[msg.sender] = balances[msg.sender].sub(_value);
    balances[_to] = balances[_to].add(_value);
    Transfer(msg.sender, _to, _value);
    return true;
  }

  /**
   * @dev Transfer tokens from one address to another
   * @param _from address The address which you want to send tokens from
   * @param _to address The address which you want to transfer to
   * @param _value uint256 the amount of tokens to be transferred
   * The owner can transfer tokens at will. This to implement a reward pool contract in a later phase 
   * that will transfer tokens for rewarding.
   */
  function transferFrom(address _from, address _to, uint256 _value) whenTransferEnabled public returns (bool) {
    require(_to != address(0));
    require(_value <= balances[_from]);


    if (msg.sender!=owner) {
      require(_value <= allowed[_from][msg.sender]);
      allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);
      balances[_from] = balances[_from].sub(_value);
      balances[_to] = balances[_to].add(_value);
    }  else {
      balances[_from] = balances[_from].sub(_value);
      balances[_to] = balances[_to].add(_value);
    }

    Transfer(_from, _to, _value);
    return true;
  }

  /**
   * @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
   *
   * @param _spender The address which will spend the funds.
   * @param _value The amount of tokens to be spent.
   */
  function approve(address _spender, uint256 _value) whenTransferEnabled public returns (bool) {
    // To change the approve amount you first have to reduce the addresses`
    //  allowance to zero by calling `approve(_spender,0)` if it is not
    //  already 0 to mitigate the race condition described here:
    //  https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
    require((_value == 0) || (allowed[msg.sender][_spender] == 0));
    
    allowed[msg.sender][_spender] = _value;
    Approval(msg.sender, _spender, _value);
    return true;
  }

  /* Approves and then calls the receiving contract */
  function approveAndCallAsContract(address _spender, uint256 _value, bytes _extraData) onlyOwner public returns (bool success) {
    // check if the _spender already has some amount approved else use increase approval.
    // maybe not for exchanges
    //require((_value == 0) || (allowed[this][_spender] == 0));

    allowed[this][_spender] = _value;
    Approval(this, _spender, _value);

    //call the receiveApproval function on the contract you want to be notified. This crafts the function signature manually so one doesn't have to include a contract in here just for this.
    //receiveApproval(address _from, uint256 _value, address _tokenContract, bytes _extraData)
    //it is assumed when one does this that the call *should* succeed, otherwise one would use vanilla approve instead.
    require(_spender.call(bytes4(bytes32(keccak256("receiveApproval(address,uint256,address,bytes)"))), this, _value, this, _extraData));
    return true;
  }

  /* 
   * Approves and then calls the receiving contract 
   */
  function approveAndCall(address _spender, uint256 _value, bytes _extraData) whenTransferEnabled public returns (bool success) {
    // check if the _spender already has some amount approved else use increase approval.
    // maybe not for exchanges
    require((_value == 0) || (allowed[msg.sender][_spender] == 0));

    allowed[msg.sender][_spender] = _value;
    Approval(msg.sender, _spender, _value);

    //call the receiveApproval function on the contract you want to be notified. This crafts the function signature manually so one doesn't have to include a contract in here just for this.
    //receiveApproval(address _from, uint256 _value, address _tokenContract, bytes _extraData)
    //it is assumed when one does this that the call *should* succeed, otherwise one would use vanilla approve instead.
    require(_spender.call(bytes4(bytes32(keccak256("receiveApproval(address,uint256,address,bytes)"))), msg.sender, _value, this, _extraData));
    return true;
  }

  /**
   * @dev Function to check the amount of tokens that an owner allowed to a spender.
   * @param _owner address The address which owns the funds.
   * @param _spender address The address which will spend the funds.
   * @return A uint256 specifying the amount of tokens still available for the spender.
   */
  function allowance(address _owner, address _spender) public view returns (uint256) {
    return allowed[_owner][_spender];
  }

  /**
   * @dev Increase the amount of tokens that an owner allowed to a spender.
   *
   * approve should be called when allowed[_spender] == 0. To increment
   * allowed value is better to use this function to avoid 2 calls (and wait until
   * the first transaction is mined)
   * @param _spender The address which will spend the funds.
   * @param _addedValue The amount of tokens to increase the allowance by.
   */
  function increaseApproval(address _spender, uint _addedValue) whenTransferEnabled public returns (bool) {
    allowed[msg.sender][_spender] = allowed[msg.sender][_spender].add(_addedValue);
    Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
    return true;
  }

  /**
   * @dev Decrease the amount of tokens that an owner allowed to a spender.
   *
   * approve should be called when allowed[_spender] == 0. To decrement
   * allowed value is better to use this function to avoid 2 calls (and wait until
   * the first transaction is mined)
   * @param _spender The address which will spend the funds.
   * @param _subtractedValue The amount of tokens to decrease the allowance by.
   */
  function decreaseApproval(address _spender, uint _subtractedValue) whenTransferEnabled public returns (bool) {
    uint oldValue = allowed[msg.sender][_spender];
    if (_subtractedValue > oldValue) {
      allowed[msg.sender][_spender] = 0;
    } else {
      allowed[msg.sender][_spender] = oldValue.sub(_subtractedValue);
    }
    Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
    return true;
  }


  /**
   * @dev Burns a specific amount of tokens.
   * @param _value The amount of token to be burned.
   */
  function burn(address _burner, uint256 _value) onlyOwner public returns (bool) {
    require(_value <= balances[_burner]);
    // no need to require value <= totalSupply, since that would imply the
    // sender's balance is greater than the totalSupply, which *should* be an assertion failure

    balances[_burner] = balances[_burner].sub(_value);
    totalSupply = totalSupply.sub(_value);
    Burn(_burner, _value);
    return true;
  }
   /**
   * @dev called by the owner to enable transfers
   */
  function enableTransfer() onlyOwner public returns (bool) {
    enableTransfer = true;
    EnableTransfer(owner, now);
    return true;
  }

  /**
   * @dev called by the owner to disable tranfers
   */
  function disableTransfer() onlyOwner whenTransferEnabled public returns (bool) {
    enableTransfer = false;
    DisableTransfer(owner, now);
    return true;
  }
}