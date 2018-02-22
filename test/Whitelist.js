// Tests are tested with TestRPC.
// @author Kevin Leyssens - <kevin.leyssens@theledger.be>; Jeroen De Prest - <jeroen.deprest@theledger.be> 
// When testing on own network instead of truffles -> unlock accounts 0,1 and 4

var Whitelist = artifacts.require("Whitelist");

contract('Whitelist', function(accounts) {

    var account_one = accounts[0];
    var account_two = accounts[1];
    var account_empty = accounts[4];

    var whitelistCount_start;

    var meta;

    beforeEach(function(){
        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return meta.participantAmount.call();
        }).then(function(count){
            whitelistCount_start = count.toNumber();
        });
    });
    //TODO check if i need my version of getTier to make sure that address is in the mapping

    // test added succesfull
    it("Should add self succesfull to list", function() {
        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return meta.addSelfAsParticipant();
        }).then(function(){
            return meta.participantAmount.call();
        }).then(function(count){
            assert.equal(count.toNumber(), whitelistCount_start +1, "Should have added 1");
        });
    });        

    it("Should add other succesfull to list", function() {
        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return meta.addParticipant(account_two);
        }).then(function(){
            return meta.participantAmount.call();
        }).then(function(count){
            assert.equal(count.toNumber(), whitelistCount_start +1, "Should have added 1");
        });
    });

    it("Should not add other succesfull to list when not an address", function() {
        var inThen = false;

        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return meta.addParticipant("account_two");
        }).then(function(){
            inThen = true;
            assert.ok(false,"Should have failed");
        }).catch(function(err){
            if(inThen){
                assert.ok(false, "Should have failed");
            } else {
                assert.ok(true, "Failed succesfull");
            }
        });
    });
    
    // test only once added
    it("Should added only once", function() {
        var inThen;
        return Whitelist.deployed().then(function(instance) {
            meta = instance;
        }).then(function(){
            return meta.addParticipant(account_one).then(function(){
                return meta.addParticipant(account_one)
            });
        }).then(function(){
            inThen = true;
            assert.ok(false, "Should have failed with testrpc");
        }).catch(function(){
            if (inThen) {
                assert.ok(false, "should have failed directly");
                return meta.participantAmount.call();
            } else {
                assert.ok(true, "Failed because already in list");
                return meta.participantAmount.call();
            }
        }).then(function(count){
            assert.equal(count.toNumber(), whitelistCount_start, "Should not have added 1");            
        });
    }); 

    // test not added when paused
    it("Should not add when paused", function() {
        var inThen;
        
        return Whitelist.deployed().then(function(instance) {
            meta = instance;
        }).then(function(){
            return meta.pauseWhitelist();
        }).then(function(){
            return meta.addParticipant(account_empty)
        }).then(function(){
            inThen = true;
            assert.ok(false, "Should have failed with testrpc");            
        }).catch(function(err){
            if (inThen) {
                assert.ok(false, "should have failed directly");
                return meta.resumeWhitelist();
            } else {
                assert.ok(true, "Failed because list is paused");
                return meta.resumeWhitelist();
            }
        });
    });

    // // test tier non existing account
    // it("Check tier of non existing account, should be 0", function() {
        
    //     return Whitelist.deployed().then(function(instance) {
    //         meta = instance;
    //         return meta.getTier(account_empty);
    //     }).then(function(tier){
    //         if(tier.toNumber() === 0){
    //             return meta.getTier(account_empty);
    //         } else {
    //             return meta.getTier(accounts[9]);
    //         }
    //     }).then(function(tier){
    //         assert.equal(tier.toNumber(),0, "Should be 0, because not in whitelist")
    //     });
    // });

    // test that owner can stop
    it("Only owner can call stop method", function() {
        var inThen;

        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return meta.stopRegister({from:account_two, gas: 3000000});
        }).then(function(){
            inThen = true;
            assert.ok(false, "Should have failed with testrpc");     
        }).catch(function(){
            if (inThen) {
                assert.ok(false, "should have failed directly");
            } else {
                assert.ok(true, "Failed because only owner can call stop method");
            }
        })
        ;
    });



    // it("Should remove an existing account and update the count. After add this one again", function() {
    //     var whitelistCount_inter;

    //     return Whitelist.deployed().then(function(instance) {
    //         meta = instance;
    //         return meta.getTier(accounts[7]);
    //     }).then(function(tier){
    //         if(tier.toNumber() === 0){
    //             return meta.addParticipant(accounts[7])
    //         } else {
    //             return true;
    //         }
    //     }).then(function(){
    //         return meta.participantAmount.call();
    //     }).then(function(count){
    //         whitelistCount_inter = count.toNumber();
    //         return meta.removeFromList(accounts[7]);
    //     }).then(function(){
    //         return meta.participantAmount.call();
    //     }).then(function(count){
    //         assert.equal(count.toNumber(),whitelistCount_inter - 1, "Should be one less");
    //         return true;
    //     }).then(function(){
    //         return meta.addParticipant(accounts[7])
    //     }).then(function(){
    //         return meta.participantAmount.call();   
    //     }).then(function(count){
    //         assert.equal(count.toNumber(),whitelistCount_inter, "Should be the same as in the beginning");
    //     })
    //     ;
    // });

    // test fallback function
    it("Should register with fallback function and transfer ether back", function() {
        var account_eight_balance;

        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return web3.eth.getBalance(accounts[8]);            
        }).then(function(balance){
            account_eight_balance = balance.toNumber();
        }).then(function(){
            
            //fallback function
            return meta.sendTransaction({from: accounts[8], gas: 3000000, value: 1}); 
            
        })
        .then(function(){
            return meta.participantAmount.call();
        }).then(function(count){
            assert.equal(count.toNumber(),whitelistCount_start+1, "Should have added one to the count");
            return web3.eth.getBalance(accounts[8]);
        }).then(function(balance){
            // need to take in account the gascosts. But won't be over 0.5 ETH
            assert.ok(balance.toNumber() > (account_eight_balance - web3.toWei(0.5, "ether")),"Should have returned the amount");
        });
    });


    it("Should not register when stopped", function() {
        var inThen;

        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return meta.stopRegister();
        }).then(function(){
            return meta.getTier(account_empty);
        }).then(function(tier){
            if(tier.toNumber() === 0){
                return meta.addParticipant(account_empty);
            }
        }).then(function(){
            inThen = true;
            assert.ok(false, "Should have failed with testrpc");    
        }).catch(function(err){
            if (inThen) {
                assert.ok(false, "should have failed directly");
                return meta.participantAmount.call();                
            } else {
                assert.ok(true, "Failed because stop method is invoked");
                return meta.participantAmount.call();
            }
        }).then(function(count){
            assert.equal(count.toNumber(),whitelistCount_start, "Should be the same");
        });
    });

});