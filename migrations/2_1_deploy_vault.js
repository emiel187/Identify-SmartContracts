
var Vault = artifacts.require('./vault/Vault.sol');

module.exports = function(deployer, network) {
  deployer.deploy(Vault);
}