
var MultiSigWallet = artifacts.require("MultiSigWallet");
var Presale = artifacts.require("Presale");
var Identify = artifacts.require("Identify");

contract('MultiSigWallet', function (accounts) {
    var account_one = accounts[0];
    var account_two = accounts[1];
    var account_three = accounts[2];
    var account_notowner = accounts[4];

    var metaPresale;
    var metaIdentify;
    var metaMultisig;

    var transactioncount_start;
    var balance_start;

    before(async function () {
        metaPresale = await Presale.deployed();
        metaIdentify = await Identify.deployed();
    });

    beforeEach(function () {
        MultiSigWallet.deployed().then(function (instance) {
            metaMultisig = instance;
            return metaMultisig.transactionCount.call();
        }).then(function (transactioncount) {
            transactioncount_start = transactioncount.toNumber();
            return web3.eth.getBalance(metaMultisig.address);
        }).then(function (balance) {
            balance_start = balance.toNumber();
        })
    });

    it('Should be able to use the constructor', function (done) {
        MultiSigWallet.new([
            '0xa0a4a612fba850df41183cd376e20637d357a8bd', // accounts[0]
            '0xff95174a8978f7aff48537f4741135f523079d0b', // accounts[1]
            '0xbb848227f23c08fa38da659d8041112ea5a2b7de' // accounts[2]
        ], 2,
            Identify.address
        ).then(
            function (multisig) {
                multisig.isOwner('0xff95174a8978f7aff48537f4741135f523079d0b').then(
                    function (isowner) {
                        assert.ok(isowner, "Should be an owner");
                        done();
                    }).catch(done);
            }).catch(done);
    });

    it("Test fallback function", function () {

        return MultiSigWallet.deployed().then(function (instance) {
            metaMultisig = instance;
            return metaMultisig.sendTransaction({ from: account_notowner, gas: 3000000, value: 1000000000000000000 });
        }).then(function () {
            return web3.eth.getBalance(metaMultisig.address);
        }).then(function (balance) {
            assert.equal(balance.toNumber(), "1000000000000000000", "Should be 1 ETH");
        })
            ;
    });


    it("Should change requirement from 2 to 1 and back to 2", function () {
        var firstTransaction_count;
        var firstTransaction_id;
        var secondTransaction_count;

        return MultiSigWallet.deployed().then(function (instance) {
            metaMultisig = instance;
            return metaMultisig.transactionCount.call();
        }).then(function (transactioncount) {
            transactioncount_start = transactioncount.toNumber();
            firstTransaction_count = transactioncount_start + 1;
            firstTransaction_id = transactioncount_start;
            secondTransaction_count = transactioncount_start + 2;
            return metaMultisig.required.call();
        }).then(function (required) {
            assert.equal(required.toNumber(), 2, "Should be 2");
        }).then(function () {
            return metaMultisig.submitTransaction(metaMultisig.address, 0, "0xba51a6df0000000000000000000000000000000000000000000000000000000000000001", { from: account_three, gas: 3000000 });
        }).then(function () {
            return metaMultisig.required.call();
        }).then(function (required) {
            assert.equal(required.toNumber(), 2, "Should still be 2");
        }).then(function () {
            return metaMultisig.transactionCount.call();
        }).then(function (transactioncount) {
            assert.equal(transactioncount, firstTransaction_count, "Should be begin transaction count + 1 for first transaction");
        }).then(function () {
            return metaMultisig.confirmTransaction(firstTransaction_id, { from: account_two, gas: 3000000 });
        }).then(function () {
            return metaMultisig.required.call();
        }).then(function (required) {
            assert.equal(required.toNumber(), 1, "Should be 1");
        }).then(function () {
            return metaMultisig.submitTransaction(metaMultisig.address, 0, "0xba51a6df0000000000000000000000000000000000000000000000000000000000000002", { from: account_two, gas: 3000000 });
        }).then(function () {
            return metaMultisig.transactionCount.call();
        }).then(function (transactioncount) {
            assert.equal(transactioncount.toNumber(), secondTransaction_count, "First and second transaction added");
        }).then(function () {
            return metaMultisig.required.call();
        }).then(function (required) {
            // Instantly accepts the submitted transaction because we set our required to only 1 -> so let's set it back to 2
            assert.equal(required.toNumber(), 2, "Should be 2");
        })
            ;
    });


    // submit transaction + get confirmation count +   revoke confirmation +   confirm transaction

    it("Submit transaction + get confirmation count + isconfirmed + revoke confirmation + confirm 2 x transaction + execute transaction", function () {
        var beginTransaction;
        var firstTransaction_count;
        var firstTransaction_id;

        return MultiSigWallet.deployed().then(function (instance) {
            metaMultisig = instance;
            return metaMultisig.transactionCount.call();
        }).then(function (transactioncount) {
            beginTransaction = transactioncount.toNumber();
            return metaMultisig.submitTransaction(account_one, 1000000000, "", { from: account_two, gas: 3000000 });
        }).then(function () {
            firstTransaction_count = beginTransaction + 1;
            firstTransaction_id = beginTransaction;
            return metaMultisig.transactionCount.call();
        }).then(function (transactioncount) {
            assert.equal(transactioncount.toNumber(), firstTransaction_count, "Should have added one extra");
        }).then(function () {
            return metaMultisig.getConfirmationCount(firstTransaction_id);
        }).then(function (confirmations) {
            assert.equal(confirmations.toNumber(), 1, "Should be 1");
            return metaMultisig.revokeConfirmation(firstTransaction_id, { from: account_two, gas: 3000000 });
        }).then(function () {
            return metaMultisig.getConfirmationCount(firstTransaction_id);
        }).then(function (confirmations) {
            assert.equal(confirmations.toNumber(), 0, "Should be 0");
            return metaMultisig.confirmTransaction(firstTransaction_id, { from: account_one, gas: 3000000 });
        }).then(function () {
            return metaMultisig.getConfirmationCount(firstTransaction_id);
        }).then(function (confirmations) {
            assert.equal(confirmations.toNumber(), 1, "Should be 1");
            return metaMultisig.isConfirmed(firstTransaction_id);
        }).then(function (isconfirmed) {
            assert.ok(!isconfirmed, "Should not be confirmed");
            return metaMultisig.confirmTransaction(firstTransaction_id, { from: account_two, gas: 3000000 });
        }).then(function () {
            return metaMultisig.getConfirmationCount(firstTransaction_id);
        }).then(function (confirmations) {
            assert.equal(confirmations.toNumber(), 2, "Should be 2");
            return metaMultisig.isConfirmed(firstTransaction_id);
        }).then(function (isconfirmed) {
            assert.ok(isconfirmed, "Should be confirmed");
            // confirmed, so transaction should be executed
            return web3.eth.getBalance(metaMultisig.address);
        }).then(function (balance) {
            // must be smaller or equal to the amount we sent. But higher than the amount we send + 50%. 
            // Cause could be a bit less than the original - 1000000000 of gas costs
            assert.ok((balance <= (balance_start - 1000000000)) && (balance >= (balance_start - 1500000000)), "Should be less");
        });
    });

    // fail execute transaction cause already executed

    it("Should fail when confirm transaction that already is confirmed by this owner", function () {
        var beginTransaction;
        var firstTransaction_count;
        var firstTransaction_id;
        var inThen = false;

        return MultiSigWallet.deployed().then(function (instance) {
            metaMultisig = instance;
            return metaMultisig.transactionCount.call();
        }).then(function (transactioncount) {
            beginTransaction = transactioncount.toNumber();
            return metaMultisig.submitTransaction(account_one, 1000000000, "", { from: account_two, gas: 3000000 });
        }).then(function () {
            firstTransaction_count = beginTransaction + 1;
            firstTransaction_id = beginTransaction;
            return metaMultisig.confirmTransaction(firstTransaction_id, { from: account_two, gas: 3000000 });
        }).then(function () {
            inThen = true;
            assert.ok(false, "Should have failed, already confirmed by this owner")
        }).catch(function (err) {
            if (inThen) {
                assert.ok(false, "should have failed directly");
            } else {
                assert.ok(true, "Failed because already confirmed");
            }
        })
            ;
    });

    it("Should fail when executing transaction that already is executed", function () {
        var beginTransaction;
        var firstTransaction_count;
        var firstTransaction_id;
        var inThen = false;

        return MultiSigWallet.deployed().then(function (instance) {
            metaMultisig = instance;
            return metaMultisig.transactionCount.call();
        }).then(function (transactioncount) {
            beginTransaction = transactioncount.toNumber();
            return metaMultisig.submitTransaction(account_one, 1000000000, "", { from: account_two, gas: 3000000 });
        }).then(function () {
            firstTransaction_count = beginTransaction + 1;
            firstTransaction_id = beginTransaction;
            return metaMultisig.confirmTransaction(firstTransaction_id, { from: account_one, gas: 3000000 });
        }).then(function () {
            return metaMultisig.executeTransaction(firstTransaction_id, { from: account_one, gas: 3000000 });
        }).then(function () {
            inThen = true;
            assert.ok(false, "Should have failed, already confirmed by this owner")
        }).catch(function (err) {
            if (inThen) {
                assert.ok(false, "should have failed directly");
            } else {
                assert.ok(true, "Failed because already executed");
            }
        });
    });

    // execute Transaction by example when there is first 2 required and you change it to 1, transactions who have 1 can be triggered by this function

    it("Should fail when executing transaction that not has enough confirmations", function () {
        var beginTransaction;
        var firstTransaction_count;
        var firstTransaction_id;

        return MultiSigWallet.deployed().then(function (instance) {
            metaMultisig = instance;
            return metaMultisig.transactionCount.call();
        }).then(function (transactioncount) {
            beginTransaction = transactioncount.toNumber();
            return metaMultisig.submitTransaction(account_one, 1000000000, "", { from: account_two, gas: 3000000 });
        }).then(function () {
            firstTransaction_count = beginTransaction + 1;
            firstTransaction_id = beginTransaction;
            return metaMultisig.executeTransaction(firstTransaction_id);
        }).then(function () {
            return metaMultisig.transactions.call(firstTransaction_id)
        }).then(function (transaction) {
            // get transaction with that id and check if it is executed
            if (!transaction[3]) {
                assert.ok(true, "Should be false");
            } else {
                assert.ok(false, "Should be false");
            }
        }).catch(function () {
            assert.ok(false, "Should not have failed, catched above.")
        })
            ;
    });

    it("Should get owners properly", function () {


        return MultiSigWallet.deployed().then(function (instance) {
            metaMultisig = instance;
            return metaMultisig.transactionCount.call();
        }).then(function (transactioncount) {
            beginTransaction = transactioncount.toNumber();
            return metaMultisig.submitTransaction(account_one, 1000000000, "");
        }).then(function () {
            firstTransaction_count = beginTransaction + 1;
            firstTransaction_id = beginTransaction;
            return metaMultisig.executeTransaction(firstTransaction_id);
        }).then(function () {
            return metaMultisig.transactions.call(firstTransaction_id)
        }).then(function (transaction) {
            // get transaction with that id and check if it is executed
            if (!transaction[3]) {
                assert.ok(true, "Should be false");
            } else {
                assert.ok(false, "Should be false");
            }
        }).catch(function () {
            assert.ok(false, "Should not have failed, catched above.")
        })
            ;
    });



    // transfer ownership of token
    it("Should transfer ownership of token through presale to account_one", function () {

        var new_owner = account_one.substring(2, (account_one.length));
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
            assert.equal(owner, account_one, "Should transfered successful");
        });
    });


    // get Identify token amount
    it("Should display Identify tokens properly", function () {
        var Identify_start;

        return MultiSigWallet.deployed().then(function (instance) {
            metaMultisig = instance;
            return metaMultisig.getIdentifyAmount();
        }).then(function (tokens) {
            Identify_start = tokens.toNumber();
            // change owner of Identify contract
            return metaIdentify.transferFrom(Identify.address, MultiSigWallet.address, 10000000000);
        }).then(function () {
            return metaMultisig.getIdentifyAmount();
        }).then(function (tokens) {
            return assert.equal(tokens.toNumber(), Identify_start + 10000000000);
        });
    });


    it("Should add owner after confirmations+ required stays at 2", function () {
        var owners_start;
        var transaction_id;
        return MultiSigWallet.deployed().then(function (instance) {
            metaMultisig = instance;
            return metaMultisig.getOwners();
        }).then(function (owners) {
            owners_start = owners.length;
            //add new owner with address (0xe6908e30e9fdcadb92fb9e56939f0a6151e67db1)
            return metaMultisig.submitTransaction(metaMultisig.address, 0, "0x7065cb48000000000000000000000000e6908e30e9fdcadb92fb9e56939f0a6151e67db1", { from: account_one, gas: 3000000 });
        }).then(function () {
            return metaMultisig.transactionCount.call();
        }).then(function (transactioncount) {
            transaction_id = (transactioncount.toNumber() - 1);
            return metaMultisig.getOwners();
        }).then(function (owners) {
            assert.equal(owners.length, owners_start, "Should still be the same");
            return metaMultisig.confirmTransaction(transaction_id, { from: account_two, gas: 3000000 });
        }).then(function () {
            return metaMultisig.getOwners();
        }).then(function (owners) {
            assert.equal(owners.length, owners_start + 1, "Should be 1 more");
            assert.equal(owners[owners_start], "0xe6908e30e9fdcadb92fb9e56939f0a6151e67db1", "Should be this address");
        }).then(function () {
            return metaMultisig.required.call();
        }).then(function (required) {
            // Instantly accepts the submitted transaction because we set our required to only 1 -> so let's set it back to 2
            assert.equal(required.toNumber(), 2, "Should still be 2");
        })
            ;
    });


    it("Should remove owner after confirmations + required stays at 2", function () {
        var owners_start;
        var transaction_id;
        return MultiSigWallet.deployed().then(function (instance) {
            metaMultisig = instance;
            return metaMultisig.getOwners();
        }).then(function (owners) {
            owners_start = owners.length;
            //remove new owner with address (0xe6908e30e9fdcadb92fb9e56939f0a6151e67db1)
            return metaMultisig.submitTransaction(metaMultisig.address, 0, "0x173825d9000000000000000000000000e6908e30e9fdcadb92fb9e56939f0a6151e67db1", { from: account_one, gas: 3000000 });
        }).then(function () {
            return metaMultisig.transactionCount.call();
        }).then(function (transactioncount) {
            transaction_id = (transactioncount.toNumber() - 1);
            return metaMultisig.getOwners();
        }).then(function (owners) {
            assert.equal(owners.length, owners_start, "Should still be the same");
            return metaMultisig.confirmTransaction(transaction_id, { from: account_two, gas: 3000000 });
        }).then(function () {
            return metaMultisig.getOwners();
        }).then(function (owners) {
            assert.equal(owners.length, owners_start - 1, "Should be 1 less");
        }).then(function () {
            return metaMultisig.required.call();
        }).then(function (required) {
            // Instantly accepts the submitted transaction because we set our required to only 1 -> so let's set it back to 2
            assert.equal(required.toNumber(), 2, "Should still be 2");
        })
            ;
    });

    // replace owner -> 0xe20056e6

    it("Should replace owner after confirmations + required stays at 2", function () {
        var owners_start;
        var transaction_id;

        var old_owner = account_one.substring(2, (account_one.length));
        var new_owner = account_notowner.substring(2, (account_notowner.length));
        var function_data = "0xe20056e6";

        var old_owners;

        return MultiSigWallet.deployed().then(function (instance) {
            metaMultisig = instance;
            return metaMultisig.getOwners();
        }).then(function (owners) {
            var data = function_data + "000000000000000000000000" + old_owner + "000000000000000000000000" + new_owner;
            old_owners = owners;
            return metaMultisig.submitTransaction(metaMultisig.address, 0, data, { from: account_one, gas: 3000000 });
        }).then(function () {
            return metaMultisig.transactionCount.call();
        }).then(function (transactioncount) {
            transaction_id = (transactioncount.toNumber() - 1);
            return metaMultisig.confirmTransaction(transaction_id, { from: account_two, gas: 3000000 });
        }).then(function () {
            return metaMultisig.getOwners();
        }).then(function (owners) {
            assert.ok(old_owners[0] != owners[0], "Should be replaced by the new (not) owner")
        })
            ;
    });

    it("Should not replace owner after confirmations if owner already is an owner", function () {
        var owners_start;
        var transaction_id;

        var old_owner = account_three.substring(2, (account_three.length));
        var new_owner = account_two.substring(2, (account_two.length));
        var function_data = "0xe20056e6";

        var old_owners;

        return MultiSigWallet.deployed().then(function (instance) {
            metaMultisig = instance;
            return metaMultisig.getOwners();
        }).then(function (owners) {
            var data = function_data + "000000000000000000000000" + old_owner + "000000000000000000000000" + new_owner;
            old_owners = owners;
            return metaMultisig.submitTransaction(metaMultisig.address, 0, data, { from: account_three, gas: 3000000 });
        }).then(function () {
            return metaMultisig.transactionCount.call();
        }).then(function (transactioncount) {
            transaction_id = (transactioncount.toNumber() - 1);
            return metaMultisig.confirmTransaction(transaction_id, { from: account_two, gas: 3000000 });
        }).then(function () {
            return metaMultisig.getOwners();
        }).then(function (owners) {
            assert.ok(old_owners[2] === owners[2], "Should not be replaced by the new owner");
            assert.ok(old_owners[1] === owners[1], "Should not be replaced by the new owner");
            assert.ok(old_owners[0] === owners[0], "Should not be replaced by the new owner");
        })
            ;
    });

    it("Should fail when submitting a function when is not in the owners list", function () {
        var owners_start;
        var transaction_id;

        var old_owner = account_three.substring(2, (account_three.length));
        var new_owner = account_two.substring(2, (account_two.length));
        var function_data = "0xe20056e6";

        var old_owners;

        var inThen = false;

        return MultiSigWallet.deployed().then(function (instance) {
            metaMultisig = instance;
            return metaMultisig.getOwners();
        }).then(function (owners) {
            var data = function_data + "000000000000000000000000" + old_owner + "000000000000000000000000" + new_owner;
            old_owners = owners;
            return metaMultisig.submitTransaction(metaMultisig.address, 0, data, { from: account_one, gas: 3000000 });
        }).then(function () {
            inThen = true;
            assert.ok(false, "Should have failed here");
        }).catch(function () {
            if (inThen) {
                assert.ok(false, "should have failed directly");
            } else {
                assert.ok(true, "Failed because not in ownerslist");
            }
        })
            ;
    });

    it("Should fail when confirming a function when is not in the owners list", function () {
        var owners_start;
        var transaction_id;

        var old_owner = account_three.substring(2, (account_three.length));
        var new_owner = account_two.substring(2, (account_two.length));
        var function_data = "0xe20056e6";

        var old_owners;

        var inThen = false;

        return MultiSigWallet.deployed().then(function (instance) {
            metaMultisig = instance;
            return metaMultisig.getOwners();
        }).then(function (owners) {
            var data = function_data + "000000000000000000000000" + old_owner + "000000000000000000000000" + new_owner;
            old_owners = owners;
            return metaMultisig.submitTransaction(metaMultisig.address, 0, data, { from: account_three, gas: 3000000 });
        }).then(function () {
            return metaMultisig.transactionCount.call();
        }).then(function (transactioncount) {
            transaction_id = (transactioncount.toNumber() - 1);
            return metaMultisig.confirmTransaction(transaction_id, { from: account_one, gas: 3000000 });
        }).then(function () {
            inThen = true;
            assert.ok(false, "Should have failed here");
        }).catch(function () {
            if (inThen) {
                assert.ok(false, "should have failed directly");
            } else {
                assert.ok(true, "Failed because not in ownerslist");
            }
        })
            ;
    });

    // transfer Identify token amount -> 0x7926902e

    it("Should transfer Identify tokens to an account after confirmation", function () {
        var transaction_id;
        var multisig_Identify_start;
        var account_two_Identify_start;

        var to_account = account_two.substring(2, (account_two.length));
        //10000000000 in hex is 2540BE400
        var amount_to_send = "00000000000000000000000000000000000000000000000000000002540BE400";

        var function_data = "0x7926902E";

        return MultiSigWallet.deployed().then(function (instance) {
            metaMultisig = instance;
            return metaIdentify.transferFrom(Identify.address, MultiSigWallet.address, 10000000000);
        }).then(function () {
            return metaMultisig.getIdentifyAmount();
        }).then(function (tokens) {
            multisig_Identify_start = tokens.toNumber();
            return metaIdentify.balanceOf(account_two);
        }).then(function (balance) {
            account_two_Identify_start = balance.toNumber();
            var data = function_data + "000000000000000000000000" + to_account + amount_to_send;
            return metaMultisig.submitTransaction(metaMultisig.address, 0, data, { from: account_three, gas: 3000000 });
        }).then(function () {
            return metaMultisig.getIdentifyAmount();
        }).then(function (tokens) {
            assert.ok(tokens.toNumber() === multisig_Identify_start, "Should still be the same, because not yet confirmed transaction");
        }).then(function () {
            return metaMultisig.transactionCount.call();
        }).then(function (transactioncount) {
            var transaction_id = (transactioncount.toNumber() - 1);
            return metaMultisig.confirmTransaction(transaction_id, { from: account_two, gas: 3000000 });
        }).then(function () {
            return metaMultisig.getIdentifyAmount();
        }).then(function (tokens) {
            assert.equal(tokens.toNumber(), (multisig_Identify_start - 10000000000));
            return metaIdentify.balanceOf(account_two);
        }).then(function (balance) {
            assert.equal(balance.toNumber(), (account_two_Identify_start + 10000000000));
        });
    });


    // test getTransactionIds
    it("Should return getTransactionIds properly", function () {

        return MultiSigWallet.deployed().then(function (instance) {
            metaMultisig = instance;
            return metaMultisig.getTransactionIds(0, 13, true, true);
        }).then(function (transactionids) {
            return assert.equal(transactionids.length, 13, "Should have 13 transactions as return value");
        });
    });

    // test getTransactionIds
    it("Should fail when more than 13 transactions at getTransactionIds", function () {
        var inThen;

        return MultiSigWallet.deployed().then(function (instance) {
            metaMultisig = instance;
            return metaMultisig.getTransactionIds(0, 14, true, true);
        }).catch(function () {
            if (inThen) {
                assert.ok(false, "should have failed directly");
            } else {
                assert.ok(true, "Failed because not in ownerslist");
            }
        });
    });


    // test getTransactionCount
    it("Should return 13 at getTransactionCount", function () {
        return MultiSigWallet.deployed().then(function (instance) {
            metaMultisig = instance;
            return metaMultisig.getTransactionCount(true, true);
        }).then(function (transactioncount) {
            return assert.equal(transactioncount.toNumber(), 14, "Should have 14 transactions as return value");
        });
    });
    // test getTransactionCount
    it("Should have 8 executed transactions", function () {
        return MultiSigWallet.deployed().then(function (instance) {
            metaMultisig = instance;
            return metaMultisig.getTransactionCount(false, true);
        }).then(function (transactioncount) {
            return assert.equal(transactioncount.toNumber(), 9, "Should have 9 executed transactions as return value");
        });
    });

    // test notNull modifier
    it("Should fail when owners address is invalid", function () {
        var inThen;

        return MultiSigWallet.deployed().then(function (instance) {
            metaMultisig = instance;
            return metaMultisig.submitTransaction(metaMultisig.address, 0, "0x7065cb48000000000000000000000000invalidaddress", { from: account_one, gas: 3000000 });
        }).catch(function () {
            if (inThen) {
                assert.ok(false, "should have failed directly");
            } else {
                assert.ok(true, "Failed because not a valid address");
            }
        });
    });


});    