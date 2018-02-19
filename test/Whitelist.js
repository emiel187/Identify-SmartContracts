// Tests are tested with TestRPC.
// @author Kevin Leyssens - <kevin.leyssens@theledger.be>
// When testing on own network instead of truffles -> unlock accounts 0,1 and 4

var Whitelist = artifacts.require("Whitelist");
var Platinium = artifacts.require("Platinium");
var Phases = artifacts.require("Phases");
var MultiSigEscrow = artifacts.require("MultiSigEscrow");

contract('Whitelist', function(accounts) {

    var account_one = accounts[0];
    var account_two = accounts[1];
    var account_empty = accounts[4];

    var whitelistCount_start;

    var meta;
    var metaPlatinium;
    var metaWhitelist;

    before(async function(){
        metaPlatinium = await Platinium.deployed();
        metaWhitelist = await Whitelist.deployed();
        // Phases contract is owner of whitelist. 
        // For testing purpose we will make accounts[0] the owner
        // This is done through multisig escrow
        await MultiSigEscrow.deployed().then(function(instance) {
            metaEscrow = instance;
            // invoke function transferOwnershipWhitelist -> 9481c83c to account 0
            var to_account = accounts[0].substring(2,(accounts[0].length));
            var function_data = "0x9481c83c";
            var data = function_data + "000000000000000000000000" + to_account;
            return metaEscrow.submitTransaction(metaEscrow.address,0,data, {from: accounts[0], gas: 3000000});
        }).then(function(){
            // confirm transaction
            return metaEscrow.confirmTransaction(0, {from: accounts[1], gas: 3000000});                                    
        })
    });

    beforeEach(function(){
        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return meta.count_whitelist.call();
        }).then(function(count){
            whitelistCount_start = count.toNumber();
        });
    });

    it('Should be able to use the constructor', function(done) {
        var endTime = 1546300800 ;// (Math.round((Date.now()/1000))+30000);
        Whitelist.new(endTime, '0xa0a4a612fba850df41183cd376e20637d357a8bd').then(
                 function(whitelist) {
                    whitelist.endTimeRegister.call().then(
                       function(enddate) {
                          assert.equal(enddate.toNumber(), endTime, "The enddate is not correct");
                          done();
                       }).catch(done);
                }).catch(done);
    });



    // test added succesfull
    it("Should add self succesfull to list", function() {
        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return meta.addSelfToWhitelist();
        }).then(function(){
            return meta.count_whitelist.call();
        }).then(function(count){
            assert.equal(count.toNumber(), whitelistCount_start +1, "Should have added 1");
        });
    });        

    it("Should add other succesfull to list", function() {
        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return meta.addToWhitelist(account_two);
        }).then(function(){
            return meta.count_whitelist.call();
        }).then(function(count){
            assert.equal(count.toNumber(), whitelistCount_start +1, "Should have added 1");
        });
    });

    it("Should not add other succesfull to list when not an address", function() {
        var inThen = false;

        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return meta.addToWhitelist("account_two");
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
            return meta.getTier(account_one);
        }).then(function(tier){
            if(tier.toNumber() === 0){
                return meta.addToWhitelist(account_one);                
            }else {
                return meta.addToWhitelist(account_one).then(function(){
                    return meta.addToWhitelist(account_one)
                });
            }
        }).then(function(){
            inThen = true;
            assert.ok(false, "Should have failed with testrpc");
        }).catch(function(){
            if (inThen) {
                assert.ok(false, "should have failed directly");
                return meta.count_whitelist.call();
            } else {
                assert.ok(true, "Failed because already in list");
                return meta.count_whitelist.call();
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
            return meta.getTier(account_empty);
        }).then(function(tier){
            if(tier.toNumber() === 0){
                return meta.pauseWhitelist();
            }
        }).then(function(){
            return meta.addToWhitelist(account_empty)
        }).then(function(){
            inThen = true;
            assert.ok(false, "Should have failed with testrpc");            
        }).catch(function(err){
            if (inThen) {
                assert.ok(false, "Should have failed directly");
                return meta.resumeWhitelist();
            } else {
                assert.ok(true, "Failed because list is paused");
                return meta.resumeWhitelist();
            }
        });
    });

    // test tier
    it("Account one should be in tier 1", function() {
        
        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return meta.getTier(account_one);
        }).then(function(tier){
            if(tier.toNumber()!= 0){
                return meta.getTier(account_one);
            } else {
                return meta.addToWhitelist(account_one).then(function(){
                    return meta.getTier(account_one);
                });                
            }
        }).then(function(tier){
            assert.equal(tier.toNumber(),1, "Should be 1, because under 1001 count , the tier is 1")
        });
    });

    // test tier non existing account
    it("Check tier of non existing account, should be 0", function() {
        
        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return meta.getTier(account_empty);
        }).then(function(tier){
            if(tier.toNumber() === 0){
                return meta.getTier(account_empty);
            } else {
                return meta.getTier(accounts[9]);
            }
        }).then(function(tier){
            assert.equal(tier.toNumber(),0, "Should be 0, because not in whitelist")
        });
    });

    // test when stopped no more register
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



    it("Should remove an existing account and update the count. After add this one again", function() {
        var whitelistCount_inter;

        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return meta.getTier(accounts[7]);
        }).then(function(tier){
            if(tier.toNumber() === 0){
                return meta.addToWhitelist(accounts[7])
            } else {
                return true;
            }
        }).then(function(){
            return meta.count_whitelist.call();
        }).then(function(count){
            whitelistCount_inter = count.toNumber();
            return meta.removeFromList(accounts[7]);
        }).then(function(){
            return meta.count_whitelist.call();
        }).then(function(count){
            assert.equal(count.toNumber(),whitelistCount_inter - 1, "Should be one less");
            return true;
        }).then(function(){
            return meta.addToWhitelist(accounts[7])
        }).then(function(){
            return meta.count_whitelist.call();   
        }).then(function(count){
            assert.equal(count.toNumber(),whitelistCount_inter, "Should be the same as in the beginning");
        })
        ;
    });

    // test fallback function
    it("Should register with fallback function and transfer ether back", function() {
        var account_eight_balance;

        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return web3.eth.getBalance(accounts[8]);            
        }).then(function(balance){
            account_eight_balance = balance.toNumber();
            return meta.getTier(accounts[8]);
        }).then(function(tier){
            if(tier.toNumber() === 0){
                //fallback function
                return meta.sendTransaction({from: accounts[8], gas: 3000000, value: 1}); 
            }
        })
        .then(function(){
            return meta.count_whitelist.call();
        }).then(function(count){
            assert.equal(count.toNumber(),whitelistCount_start+1, "Should have added one to the count");
            return web3.eth.getBalance(accounts[8]);
        }).then(function(balance){
            // need to take in account the gascosts. But won't be over 0.5 ETH
            assert.ok(balance.toNumber() > (account_eight_balance - web3.toWei(0.5, "ether")),"Should have returned the amount");
        });
    });

    it("Should change tier correctly. Between 0 and 3", function() {
        var inThen;

        return Whitelist.deployed().then(function(instance) {
            meta = instance;
            return meta.getTier(account_one);
        }).then(function(tier){
            assert.equal(tier.toNumber(),1, "Should be 1");
        }).then(function(){
            return meta.changeTier(account_one, 2);
        }).then(function(){
            return meta.getTier(account_one);
        }).then(function(tier){
            assert.equal(tier.toNumber(),2, "Should be 2");            
        }).then(function(){
            return meta.changeTier(account_one, 4);
        }).then(function(){
            inThen = true;
            assert.ok(false, "Should have failed with testrpc");    
        }).catch(function(err){
            if (inThen) {
                assert.ok(false, "should have failed directly");
            } else {
                assert.ok(true, "Failed because tier is to high");
            }
        })
        ;
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
                return meta.addToWhitelist(account_empty);
            }
        }).then(function(){
            inThen = true;
            assert.ok(false, "Should have failed with testrpc");    
        }).catch(function(err){
            if (inThen) {
                assert.ok(false, "should have failed directly");
                return meta.count_whitelist.call();                
            } else {
                assert.ok(true, "Failed because stop method is invoked");
                return meta.count_whitelist.call();
            }
        }).then(function(count){
            assert.equal(count.toNumber(),whitelistCount_start, "Should be the same");
        });
    });

});