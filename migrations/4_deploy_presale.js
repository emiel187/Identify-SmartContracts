
var Multisig = artifacts.require('./vault/MultiSigWallet.sol');
var Presale = artifacts.require('./crowdsale/Presale.sol');
var Identify = artifacts.require('./token/Identify.sol');

module.exports = function(deployer, network) {

    if(network == 'local'){
        // network local
        deployer.deploy(Presale, 
            Math.round((Date.now()/1000)+ 100), // start
            Math.round((Date.now()/1000)+ 10000), //end
            Multisig.address, // wallet
            Identify.address).then(function(){
                return Identify.deployed().then(function(instance){
                    return instance.transferOwnership(Presale.address);
                })
            })
    } else {
        //testrpc
        deployer.deploy(Presale, 
            Math.round((Date.now()/1000)), // start
            Math.round((Date.now()/1000)+ 10000), //end
            Multisig.address, // wallet
            Identify.address).then(function(){
                return Identify.deployed().then(function(instance){
                    return instance.transferOwnership(Presale.address);
                })
            })
    }


}