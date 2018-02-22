
var Identify = artifacts.require('./token/Identify.sol');
var Vault = artifacts.require('./vault/Vault.sol');

module.exports = function(deployer, network) {
  deployer.deploy(Identify, Vault.address).then(function(){
    return Vault.deployed().then(function(instance){
      return instance.setIdentify(Identify.address);
    })
  });
}