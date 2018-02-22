pragma solidity ^0.4.18;

import '../ownership/Ownable.sol';
import '../math/SafeMath.sol';
import '../token/Identify.sol';


contract Vault is Ownable {
    using SafeMath for uint256;

    // The token being sold
    Identify public token;



    function Vault() public {

    }

    function getIdentifyAmount() public view returns (uint256 balance) {
        return token.balanceOf(this);
    }

    function transferIdentify(address _to, uint256 _value) onlyOwner public returns (bool) {
        require(_to != address(0));
        require(_value > 0);
        require(token.transfer(_to,_value));
        return true;
    }

    function setIdentify (address _token) onlyOwner public returns (bool) {
        token = Identify(_token);
        return true;
    }


}