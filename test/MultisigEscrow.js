/*
* Most functions are tested in MultisigWallet.js
*/
var sha256 = require('js-sha256');

var MultiSigEscrow = artifacts.require("MultiSigEscrow");
var Platinium = artifacts.require("Platinium");
var Whitelist = artifacts.require("Whitelist");
var Phases = artifacts.require("Phases");
var TokenSale = artifacts.require("TokenSale");

contract('MultiSigEscrow', function(accounts) {
    
    var metaWhitelist;
    var metaPhases;
    var metaEscrow;
    var metaTokenSale;
    var metaPlatinium;

    before(async function(){
        // tokensale is owner of platinium. Let's make accounts[0] the owner for these tests
        await TokenSale.deployed().then(function(instance){
            metaTokenSale = instance;
            return metaTokenSale.transferOwnershipToken(accounts[0]);
        });
        metaWhitelist = await Whitelist.deployed();
        metaPhases = await Phases.deployed();
        metaEscrow = await MultiSigEscrow.deployed();
        metaPlatinium = await Platinium.deployed();

    });
    
    it('Should be able to use the constructor', function(done) {
        MultiSigEscrow.new([
            '0xa0a4a612fba850df41183cd376e20637d357a8bd', // accounts[0]
            '0xff95174a8978f7aff48537f4741135f523079d0b', // accounts[1]
            '0xbb848227f23c08fa38da659d8041112ea5a2b7de' // accounts[2]
          ], 2,
          '0xbb848227f23c08fa38da659d8041112ea5a2b7de' // random platinium address
          , '0xbb848227f23c08fa38da659d8041112ea5a2b7de' // random phases address
        ).then(
            function(multisig) {
                multisig.isOwner('0xa0a4a612fba850df41183cd376e20637d357a8bd').then(
                    function(isowner) {
                        assert.ok(isowner, "Should be an owner");
                        done();
                    }).catch(done);
            }).catch(done);
    });


    it("Should transfer ownership of Whitelist contract through Phases contract from the Escrow contract to account 0 and fill it with 5 people + change owner back to phases", function() {
        var inThen= false;
        // Multisig is owner of Phases and Phases is owner of Whitelist
        return MultiSigEscrow.deployed().then(function(instance) {
            metaEscrow = instance;
            // invoke function transferOwnershipWhitelist -> 9481c83c to account 0
            var to_account = accounts[0].substring(2,(accounts[0].length));
            var function_data = "0x9481c83c";
            var data = function_data + "000000000000000000000000" + to_account;
            return metaEscrow.submitTransaction(metaEscrow.address,0,data, {from: accounts[0], gas: 3000000});
        }).then(function(transid){
            // should fail because we are not the owner of whitelist
            return metaWhitelist.pauseWhitelist();
        }).then(function(){
            inThen = true;
            assert.ok(false,"Should have failed, not owner")            
        }).catch(function(err){
            if (inThen) {
                assert.ok(false, "Should have failed directly");
                return false;
            } else {
                assert.ok(true, "Failed because not owner");
                return true;
            }
        }).then(function(){
            return metaEscrow.transactionCount.call();
        }).then(function(count){
            assert.equal(count.toNumber(),1,"Should be 1 transaction");
        }).then(function(){
            // confirm transaction
            return metaEscrow.confirmTransaction(0, {from: accounts[1], gas: 3000000});                                    
        }).then(function(){
            // account 0 should be owner by now
            return metaWhitelist.pauseWhitelist();
        }).then(function(){
            // Fill 5 users from testrpc
            var allHashes = [];            
            const row = [];
            row.push(accounts[0]);
            row.push(accounts[1]);
            row.push(accounts[2]);
            row.push(accounts[3]);
            row.push(accounts[4]);
            
            allHashes[0] = row;
            return Promise.all(allHashes.map(e=>{
                return metaWhitelist.addMultipleToWhitelist(e, {from: accounts[0], gas: 3000000});
            }));
        }).then(function(){
            // resume whitelist
            return metaWhitelist.resumeWhitelist();
        }).then(function(){
            // set owner of whitelist back to phases
            return metaWhitelist.transferOwnership(metaPhases.address);
        })
        ;
    });


    it("Should initiate phase 1 correctly", function() {
       var inThen= false;        
        
        return MultiSigEscrow.deployed().then(function(instance){
            metaEscrow = instance;
            // initPhaseOne() -> 0x6b154e9a
            return metaEscrow.submitTransaction(metaEscrow.address,0,"0x6b154e9a", {from: accounts[0], gas: 3000000});
        }).then(function(){
            return metaEscrow.transactionCount.call();
        }).then(function(count){
            assert.equal(count.toNumber(),2,"Should be 2 transactions");
        }).then(function(){
            //mint all finalized tokens to multisig = 67200000000000000000000000
            return metaPlatinium.mint(metaEscrow.address, "67200000000000000000000000");
        }).then(function(){
            return metaPlatinium.balanceOf(metaEscrow.address);
        }).then(function(tokens){
            assert.equal(tokens.toNumber(),"67200000000000000000000000", "Should be 67200000000000000000000000");
        }).then(function(){
            return metaEscrow.confirmTransaction(1, {from: accounts[1], gas: 4712388});                                    
        }).then(function(){
            return metaEscrow.phasesInitiated.call();
        }).then(function(phase){
            assert.equal(phase.toNumber(),1,"Should be 1, because phase 1 is intantiated");
        }).then(function(){
            return metaPlatinium.balanceOf(metaPhases.address);
        }).then(function(tokens){
            assert.equal(tokens.toNumber(),0, "Should have no more tokens left.")
        }).then(function(){
            return metaPlatinium.balanceOf(metaWhitelist.address);
        }).then(function(balance){
            // 3% to be 
            assert.equal(balance.toNumber(), "216000000000000000000000", "Should be 216000000000000000000000 to divide")
        })
        ;
    });

    it("Should get bonus from phase 1 correctly", function() {
        return Whitelist.deployed().then(function(instance){
            metaWhitelist = instance;
            return metaWhitelist.getBonusAmount.call();
        }).then(function(bonusamount){
            assert.equal(bonusamount.toNumber(), "108000000000000000000", "Should be 108000000000000000000");
        })
        ;
    });        







});