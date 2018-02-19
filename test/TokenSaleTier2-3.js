// Tests are tested with TestRPC.
// @author Kevin Leyssens - <kevin.leyssens@theledger.be>

var sha256 = require('js-sha256');

var TokenSale = artifacts.require("TokenSale");
var Platinium = artifacts.require("Platinium");
var MultiSigWallet = artifacts.require("MultiSigWallet");
var Whitelist = artifacts.require("Whitelist");
var MultiSigEscrow = artifacts.require("MultiSigEscrow");

contract('TokenSaleTier2-3', function(accounts) {
  var metaTokenSale;

  var account_one = accounts[0];
  var account_two = accounts[1];
  var account_empty = accounts[4];

  before(async function(){
      metaPlatinium = await Platinium.deployed();
      metaWhitelist = await Whitelist.deployed();
      // Phases contract is owner of whitelist. 
      // For testing purpose we will make accounts[0] the owner
      // This is done through multisig escrow
      await MultiSigEscrow.deployed().then(function(instance) {
        metaEscrow = instance;
        // invoke function transferOwnershipWhitelist -> 9481c83c to account 0
        var to_account = accounts[0].substring(2,(accounts[0].length));
        var function_data = "0x9481c83c";
        var data = function_data + "000000000000000000000000" + to_account;
        return metaEscrow.submitTransaction(metaEscrow.address,0,data, {from: accounts[0], gas: 3000000});
    }).then(function(){
        // confirm transaction
        return metaEscrow.confirmTransaction(0, {from: accounts[1], gas: 3000000});                                    
    })
  });


// TODO: Test other tiers and bonusses -> create 1000 hashes and add whitelist
it("Should be another amount of tokens in Tier 2", function() {
  var count;
  var allHashes = [];

  return TokenSale.deployed().then(function(instance){
    metaTokenSale = instance;

    //create 1000 unique sha's and input them in an array
    // TODO: create 2 dim array and send per 5
    for(i = 0; i<200; i++) {
      const row = [];
      for(j=0;j<5;j++){
      msgToHash = `Message to hash`+j+i;
      sha256(msgToHash);
      var after = sha256.create().update(msgToHash).hex();
      let text = `0x${after}`;
      row.push(text);
      }
      allHashes[i] = row;
    }

    return Promise.all(allHashes.map(e=>{
      return metaWhitelist.addMultipleToWhitelist(e, {from: accounts[0], gas: 3000000});
      // return metaWhitelist.add5ToWhitelist(e[0],e[1],e[2],e[3],e[4]);
    }));
  }).then(function(){
    return metaWhitelist.count_whitelist.call();
  }).then(function(_count){
    count = _count.toNumber();
    assert.equal(count,1000, "Should be 1000");
  }).then(function(){
    return metaWhitelist.getTier(accounts[7]);
  }).then(function(tier){
    if(tier.toNumber() === 0){
      return metaWhitelist.addToWhitelist(accounts[7]);        
    } else {
      assert.ok(false,"Should not be in the whitelist");
    }
  }).then(function(){
    return metaTokenSale.buyTokens(accounts[7],{from: accounts[7], gas: 3000000, value: 1000000000000000000});             
  }).then(function(){
    return metaPlatinium.balanceOf(accounts[7]);
  }).then(function(amount){
    assert.equal(amount.toNumber(),"63000000000000000000", "Should be 63000000000000000000 in Tier 2 for 1 ETH");
  })
});


it("Should be another amount of tokens in Tier 3", function() {
  return TokenSale.deployed().then(function(instance){
    metaTokenSale = instance;
    return metaWhitelist.getTier(account_one);
  }).then(function(tier){
    if(tier.toNumber() === 0){
      return metaWhitelist.addToWhitelist(account_one);
    }else{
      return true;
    }
  }).then(function(){
    return metaWhitelist.changeTier(account_one,3);
  }).then(function(){
    return metaTokenSale.buyTokens(account_one,{from: account_one, gas: 3000000, value: 1000000000000000000});             
  }).then(function(){
    return metaPlatinium.balanceOf(account_one);
  }).then(function(amount){
    assert.equal(amount.toNumber(),"54000000000000000000", "Should be 54000000000000000000 in Tier 3 for 1 ETH");
  });
});

// TODO: Test when list full, no more subscribers

});
