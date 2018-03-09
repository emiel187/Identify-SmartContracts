pragma solidity ^0.4.18;

import '../ownership/Ownable.sol';
import '../math/SafeMath.sol';
import '../token/ERC20.sol';


contract Whitelist is Ownable {
    using SafeMath for uint256;

    // a boolean to check if the presale is paused
    bool public paused = false;

    // the amount of participants in the whitelist
    uint256 public participantAmount;

    mapping (address => bool) public isParticipant;
    mapping (address => bool) public isAdmin;

    event AddParticipant(address _participant);
    event AddAdmin(address _admin, uint256 _timestamp);
    event RemoveParticipant(address _participant);
    event Paused(address _owner, uint256 _timestamp);
    event Resumed(address _owner, uint256 _timestamp);
  
    /**
    * event for claimed tokens logging
    * @param owner where tokens are sent to
    * @param claimtoken is the address of the ERC20 compliant token
    * @param amount amount of tokens sent back
    */
    event ClaimedTokens(address indexed owner, address claimtoken, uint amount);
  
    /**
     * modifier to check if the whitelist is not paused
     */
    modifier notPaused() {
        require(!paused);
        _;
    }

    /**
     * modifier to check the admin runs this function
     */
    modifier onlyAdmin() {
        require(isAdmin[msg.sender]);
        _;
    }

    /**
     * fallback function to send the eth back to the sender
     */
    function () payable public {
        // give ETH back
        msg.sender.transfer(msg.value);
    }

    /**
     * constructor which adds the owner in the admin list
     */
    function Whitelist() public {
        require(addAdmin(msg.sender));
    }

    /**
     * @param _participant address of participant
     * @return true if the _participant is in the list
     */
    function isParticipant(address _participant) public view returns (bool) {
        require(address(_participant) != 0);
        return isParticipant[_participant];
    }

    /**
     * @param _participant address of participant
     * @return true if _participant is added successful
     */
    function addParticipant(address _participant) public notPaused onlyAdmin returns (bool) {
        require(address(_participant) != 0);
        require(isParticipant[_participant] == false);

        isParticipant[_participant] = true;
        participantAmount++;
        AddParticipant(_participant);
        return true;
    }

    /**
     * @param _participant address of participant
     * @return true if _participant is removed successful
     */
    function removeParticipant(address _participant) public onlyAdmin returns (bool) {
        require(address(_participant) != 0);
        require(!isParticipant[_participant]);
        require(msg.sender != _participant);

        delete isParticipant[_participant];
        participantAmount--;
        RemoveParticipant(_participant);
        return true;
    }

    /**
     * @param _admin address of admin
     * @return true if _admin is added successful
     */
    function addAdmin(address _admin) public onlyOwner returns (bool) {
        require(address(_admin) != 0);
        require(!isAdmin[_admin]);

        isAdmin[_admin] = true;
        AddAdmin(_admin, now);
        return true;
    }

    /**
     * @param _admin address of admin
     * @return true if _admin is removed successful
     */
    function removeAdmin(address _admin) public onlyOwner returns (bool) {
        require(address(_admin) != 0);
        require(isAdmin[_admin]);
        require(msg.sender != _admin);

        delete isAdmin[_admin];
        return true;
    }

    /**
     * @notice Pauses the whitelist if there is any issue
     */
    function pauseWhitelist() public onlyOwner returns (bool) {
        paused = true;
        Paused(owner,now);
        return true;
    }

    /**
     * @notice resumes the whitelist if there is any issue
     */    
    function resumeWhitelist() public onlyOwner returns (bool) {
        paused = false;
        Resumed(owner,now);
        return true;
    }


    /**
     * @notice rused to save gas
     */ 
    function addMultipleParticipants(address[] _participants ) public onlyOwner returns (bool) {
        
        for ( uint i = 0; i < _participants.length; i++ ) {
            require(addParticipant(_participants[i]));
        }

        return true;
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

}