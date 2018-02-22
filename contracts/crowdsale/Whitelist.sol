pragma solidity ^0.4.18;

import '../ownership/Ownable.sol';
import '../math/SafeMath.sol';


contract Whitelist is Ownable {
    using SafeMath for uint256;

    bool public finalized = false;
    bool public paused = false;

    uint256 public participantAmount;

    mapping (address => bool) private participants;

    event AddParticipant(address _participant);
    event Paused(address _owner, uint256 _time);
    event Resumed(address _owner, uint256 _time);
    event Finalized(address _owner, uint256 _time);

    modifier notFinalized() {
        require(!finalized);
        _;
    }

    modifier notPaused() {
        require(!paused);
        _;
    }

    function () payable public {
        addParticipant(msg.sender);
        // give ETH back
        msg.sender.transfer(msg.value);
    }

    function Whitelist() public {
    }

    function addSelfAsParticipant() public {
        require(addParticipant(msg.sender));
    }

    function addParticipant(address _participant) public notPaused notFinalized returns (bool) {
        require(address(_participant) != 0);
        require(participants[_participant] == false);


        participants[_participant] = true;
        participantAmount++;
        AddParticipant(_participant);
        return true;
    }

    // Needs to be reworked
    // Function used to save gas.
    function addFiveParticipants(address _participantOne, address _participantTwo, address _participantThree, address _participantFour, address _participantFive) public onlyOwner notFinalized returns (bool) {
        
        require(addParticipant(_participantOne));
        require(addParticipant(_participantTwo));
        require(addParticipant(_participantThree));
        require(addParticipant(_participantFour));
        require(addParticipant(_participantFive));
        return true;
    }

    function getTotalParticipants() public view returns (uint256) {
        return participantAmount;
    }

    // @notice Pauses the whitelist if there is any issue
    function pauseWhitelist() public onlyOwner notFinalized returns (bool) {
        paused = true;
        Paused(owner,now);
        return true;
    }

    // @notice Resumes the Whitelist
    function resumeWhitelist() public onlyOwner notFinalized returns (bool) {
        paused = false;
        Resumed(owner,now);
        return true;
    }

    function finzalize() public notFinalized onlyOwner returns (bool) {
        finalized = true;
        Finalized(owner,now);
        return true;
    }

}