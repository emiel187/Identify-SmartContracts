// Tests are tested with TestRPC.
// @author Kevin Leyssens - <kevin.leyssens@theledger.be>; Jeroen De Prest - <jeroen.deprest@theledger.be> 
// When testing on own network instead of truffles -> unlock accounts 0, 1, 4, 6, 7 and 8

var Whitelist = artifacts.require("Whitelist");

contract('Whitelist', function(accounts) {

    var account_one = accounts[0];
    var account_two = accounts[1];
    var account_four = accounts[4];

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

    it('Should be able to use the constructor', function(done) {
        Whitelist.new().then(
                 function(whitelist) {
                    whitelist.isAdmin(account_one).then(
                       function(isAdmin) {
                          assert.equal(isAdmin, true, "Owner should be admin");
                          done();
                       }).catch(done);
                 }).catch(done);
        });


    // test added successfully
    it("Should add self successfully to list", function() {
        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return meta.addSelfAsParticipant();
        }).then(function(){
            return meta.participantAmount.call();
        }).then(function(count){
            assert.equal(count.toNumber(), whitelistCount_start +1, "Should have added 1");
        });
    });        

    it("Should add other successfully to list", function() {
        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return meta.addParticipant(account_two);
        }).then(function(){
            return meta.participantAmount.call();
        }).then(function(count){
            assert.equal(count.toNumber(), whitelistCount_start +1, "Should have added 1");
        });
    });

    it("Should not add other successfully to list when not an address", function() {
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
                assert.ok(true, "Failed successfully");
            }
        });
    });

    it("Should not add other successfully to list when not an admin", function() {
        var inThen = false;

        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return meta.addParticipant(accounts[6],{from:account_two, gas: 3000000});
        }).then(function(){
            inThen = true;
            assert.ok(false,"Should have failed");
        }).catch(function(err){
            if(inThen){
                assert.ok(false, "Should have failed");
            } else {
                assert.ok(true, "Failed successfully");
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
            } else {
                assert.ok(true, "Failed because list is paused");
            }
        });
    });

    it("Should resume Whitelist", function() {
        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return meta.resumeWhitelist()
        }).then(function(){
            return meta.addParticipant(accounts[5]);
        }).then(function(){
            return meta.participantAmount.call();
        }).then(function(count){
            assert.equal(count.toNumber(), whitelistCount_start +1, "Should have added 1");
        });
    });

    it("Should not be able to add admins", function() {
        var inThen;

        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return meta.addAdmin(account_two,{from:account_two, gas: 3000000});
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

    it("Only owner can add to admins", function() {
        var inThen;
        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return meta.isAdmin(account_one);
        }).then(function(isAdmin){
            assert.equal(isAdmin, true, "Owner should be admin")
            return meta.addAdmin(account_two,{from:account_one, gas: 3000000});
        }).then(function(){
            return meta.isAdmin(account_two);
        }).then(function(isAdmin){
            assert.equal(isAdmin, true, "New account should be admin");
        })
    });

    it("Should remove admin", function() {
        var inThen;
        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return meta.addAdmin(accounts[5],{from:account_one, gas: 3000000});
        }).then(function(){
            return meta.isAdmin(accounts[5]);
        }).then(function(isAdmin){
            assert.equal(isAdmin, true, "New account should be admin");
        }).then(function(){
            return meta.removeAdmin(accounts[5],{from:account_one, gas: 3000000});
        }).then(function(){
            return meta.isAdmin(accounts[5]);
        }).then(function(isAdmin){
            assert.equal(isAdmin, false, "Account should not be admin anymore");
        })
    });

    it("Should not be able to remove self from admin", function() {
        var inThen;

        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return meta.removeAdmin(account_one,{from:account_one, gas: 3000000});
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

    it("Should remove an existing account and update the count. After add this one again", function() {
        var whitelistCount_inter;

        return Whitelist.deployed().then(function(instance) {
            meta = instance;
        }).then(function(){
            return meta.addParticipant(accounts[7])
        }).then(function(){
            return meta.participantAmount.call();
        }).then(function(count){
            whitelistCount_inter = count.toNumber();
            return meta.removeParticipant(accounts[7]);
        }).then(function(){
            return meta.participantAmount.call();
        }).then(function(count){
            assert.equal(count.toNumber(),whitelistCount_inter - 1, "Should be one less");
            return true;
        }).then(function(){
            return meta.addParticipant(accounts[7])
        }).then(function(){
            return meta.participantAmount.call();   
        }).then(function(count){
            assert.equal(count.toNumber(),whitelistCount_inter, "Should be the same as in the beginning");
        })
        ;
    });

    it("Should not remove self", function() {
        var inThen;
        
        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return meta.removeParticipant(account_one,{from:account_one, gas: 3000000})
        }).then(function(){
            inThen = true;
            assert.ok(false, "Should have failed with testrpc");            
        }).catch(function(err){
            if (inThen) {
                assert.ok(false, "should have failed directly");
            } else {
                assert.ok(true, "Failed because list is paused");
            }
        });
    });

    it("Should not remove other from list when not an address", function() {
        var inThen = false;

        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return meta.removeParticipant("account_two");
        }).then(function(){
            inThen = true;
            assert.ok(false,"Should have failed");
        }).catch(function(err){
            if(inThen){
                assert.ok(false, "Should have failed");
            } else {
                assert.ok(true, "Failed successfully");
            }
        });
    });


    // test fallback function
    it("Should transfer ether back", function() {
        var account_eight_balance;

        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return web3.eth.getBalance(accounts[8]);            
        }).then(function(balance){
            account_eight_balance = balance.toNumber();
            return true;
        }).then(function(){
            
            //fallback function
            return meta.sendTransaction({from: accounts[8], gas: 3000000, value: 1}); 
            
        })
        then(function(){
            return web3.eth.getBalance(accounts[8]);
        }).then(function(balance){
            // need to take in account the gascosts. But won't be over 0.5 ETH
            assert.ok(balance.toNumber() > (account_eight_balance - web3.toWei(0.5, "ether")),"Should have returned the amount");
        });
    });

    // test add multipleAddresses
    it("Should add 3 addresses to the whitelist", function() {
        var account_eight_balance;
        const multipleAddresses = [accounts[2],accounts[3],accounts[9]]

        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return meta.addMultipleParticipants(multipleAddresses, {from: accounts[0], gas: 3000000})            
        }).then(function(){
            return meta.participantAmount.call();
        }).then(function(participantAmount){
            assert.equal(participantAmount.toNumber(), whitelistCount_start+3, "Should have added 3 addresses")
        }).then(() => {
            return meta.isParticipant(accounts[1])
        }).then((isParticipant) => {
            assert.equal(isParticipant, true, "Should be true")
            return meta.isParticipant(accounts[3])
        }).then((isParticipant) => {
            assert.equal(isParticipant, true, "Should be true")
            return meta.isParticipant(accounts[9])
        }).then((isParticipant) => {
            assert.equal(isParticipant, true, "Should be true")
        })
    });

});