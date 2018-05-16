// Tests are written for testrpc / ganache-cli

var Identify = artifacts.require("Identify");
var MultiSigWallet = artifacts.require("MultiSigWallet");
var Presale = artifacts.require("Presale");
var Whitelist = artifacts.require("Whitelist");


contract('Presale', function (accounts) {
    var metaMultiSig;
    var metaIdentify;
    var metaPresale;
    var metaPresaleV2;
    var metaPresaleV3;

    var account_one = accounts[0];
    var account_two = accounts[1];
    var account_empty = accounts[2];

    before(async function () {
        metaMultiSig = await MultiSigWallet.deployed();
        metaIdentify = await Identify.deployed();
        metaWhitelist = await Whitelist.deployed();
        metaPresale = await Presale.deployed();
    });

    it('Should be able to use the constructor', function (done) {
        var starttime = Math.round((Date.now() / 1000))
        Presale.new(starttime, metaMultiSig.address, metaIdentify.address, metaWhitelist.address, 12,
            6300000, 1, 10).then(
            function (presale) {
                metaPresaleV2 = presale;
                presale.startTime.call().then(
                    function (startTime) {
                        assert.equal(startTime.toNumber(), starttime, "The startTime is not correct");
                        done();
                    }).catch(done);
            }).catch(done);
    });

    it('Owner of token should be presale after deployment', function () {

        return Identify.deployed().then(function (instance) {
            metaIdentify = instance;
            return metaIdentify.owner.call();
        }).then(function (owner) {
            return assert.equal(owner, Presale.address, "Should be presale");
        });
    });

    it('Should have 0 ETH in the wallet', function () {

        return MultiSigWallet.deployed().then(function (instance) {
            metaMultiSig = instance;
            return web3.eth.getBalance(metaMultiSig.address);
        }).then(function (balance) {
            return assert.equal(balance.toNumber(), 0, "Should have 0 ETH in the wallet");
        });
    });

    it('Should not be able to buy correct amount of tokens if not in whitesale', function () {
        var inThen = false;

        return Presale.deployed().then(function (instance) {
            metaPresale = instance;
            return metaPresale.sendTransaction({ from: account_two, gas: 3000000, value: web3.toWei('10', 'ether') });
        }).then(function () {
            inThen = true;
            assert.ok(false, "Should have failed");
        }).catch(function (err) {
            if (inThen) {
                return assert.ok(false, "Should have failed");
            } else {
                return assert.ok(true, "Failed succesfull");
            }
        });
    });

    it('Should not buy tokens if address is contract', function () {
        var inThen = false;

        return Presale.deployed().then(function (instance) {
            metaPresale = instance;
            return metaPresale.sendTransaction({ from: Whitelist.address, gas: 3000000, value: web3.toWei('5', 'ether') });
        }).then(function () {
            inThen = true;
            assert.ok(false, "Should have failed");
        }).catch(function (err) {
            if (inThen) {
                return assert.ok(false, "Should have failed");
            } else {
                return assert.ok(true, "Failed succesfull");
            }
        });
    });

    it('Should be able to buy correct amount of tokens if in whitesale', function () {

        return Presale.deployed().then(function (instance) {
            metaPresale = instance;
            return metaWhitelist.addParticipant(account_one, { from: account_one, gas: 3000000 });
        }).then(function () {
            return metaWhitelist.isParticipant(account_one);
        }).then(function (isParticipant) {
            assert.equal(isParticipant, true, "First account should be added as a participant");
            return metaPresale.sendTransaction({ from: account_one, gas: 3000000, value: web3.toWei('10', 'ether') });
        }).then(function () {
            return metaIdentify.balanceOf(account_one);
        }).then(function (balance) {
            return assert.equal(balance.toNumber(), "5250000000000", "Should have 5250000000000 tokens in his account");
        });
    });


    it('Should have 10 ETH in the wallet after a valid purchase of 10 ETH', function () {

        return MultiSigWallet.deployed().then(function (instance) {
            metaMultiSig = instance;
            return web3.eth.getBalance(metaMultiSig.address);
        }).then(function (balance) {
            return assert.equal(balance.toNumber(), web3.toWei('10', 'ether'), "Should have 25 ETH in the wallet");
        });
    });

    it('Should not buy tokens when paused', function () {
        var inThen = false;

        return Presale.deployed().then(function (instance) {
            metaPresale = instance;
            return metaPresale.pausePresale();
        }).then(function (balance) {
            return metaPresale.sendTransaction({ from: account_one, gas: 3000000, value: web3.toWei('10', 'ether') });
        }).then(function () {
            inThen = true;
            assert.ok(false, "Should have failed");
        }).catch(function (err) {
            if (inThen) {
                return assert.ok(false, "Should have failed");
            } else {
                return assert.ok(true, "Failed succesfull");
            }
        });
    });

    it('Should be able to resume Presale', function () {

        return Presale.deployed().then(function (instance) {
            metaPresale = instance;
            return metaPresale.resumePresale();
        }).then(function () {
            return metaWhitelist.isParticipant(account_one);
        }).then(function (isParticipant) {
            assert.equal(isParticipant, true, "First account should be a participant");
            return metaPresale.sendTransaction({ from: account_one, gas: 3000000, value: web3.toWei('25', 'ether') });
        }).then(function () {
            return metaIdentify.balanceOf(account_one);
        }).then(function (balance) {
            return assert.equal(balance.toNumber(), "18375000000000", "Should have 13125000000000 + 5250000000000 tokens in his account");
        });
    });

    it('Should not transferownershiptoken when invoking as owner', function () {
        var inThen;

        return metaPresale.transferOwnershipToken(metaPresaleV2.address).then(function () {
            inThen = true;
            assert.ok(false, "Should have failed");
        }).catch(function (err) {
            if (inThen) {
                return assert.ok(false, "Should have failed");
            } else {
                return assert.ok(true, "Failed succesfull");
            }
        });
    });

    it('Should transferownershiptoken when invoking as multisigwallet', function () {

        var new_owner = metaPresaleV2.address.substring(2, (metaPresaleV2.address.length));
        // transferownership token
        var function_data = "0x9ae6892b";
        var data = function_data + "000000000000000000000000" + new_owner;

        return MultiSigWallet.deployed().then(function (instance) {
            metaMultisig = instance;
            return metaMultisig.submitTransaction(Presale.address, 0, data, { from: account_one, gas: 3000000 });
        }).then(function () {
            return metaMultisig.transactionCount.call();
        }).then(function (transactioncount) {
            var transaction_id = (transactioncount.toNumber() - 1);
            return metaMultisig.confirmTransaction(transaction_id, { from: account_two, gas: 3000000 });
        }).then(function () {
            return metaIdentify.owner.call();
        }).then(function (owner) {
            return assert.equal(owner, metaPresaleV2.address, "Should transfered successful");
        });
    });

    it('Should buy tokens to setup for further tests', function () {
        return metaWhitelist.addParticipant(accounts[9]).then(function () {
            return metaIdentify.owner.call();
        }).then(function (owner) {
            return assert.equal(owner, metaPresaleV2.address, "Should be presale");
        }).then(function() {
            return metaWhitelist.isParticipant(accounts[9]);
        }).then(function (isParticipant) {
            assert.equal(isParticipant, true, "Account should be added as a participant");
            return metaPresaleV2.sendTransaction({ from: accounts[9], gas: 3000000, value: web3.toWei('10', 'ether') });
        }).then(function () {
            return metaIdentify.balanceOf(accounts[9]);
        }).then(function (balance) {
            return assert.equal(balance.toNumber(), "5250000000000", "Should have 5250000000000 tokens in his account");
        })
    });

    it('Should not buy tokens when not enough wei', function () {
        var inThen = false;

        return metaPresaleV2.sendTransaction({ from: account_one, gas: 3000000, value: 5 }).then(function () {
            inThen = true;
            assert.ok(false, "Should have failed");
        }).catch(function (err) {
            if (inThen) {
                return assert.ok(false, "Should have failed");
            } else {
                return assert.ok(true, "Failed succesfull");
            }
        });
    });

    it('Should not buy tokens when to much wei', function () {
        var inThen = false;

        return metaPresaleV2.sendTransaction({ from: account_one, gas: 3000000, value: web3.toWei('11', 'ether') }).then(function () {
            inThen = true;
            assert.ok(false, "Should have failed");
        }).catch(function (err) {
            if (inThen) {
                return assert.ok(false, "Should have failed");
            } else {
                return assert.ok(true, "Failed succesfull");
            }
        });
    });

    it('Should not buy tokens over eth cap', function () {
        var inThen = false;

        return metaPresaleV2.sendTransaction({ from: account_one, gas: 3000000, value: web3.toWei('3', 'ether') }).then(function () {
            inThen = true;
            assert.ok(false, "Should have failed");
        }).catch(function (err) {
            if (inThen) {
                return assert.ok(false, "Should have failed");
            } else {
                return assert.ok(true, "Failed succesfull");
            }
        });
    });

    it('Should buy tokens to the ethercap', function () {
        return metaWhitelist.isParticipant(account_one).then(function (isParticipant) {
            assert.equal(isParticipant, true, "First account should be a participant");
            return metaPresaleV2.sendTransaction({ from: account_one, gas: 3000000, value: web3.toWei('2', 'ether') });
        }).then(function () {
            return metaIdentify.balanceOf(account_one);
        }).then(function (balance) {
            return assert.equal(balance.toNumber(), "19425000000000", "Should have 13125000000000 + 5250000000000 + (525000000000 * 2) tokens in his account");
        });
    });

    it('Should deploy another contract', function (done) {
        var starttime = Math.round((Date.now() / 1000))
        Presale.new(starttime, metaMultiSig.address, metaIdentify.address, metaWhitelist.address, 12,
            524999, 1, 10).then(
            function (presale) {
                metaPresaleV3 = presale;
                presale.startTime.call().then(
                    function (startTime) {
                        assert.equal(startTime.toNumber(), starttime, "The startTime is not correct");
                        done();
                    }).catch(done);
            }).catch(done);
    });

    it('Should not be able to buy if tokens go over cap', function () {
        var inThen = false;

        var new_owner = metaPresaleV3.address.substring(2, (metaPresaleV3.address.length));
        // transferownership token
        var function_data = "0x9ae6892b";
        var data = function_data + "000000000000000000000000" + new_owner;

        return MultiSigWallet.deployed().then(function (instance) {
            metaMultisig = instance;
            return metaMultisig.submitTransaction(metaPresaleV2.address, 0, data, { from: account_one, gas: 3000000 });
        }).then(function () {
            return metaMultisig.transactionCount.call();
        }).then(function (transactioncount) {
            var transaction_id = (transactioncount.toNumber() - 1);
            return metaMultisig.confirmTransaction(transaction_id, { from: account_two, gas: 3000000 });
        }).then(function () {
            return metaIdentify.owner.call();
        }).then(function (owner) {
            return assert.equal(owner, metaPresaleV3.address, "Should transfered successful");
        }).then(function() {
            return metaWhitelist.isParticipant(accounts[9])
        }).then(function (isParticipant) {
            assert.equal(isParticipant, true, "First account should be a participant");
            // rate is 420000 + 25% bonus = 525000 tokens at 1ETH, the cap is 524999
            return metaPresaleV3.sendTransaction({ from: accounts[9], gas: 3000000, value: web3.toWei('1', 'ether') });
        }).then(function () {
            inThen = true;
            assert.ok(false, "Should have failed");
        }).catch(function (err) {
            if (inThen) {
                return assert.ok(false, "Should have failed");
            } else {
                return assert.ok(true, "Failed succesfull");
            }
        });
    });

    it('Should not transfer ownership as owner', function () {
        var inThen = false;

        return Presale.deployed().then(function (instance) {
            metaPresale = instance;
            return metaPresale.owner.call();
        }).then(function (owner) {
            assert.equal(owner, account_one);
            return metaPresale.transferOwnership(account_two, { from: account_one });
        }).then(function () {
            inThen = true;
            assert.ok(false, "Should have failed");
        }).catch(function (err) {
            if (inThen) {
                return assert.ok(false, "Should have failed");
            } else {
                return assert.ok(true, "Failed succesfull");
            }
        });
    });

    it('Should transferownership when invoking as multisigwallet', function () {

        var new_owner = account_two.substring(2, (account_two.length));
        // transferownership
        var function_data = "0xf2fde38b";
        var data = function_data + "000000000000000000000000" + new_owner;

        return MultiSigWallet.deployed().then(function (instance) {
            metaMultisig = instance;
            return metaMultisig.submitTransaction(Presale.address, 0, data, { from: account_one, gas: 3000000 });
        }).then(function () {
            return metaMultisig.transactionCount.call();
        }).then(function (transactioncount) {
            var transaction_id = (transactioncount.toNumber() - 1);
            return metaMultisig.confirmTransaction(transaction_id, { from: account_two, gas: 3000000 });
        }).then(function () {
            return metaPresale.owner.call();
        }).then(function (owner) {
            return assert.equal(owner, account_two, "Should transfered successful");
        });
    });

    it('Should not finalize presale when not ended', function () {
        // finalize
        var function_data = "0x4bb278f3";

        return Presale.deployed().then(function (instance) {
            metaPresale = instance;
            return metaPresale.hasEnded.call();
        }).then(function (ended) {
            assert.equal(ended, false, "Should be false");
            return metaPresale.isFinalized.call();
        }).then(function (finalized) {
            assert.equal(finalized, false, "Should be false");
            return metaMultisig.submitTransaction(metaPresale.address, 0, function_data, { from: account_one, gas: 3000000 });
        }).then(function () {
            return metaMultisig.transactionCount.call();
        }).then(function (transactioncount) {
            var transaction_id = (transactioncount.toNumber() - 1);
            return metaMultisig.confirmTransaction(transaction_id, { from: account_two, gas: 3000000 });
        }).then(function () {
            return metaPresale.isFinalized.call();
        }).then(function (finalized) {
            return assert.equal(finalized, false, "Should not be finalized");
        })
    });

    it('Should not finalize presale when not multisig', function () {
        var inThen = false;
        var function_data = "0x4bb278f3";

        return metaPresaleV2.hasEnded.call().then(function (ended) {
            assert.equal(ended, true, "Should be true");
            return metaPresaleV2.isFinalized.call();
        }).then(function (finalized) {
            assert.equal(finalized, false, "Should be false");
            return metaPresaleV2.finalize();
        }).then(function () {
            inThen = true;
            assert.ok(false, "Should have failed");
        }).catch(function (err) {
            if (inThen) {
                return assert.ok(false, "Should have failed");
            } else {
                return assert.ok(true, "Failed succesfull");
            }
        });
    });

    it('Should finalize presale when all requirements are met as multisigwallet + changed owner of token', function () {
        var new_owner = metaPresaleV2.address.substring(2, (metaPresaleV2.address.length));
        var function_data = "0x9ae6892b";
        var data = function_data + "000000000000000000000000" + new_owner;
        var function_finalize = "0x4bb278f3";

        return metaPresaleV2.hasEnded.call().then(function (ended) {
            assert.equal(ended, true, "Should be true");
            // make presaleV2 owner of token        
            return metaMultisig.submitTransaction(metaPresaleV3.address, 0, data, { from: account_one, gas: 3000000 });
        }).then(function () {
            return metaMultisig.transactionCount.call();
        }).then(function (transactioncount) {
            var transaction_id = (transactioncount.toNumber() - 1);
            return metaMultisig.confirmTransaction(transaction_id, { from: account_two, gas: 3000000 });
        }).then(function () {
            return metaIdentify.owner.call();
        }).then(function (owner) {
            assert.equal(owner, metaPresaleV2.address, "Should transfered successful");
            return metaPresaleV2.isFinalized.call();
        }).then(function (finalized) {
            assert.equal(finalized, false, "Should be false");
            return metaMultisig.submitTransaction(metaPresaleV2.address, 0, function_finalize, { from: account_one, gas: 3000000 });
        }).then(function () {
            return metaIdentify.owner.call()
        }).then(function (owner) {
            assert.equal(owner, metaPresaleV2.address, "Should be presale");
            return metaMultisig.transactionCount.call();
        }).then(function (transactioncount) {
            var transaction_id = (transactioncount.toNumber() - 1);
            return metaMultisig.confirmTransaction(transaction_id, { from: account_two, gas: 3000000 });
        }).then(function () {
            return metaPresaleV2.isFinalized.call();
        }).then(function (finalized) {
            assert.equal(finalized, true, "Should be finalized");
            return metaIdentify.owner.call()
        }).then(function (owner) {
            return assert.equal(owner, metaMultisig.address, "Should be the multisig after finalization");
        })
    });

    it('Should drop minimumETH check when gap to cap is less than minimumETH', function () {
        var metaPresaleV5;
        var starttime = Math.round((Date.now() / 1000))

        return Presale.new(starttime, metaMultiSig.address, metaIdentify.address, metaWhitelist.address,
            3, // capETH
            15750000, //capTokens
            2, // minimumETH
            10 // maximumETH
        ).then(function (instance) {
            metaPresaleV5 = instance;
            var new_owner = metaPresaleV5.address.substring(2, (metaPresaleV5.address.length));
            var function_data = "0xf2fde38b";
            var data = function_data + "000000000000000000000000" + new_owner;
            // make presaleV5 owner of token        
            return metaMultisig.submitTransaction(metaIdentify.address, 0, data, { from: account_one, gas: 3000000 });
        }).then(function () {
            return metaMultisig.transactionCount.call();
        }).then(function (transactioncount) {
            var transaction_id = (transactioncount.toNumber() - 1);
            return metaMultisig.confirmTransaction(transaction_id, { from: account_two, gas: 3000000 });
        }).then(function () {
            return metaIdentify.owner.call();
        }).then(function (owner) {
            assert.equal(owner, metaPresaleV5.address, "Should transfered successful");
            return metaWhitelist.addParticipant(account_two, { from: account_one, gas: 3000000 });
        }).then(function () {
            return metaWhitelist.isParticipant(account_two);
        }).then(function (isParticipant) {
            assert.equal(isParticipant, true, "Should be a participant");
            // return metaPresaleV5.sendTransaction({ from: account_two, gas: 3000000, value: "2000000000000000000" });
            return metaPresaleV5.sendTransaction({ from: account_two, gas: 3000000, value: web3.toWei('2', 'ether') });
        }).then(function () {
            return metaPresaleV5.hasEnded.call()
        }).then(function (ended) {
            assert.equal(ended, false, "Should not yet be ended");
            return metaPresaleV5.sendTransaction({ from: account_two, gas: 3000000, value: web3.toWei('1', 'ether') });
        }).then(function () {
            return metaPresaleV5.hasEnded.call()
        }).then(function (ended) {
            return assert.equal(ended, true, "Should be ended");
        });
    });
});