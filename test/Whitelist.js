// Tests are tested with TestRPC.
// @author Kevin Leyssens - <kevin.leyssens@theledger.be>; Jeroen De Prest - <jeroen.deprest@theledger.be> 
// When testing on own network instead of truffles -> unlock accounts 0, 1, 4, 6, 7 and 8

var Whitelist = artifacts.require("Whitelist");
var sha256 = require('js-sha256');

contract('Whitelist', function (accounts) {

    var account_one = accounts[0];
    var account_two = accounts[1];
    var account_four = accounts[4];

    var whitelistCount_start;

    var meta;

    beforeEach(function () {
        return Whitelist.deployed().then(function (instance) {
            meta = instance;
            return meta.participantAmount.call();
        }).then(function (count) {
            whitelistCount_start = count.toNumber();
            return true;
        });
    });

    it('Should be able to use the constructor', function (done) {
        Whitelist.new().then(
            function (whitelist) {
                whitelist.isAdmin(account_one).then(
                    function (isAdmin) {
                        assert.equal(isAdmin, true, "Owner should be admin");
                        done();
                    }).catch(done);
            }).catch(done);
    });


    it("Should add other successfully to list", function () {
        return Whitelist.deployed().then(function (instance) {
            meta = instance;
            return meta.addParticipant(account_two);
        }).then(function () {
            return meta.participantAmount.call();
        }).then(function (count) {
            return assert.equal(count.toNumber(), whitelistCount_start + 1, "Should have added 1");
        });
    });

    it("Should not add other successfully to list when not an address", function () {
        var inThen = false;

        return Whitelist.deployed().then(function (instance) {
            meta = instance;
            return meta.addParticipant("account_two");
        }).then(function () {
            inThen = true;
            assert.ok(false, "Should have failed");
        }).catch(function (err) {
            if (inThen) {
                return assert.ok(false, "Should have failed");
            } else {
                return assert.ok(true, "Failed successfully");
            }
        });
    });

    it("Should not add other successfully to list when not an admin", function () {
        var inThen = false;

        return Whitelist.deployed().then(function (instance) {
            meta = instance;
            return meta.addParticipant(accounts[6], { from: account_two, gas: 3000000 });
        }).then(function () {
            inThen = true;
            assert.ok(false, "Should have failed");
        }).catch(function (err) {
            if (inThen) {
                return assert.ok(false, "Should have failed");
            } else {
                return assert.ok(true, "Failed successfully");
            }
        });
    });

    // test only once added
    it("Should added only once", function () {
        var inThen;
        return Whitelist.deployed().then(function (instance) {
            meta = instance;
            return meta.addParticipant(account_one);
        }).then(function () {
            return meta.addParticipant(account_one);
        }).then(function () {
            inThen = true;
            assert.ok(false, "Should have failed with testrpc");
        }).catch(function () {
            if (inThen) {
                assert.ok(false, "Should have failed directly");
                return meta.participantAmount.call();
            } else {
                assert.ok(true, "Failed because already in list");
                return meta.participantAmount.call();
            }
        }).then(function (count) {
            return assert.equal(count.toNumber(), whitelistCount_start + 1, "Should only have added 1");
        });
    });

    // test not added when paused
    it("Should not add when paused", function () {
        var inThen;

        return Whitelist.deployed().then(function (instance) {
            meta = instance;
        }).then(function () {
            return meta.pauseWhitelist();
        }).then(function () {
            return meta.addParticipant(account_empty)
        }).then(function () {
            inThen = true;
            assert.ok(false, "Should have failed with testrpc");
        }).catch(function (err) {
            if (inThen) {
                return assert.ok(false, "Should have failed directly");
            } else {
                return assert.ok(true, "Failed because list is paused");
            }
        });
    });

    it("Should resume Whitelist", function () {
        return Whitelist.deployed().then(function (instance) {
            meta = instance;
            return meta.resumeWhitelist()
        }).then(function () {
            return meta.addParticipant(accounts[5]);
        }).then(function () {
            return meta.participantAmount.call();
        }).then(function (count) {
            return assert.equal(count.toNumber(), whitelistCount_start + 1, "Should have added 1");
        });
    });

    it("Should not be able to add admins when not an admin", function () {
        var inThen;

        return Whitelist.deployed().then(function (instance) {
            meta = instance;
            return meta.addAdmin(account_two, { from: account_two, gas: 3000000 });
        }).then(function () {
            inThen = true;
            assert.ok(false, "Should have failed with testrpc");
        }).catch(function () {
            if (inThen) {
                return assert.ok(false, "Should have failed directly");
            } else {
                return assert.ok(true, "Failed because only admins can add admins");
            }
        });
    });

    it("Admins can add admins", function () {
        var inThen;
        return Whitelist.deployed().then(function (instance) {
            meta = instance;
            return meta.isAdmin(account_one);
        }).then(function (isAdmin) {
            assert.equal(isAdmin, true, "Owner should be admin")
            return meta.addAdmin(account_two, { from: account_one, gas: 3000000 });
        }).then(function () {
            return meta.isAdmin(account_two);
        }).then(function (isAdmin) {
            return assert.equal(isAdmin, true, "New account should be admin");
        })
    });

    it("Should remove admin", function () {
        var inThen;
        return Whitelist.deployed().then(function (instance) {
            meta = instance;
            return meta.addAdmin(accounts[5], { from: account_one, gas: 3000000 });
        }).then(function () {
            return meta.isAdmin(accounts[5]);
        }).then(function (isAdmin) {
            assert.equal(isAdmin, true, "New account should be admin");
        }).then(function () {
            return meta.removeAdmin(accounts[5], { from: account_one, gas: 3000000 });
        }).then(function () {
            return meta.isAdmin(accounts[5]);
        }).then(function (isAdmin) {
            return assert.equal(isAdmin, false, "Account should not be admin");
        })
    });

    it("Should not be able to remove self as admin", function () {
        var inThen;

        return Whitelist.deployed().then(function (instance) {
            meta = instance;
            return meta.removeAdmin(account_one, { from: account_one, gas: 3000000 });
        }).then(function () {
            inThen = true;
            assert.ok(false, "Should have failed with testrpc");
        }).catch(function () {
            if (inThen) {
                return assert.ok(false, "Should have failed directly");
            } else {
                return assert.ok(true, "Failed because only owner can call stop method");
            }
        });
    });

    it("Should remove an existing account and update the count. After add this one again", function () {

        return Whitelist.deployed().then(function (instance) {
            meta = instance;
            return meta.addParticipant(accounts[7])
        }).then(function () {
            return meta.participantAmount.call();
        }).then(function (count) {
            return meta.removeParticipant(accounts[7]);
        }).then(function () {
            return meta.participantAmount.call();
        }).then(function (count) {
            assert.equal(count.toNumber(), whitelistCount_start, "Should be one less");
            return true;
        }).then(function () {
            return meta.addParticipant(accounts[7])
        }).then(function () {
            return meta.participantAmount.call();
        }).then(function (count) {
            assert.equal(count.toNumber(), whitelistCount_start + 1, "Should be the same as in the beginning");
            return true;
        });
    });

    it("Should not remove self", function () {
        var inThen;

        return Whitelist.deployed().then(function (instance) {
            meta = instance;
            return meta.removeParticipant(account_one, { from: account_one, gas: 3000000 })
        }).then(function () {
            inThen = true;
            assert.ok(false, "Should have failed with testrpc");
        }).catch(function (err) {
            if (inThen) {
                return assert.ok(false, "Should have failed directly");
            } else {
                return assert.ok(true, "Failed because cannot remove self");
            }
        });
    });

    it("Should not remove other from list when not an address", function () {
        var inThen = false;

        return Whitelist.deployed().then(function (instance) {
            meta = instance;
            return meta.removeParticipant("account_two");
        }).then(function () {
            inThen = true;
            assert.ok(false, "Should have failed");
        }).catch(function (err) {
            if (inThen) {
                return assert.ok(false, "Should have failed");
            } else {
                return assert.ok(true, "Failed successfully");
            }
        });
    });


    // test fallback function
    it("Should transfer ether back", function () {
        var account_eight_balance;

        return Whitelist.deployed().then(function (instance) {
            meta = instance;
            return web3.eth.getBalance(accounts[8]);
        }).then(function (balance) {
            account_eight_balance = balance.toNumber();
            return true;
        }).then(function () {
            //fallback function
            return meta.sendTransaction({ from: accounts[8], gas: 3000000, value: 1 });
        }).then(function () {
            return web3.eth.getBalance(accounts[8]);
        }).then(function (balance) {
            // need to take in account the gascosts. But won't be over 0.5 ETH
            return assert.ok(balance.toNumber() > (account_eight_balance - web3.toWei(0.5, "ether")), "Should have returned the amount");
        });
    });

    // test add multipleAddresses
    it("Should add 3 addresses to the whitelist", function () {
        const multipleAddresses = [accounts[2], accounts[3], accounts[9]]

        return Whitelist.deployed().then(function (instance) {
            meta = instance;
            return meta.addMultipleParticipants(multipleAddresses, { from: accounts[0], gas: 3000000 });
        }).then(function () {
            return meta.participantAmount.call();
        }).then(function (participantAmount) {
            assert.equal(participantAmount.toNumber(), whitelistCount_start + 3, "Should have added 3 addresses");
            return true;
        }).then(() => {
            return meta.isParticipant(accounts[1]);
        }).then((isParticipant) => {
            assert.equal(isParticipant, true, "Should be true")
            return meta.isParticipant(accounts[3])
        }).then((isParticipant) => {
            assert.equal(isParticipant, true, "Should be true");
            return meta.isParticipant(accounts[9])
        }).then((isParticipant) => {
            return assert.equal(isParticipant, true, "Should be true");
        })
    });

    // add 5 participants
    it("Should add 5 addresses to the whitelist", function () {
        const multipleAddresses = [];


        return Whitelist.deployed().then(function (instance) {
            for (i = 0; i < 5; i++) {
                msgToHash = `Message to hash` + i;
                sha256(msgToHash);
                var after = sha256.create().update(msgToHash).hex();
                let text = `0x${after}`;
                multipleAddresses.push(text);
            }
            meta = instance;
            return meta.addFiveParticipants(multipleAddresses[0], multipleAddresses[1], multipleAddresses[2], multipleAddresses[3], multipleAddresses[4], { from: accounts[0], gas: 3000000 });
        }).then(function () {
            return meta.participantAmount.call();
        }).then(function (participantAmount) {
            return assert.equal(participantAmount.toNumber(), whitelistCount_start + 5, "Should have added 5 addresses");
        }).then(function() {
            return meta.isParticipant(multipleAddresses[0]);
        }).then(function(isParticipant) {
            assert.equal(isParticipant, true, "Should be true")
            return meta.isParticipant(multipleAddresses[1])
        }).then(function(isParticipant) {
            assert.equal(isParticipant, true, "Should be true");
            return meta.isParticipant(multipleAddresses[2])
        }).then(function(isParticipant) {
            assert.equal(isParticipant, true, "Should be true");            
            return meta.isParticipant(multipleAddresses[3]);
        }).then(function(isParticipant) {
            assert.equal(isParticipant, true, "Should be true")
            return meta.isParticipant(multipleAddresses[4])
        }).then(function(isParticipant) {
            return assert.equal(isParticipant, true, "Should be true");
        })
    });

    // add 10 participants
    it("Should add 10 addresses to the whitelist", function () {
        const multipleAddresses = [];


        return Whitelist.deployed().then(function (instance) {
            for (i = 0; i < 10; i++) {
                msgToHash = `Message to hashh` + i;
                sha256(msgToHash);
                var after = sha256.create().update(msgToHash).hex();
                let text = `0x${after}`;
                multipleAddresses.push(text);
            }
            meta = instance;
            return meta.addTenParticipants(multipleAddresses[0], multipleAddresses[1], multipleAddresses[2], multipleAddresses[3], multipleAddresses[4],multipleAddresses[5], multipleAddresses[6], multipleAddresses[7], multipleAddresses[8], multipleAddresses[9], { from: accounts[0], gas: 3000000 });
        }).then(function () {
            return meta.participantAmount.call();
        }).then(function (participantAmount) {
            return assert.equal(participantAmount.toNumber(), whitelistCount_start + 10, "Should have added 10 addresses");
        }).then(function() {
            return meta.isParticipant(multipleAddresses[0]);
        }).then(function(isParticipant) {
            assert.equal(isParticipant, true, "Should be true")
            return meta.isParticipant(multipleAddresses[1])
        }).then(function(isParticipant) {
            assert.equal(isParticipant, true, "Should be true");
            return meta.isParticipant(multipleAddresses[2])
        }).then(function(isParticipant) {
            assert.equal(isParticipant, true, "Should be true");            
            return meta.isParticipant(multipleAddresses[3]);
        }).then(function(isParticipant) {
            assert.equal(isParticipant, true, "Should be true")
            return meta.isParticipant(multipleAddresses[4])
        }).then(function(isParticipant) {
            assert.equal(isParticipant, true, "Should be true");
            return meta.isParticipant(multipleAddresses[5])            
        }).then(function(isParticipant) {
            assert.equal(isParticipant, true, "Should be true")
            return meta.isParticipant(multipleAddresses[6])
        }).then(function(isParticipant) {
            assert.equal(isParticipant, true, "Should be true");
            return meta.isParticipant(multipleAddresses[7])
        }).then(function(isParticipant) {
            assert.equal(isParticipant, true, "Should be true");            
            return meta.isParticipant(multipleAddresses[8]);
        }).then(function(isParticipant) {
            assert.equal(isParticipant, true, "Should be true")
            return meta.isParticipant(multipleAddresses[9])
        }).then(function(isParticipant) {
            return assert.equal(isParticipant, true, "Should be true");            
        })
    });


      // add 5 participants
      it("Should fail when not inputting enough parameters", function () {
        const multipleAddresses = [];
        var inThen = false;

        return Whitelist.deployed().then(function (instance) {
            for (i = 0; i < 4; i++) {
                msgToHash = `Message to haash` + i;
                sha256(msgToHash);
                var after = sha256.create().update(msgToHash).hex();
                let text = `0x${after}`;
                multipleAddresses.push(text);
            }
            meta = instance;
            return meta.addFiveParticipants(multipleAddresses[0], multipleAddresses[1], multipleAddresses[2], multipleAddresses[3], { from: accounts[0], gas: 3000000 });
        }).then(function () {
            inThen = true;
            assert.ok(false, "Should have failed");
        }).catch(function (err) {
            if (inThen) {
                return assert.ok(false, "Should have failed");
            } else {
                return assert.ok(true, "Failed successfully");
            }
        });
    });

});