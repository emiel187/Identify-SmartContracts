
var Identify = artifacts.require('./token/Identify.sol');

module.exports = function(deployer, network) {
  deployer.deploy(Identify);

}