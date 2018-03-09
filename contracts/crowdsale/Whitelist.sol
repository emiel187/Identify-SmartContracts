pragma solidity ^0.4.18;

import '../ownership/Ownable.sol';
import '../math/SafeMath.sol';


contract Whitelist is Ownable {
    using SafeMath for uint256;

    bool public finalized = false;
    bool public paused = false;

    uint256 public participantAmount;
    uint256 private adminAmount;

    mapping (address => bool) public isParticipant;
    mapping (address => bool) public isAdmin;

    event AddParticipant(address _participant);
    event RemoveParticipant(address _participant);
    event Paused(address _owner, uint256 _time);
    event Resumed(address _owner, uint256 _time);

    modifier notPaused() {
        require(!paused);
        _;
    }

    modifier onlyAdmin() {
        require(isAdmin[msg.sender]);
        _;
    }

    function () payable public {
        // give ETH back
        msg.sender.transfer(msg.value);
    }

    function Whitelist() public {
        addAdmin(msg.sender);
    }

    function addSelfAsParticipant() notPaused onlyAdmin public returns (bool) {
        require(addParticipant(msg.sender));
        return true;
    }

    function isParticipant(address _participant) public view returns (bool) {
        require(address(_participant) != 0);
        return isParticipant[_participant];
    }

    function addParticipant(address _participant) public notPaused onlyAdmin returns (bool) {
        require(address(_participant) != 0);
        require(isParticipant[_participant] == false);


        isParticipant[_participant] = true;
        participantAmount++;
        AddParticipant(_participant);
        return true;
    }

    function removeParticipant(address _participant) public  onlyAdmin  returns (bool) {
        require(address(_participant) != 0);
        require(isParticipant[_participant] == true);
        require(msg.sender != _participant);


        delete isParticipant[_participant];
        participantAmount--;
        RemoveParticipant(_participant);
        return true;
    }

    function addAdmin(address _admin) public notPaused onlyOwner returns (bool) {
        require(address(_admin) != 0);
        require(!isAdmin[_admin]);


        isAdmin[_admin] = true;
        //participantAmount++;
        // AddAdmin(_admin);
        return true;
    }

    function removeAdmin(address _admin) public onlyOwner returns (bool) {
        require(address(_admin) != 0);
        require(isAdmin[_admin] == true);
        require(msg.sender != _admin);

        delete isAdmin[_admin];
        return true;
    }

    // @notice Pauses the whitelist if there is any issue
    function pauseWhitelist() public onlyOwner returns (bool) {
        paused = true;
        Paused(owner,now);
        return true;
    }

    // @notice Resumes the Whitelist
    function resumeWhitelist() public onlyOwner returns (bool) {
        paused = false;
        Resumed(owner,now);
        return true;
    }

    // Function used to save gas.
    function addMultipleParticipants(address[] _participants ) public onlyOwner returns (bool) {
        
        for ( uint i = 0; i < _participants.length; i++ ) {
            require(addParticipant(_participants[i]));
        }

        return true;
    }

}