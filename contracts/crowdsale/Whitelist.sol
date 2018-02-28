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
    event Finalized(address _owner, uint256 _time);

    // modifier notFinalized() {
    //     require(!finalized);
    //     _;
    // }

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

    function addSelfAsParticipant() onlyAdmin public returns (bool) {
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

    function removeParticipant(address _participant) public onlyAdmin  returns (bool) {
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

    // // Needs to be reworked
    // // Function used to save gas.
    // function addFiveParticipants(address _participantOne, address _participantTwo, address _participantThree, address _participantFour, address _participantFive) public onlyOwner notFinalized returns (bool) {
        
    //     require(addParticipant(_participantOne));
    //     require(addParticipant(_participantTwo));
    //     require(addParticipant(_participantThree));
    //     require(addParticipant(_participantFour));
    //     require(addParticipant(_participantFive));
    //     return true;
    // }

    function getTotalParticipants() public view returns (uint256) {
        return participantAmount;
    }

    function getTotalAdmins() public view onlyAdmin returns (uint256) {
        return adminAmount;
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

    function finzalize() public onlyOwner returns (bool) {
        finalized = true;
        Finalized(owner,now);
        return true;
    }

}