pragma solidity 0.4.18;

import '../ownership/Ownable.sol';
import '../math/SafeMath.sol';
import '../token/ERC20.sol';

/**
 * @title Whitelist
 * @dev This contract is a whitelist for the tokensale
 */

contract Whitelist is Ownable {
    using SafeMath for uint256;

    uint256 public endTimeRegister;
    uint256 public count_whitelist = 0;
    bool public paused;
    bool public finished;


    event NewWhitelister(address indexed newUser);
    event ClaimedTokens(address indexed _claimtoken, address indexed _owner, uint _amount);
    event ContractInitiated(uint256 endDate);

    function () payable public {
        addToWhitelist(msg.sender);
        // give ETH back
        msg.sender.transfer(msg.value);
    }

    function Whitelist(uint256 _endTimeRegister) public {
        //endTime must be in the future
        require(_endTimeRegister > now);
        endTimeRegister = _endTimeRegister;
        paused = false;
        finished = false;
        ContractInitiated(endTimeRegister);
    }

    function addToWhitelist(address _newUser) notPaused notFinished public {

    }

    function addSelfToWhitelist() notPaused notFinished public {
        addToWhitelist(msg.sender);
    }

    function addMultipleToWhitelist(address[] addresses) onlyOwner public {

    }


    function removeFromList(address _address) onlyOwner public {
       
    }

    // @notice Pauses the whitelist if there is any issue
    function pauseWhitelist() onlyOwner public {
        paused = true;
    }

    // @notice Resumes the TokenSale
    function resumeWhitelist() onlyOwner public {
        paused = false;
    }

    function stopRegister() onlyOwner public {
        finished = true;
        endTimeRegister = now;
    }
    

    modifier notPaused() {
        require(!paused);
        _;
    }

    modifier notFinished() {
        require(!finished);
        _;
    }

    //////////
    // Safety Methods
    //////////

    /// @notice This method can be used by the controller to extract mistakenly
    ///  sent tokens to this contract.
    /// @param _claimtoken The address of the token contract that you want to recover
    ///  set to 0 in case you want to extract ether.
    function claimTokens(address _claimtoken) public onlyOwner {
        if (_claimtoken == 0x0) {
            owner.transfer(this.balance);
            return;
        }

        ERC20 claimtoken = ERC20(_claimtoken);
        uint balance = claimtoken.balanceOf(this);
        claimtoken.transfer(owner, balance);
        ClaimedTokens(_claimtoken, owner, balance);
    }


}