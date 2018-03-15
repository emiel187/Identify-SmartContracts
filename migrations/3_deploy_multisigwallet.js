var Multisig = artifacts.require('./vault/MultiSigWallet.sol');
var Identify = artifacts.require('./token/Identify.sol');

module.exports = function(deployer, network) {
  deployer.deploy(Multisig, [ web3.eth.accounts[0], web3.eth.accounts[1], web3.eth.accounts[2]], 2, Identify.address);

}