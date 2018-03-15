var Multisig = artifacts.require('./vault/MultiSigWallet.sol');
var Presale = artifacts.require('./crowdsale/Presale.sol');
var Identify = artifacts.require('./token/Identify.sol');
var Whitelist = artifacts.require('./crowdsale/Whitelist.sol');

module.exports = function (deployer, network) {

    if (network == 'local') {
        // network local
        deployer.deploy(Presale,
            Math.round((Date.now() / 1000) + 300), // start
            Multisig.address, // wallet
            Identify.address,
            Whitelist.address,
            8695, // CAP in ETH
            4565000000, // CAP in Tokens
            25, // minimum ETH
            1000 // maximum ETH
        ).then(function () {
            return Identify.deployed().then(function (instance) {
                return instance.transferOwnership(Presale.address);
            })
        })
    } else {
        //testrpc
        deployer.deploy(Presale,
            Math.round((Date.now() / 1000)), // start
            Multisig.address, // wallet
            Identify.address,
            Whitelist.address,
            8695, // CAP in ETH
            4565000000, // CAP in Tokens
            25, // minimum ETH
            1000 // maximum ETH
        ).then(function () {
            return Identify.deployed().then(function (instance) {
                return instance.transferOwnership(Presale.address);
            });
        })
    }


}