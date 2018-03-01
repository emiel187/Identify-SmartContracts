// Tests are tested with TestRPC.
// @author Kevin Leyssens - <kevin.leyssens@theledger.be>

var Identify = artifacts.require("Identify");
var MultiSigWallet = artifacts.require("MultiSigWallet");
var Presale = artifacts.require("Presale");
var Whitelist = artifacts.require("Whitelist");


contract('Presale', function (accounts) {
    var metaMultiSig;
    var metaIdentify;
    var metaPresale;
    var metaPresaleV2;

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
            4565000, 1, 10).then(
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
            return metaPresale.sendTransaction({ from: account_two, gas: 3000000, value: web3.toWei('25', 'ether') });
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

    it('Should be able to buy correct amount of tokens if in whitesale', function () {

        return Presale.deployed().then(function (instance) {
            metaPresale = instance;
            return metaWhitelist.addParticipant(account_one, { from: account_one, gas: 3000000});
        }).then(function () {   
            return metaWhitelist.isParticipant(account_one);
        }).then(function (isParticipant) {
            assert.equal(isParticipant, true, "First account should be added as a participant");
            return metaPresale.sendTransaction({ from: account_one, gas: 3000000, value: web3.toWei('25', 'ether') });
        }).then(function () {
            return metaIdentify.balanceOf(account_one);
        }).then(function (balance) {
            return assert.equal(balance.toNumber(), "13125000000000", "Should have 13125000000000 tokens in his account");
        });
    });


    it('Should have 25 ETH in the wallet after a valid purchase of 25 ETH', function () {

        return MultiSigWallet.deployed().then(function (instance) {
            metaMultiSig = instance;
            return web3.eth.getBalance(metaMultiSig.address);
        }).then(function (balance) {
            return assert.equal(balance.toNumber(), web3.toWei('25', 'ether'), "Should have 25 ETH in the wallet");
        });
    });

    it('Should not buy tokens when paused', function () {
        var inThen = false;

        return Presale.deployed().then(function (instance) {
            metaPresale = instance;
            return metaPresale.pausePresale();
        }).then(function (balance) {
            return metaPresale.sendTransaction({ from: account_one, gas: 3000000, value: web3.toWei('25', 'ether') });
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



    // test claimTokens

    // test minimum wei from sender
    it('Should not buy tokens when not enough wei', function () {
        var inThen = false;

        return metaPresaleV2.sendTransaction({ from: account_one, gas: 3000000, value: 5 }).then(function(){
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

    // test maximum wei from sender
    it('Should not buy tokens when to much wei', function () {
        var inThen = false;

        return metaPresaleV2.sendTransaction({ from: account_one, gas: 3000000, value: web3.toWei('11', 'ether')}).then(function(){
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

    // test maximum cap of tokens

    // test maximum cap op wei
    it('Should buy tokens to setup for further tests', function () {
        
       
        return metaWhitelist.addParticipant(accounts[9], { from: account_one, gas: 3000000}).then(function () {   
            return metaWhitelist.isParticipant(accounts[9]);
        }).then(function (isParticipant) {
            assert.equal(isParticipant, true, "Account should be added as a participant");
            return metaPresaleV2.sendTransaction({ from: accounts[9], gas: 3000000, value: web3.toWei('10', 'ether') });
        })/*.then(function () {
            return metaIdentify.balanceOf(accounts[9]);
        }).then(function (balance) {
            console.log(balance.toNumber());
            return assert.equal(balance.toNumber(), "5250000000000", "Should have 5250000000000 tokens in his account");
        })*/
    });

    // test iscontract function

    // test valid purchase (start and endtime)






});