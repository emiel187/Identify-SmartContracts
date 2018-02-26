// Tests are tested with TestRPC.
// @author Kevin Leyssens - <kevin.leyssens@theledger.be>

var Identify = artifacts.require("Identify");
var MultiSigWallet = artifacts.require("MultiSigWallet");
var Presale = artifacts.require("Presale");


contract('TokenSale', function (accounts) {
    var metaMultiSig;
    var metaIdentify;
    var metaPresale;

    var account_one = accounts[0];
    var account_two = accounts[1];
    var account_empty = accounts[2];



    before(async function () {
        metaMultiSig = await MultiSigWallet.deployed();
        metaIdentify = await Identify.deployed();
        metaPresale = await Presale.deployed();
    });


    it('Should be able to use the constructor', function (done) {
        var starttime = Math.round((Date.now() / 1000) + 300)
        Presale.new(starttime, "0x20c721b0262bd9341c0a7ec685768cb3d33eadfb", "0x20c721b0262bd9341c0a7ec685768cb3d33eadfb", 8695,
            4565000000, 25, 1000).then(
            function (tokensale) {
                tokensale.startTime.call().then(
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


    it('Should buy correct amount of tokens', function () {

        return Presale.deployed().then(function (instance) {
            metaPresale = instance;
            return metaPresale.sendTransaction({ from: account_two, gas: 3000000, value: web3.toWei('25', 'ether') });
        }).then(function () {
            return metaIdentify.balanceOf(account_two);
        }).then(function (balance) {
            assert.equal(balance.toNumber(), "13125000000000", "Should have 13125000000000 tokens in his account");
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

    /*it('Should not buy tokens when paused', function () {

        return Presale.deployed().then(function (instance) {
            metaPresale = instance;
            return metaPresale.pausePresale();
        }).then(function (balance) {
            return assert.equal(balance.toNumber(), web3.toWei('25', 'ether'), "Should have 25 ETH in the wallet");
        });
    });*/

    // test pause function

    // test claimTokens

    // test minimum wei from sender

    // test maximum wei from sender

    // test maximum cap of tokens

    // test maximum cap op wei

    // test iscontract function

    // test valid purchase (start and endtime)

    // test in whitelist






});