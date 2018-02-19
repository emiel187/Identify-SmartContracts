// Tests are tested with TestRPC.
// @author Kevin Leyssens - <kevin.leyssens@theledger.be>

var sha256 = require('js-sha256');

var TokenSale = artifacts.require("TokenSale");
var Platinium = artifacts.require("Platinium");
var MultiSigWallet = artifacts.require("MultiSigWallet");
var Whitelist = artifacts.require("Whitelist");
var Test = artifacts.require("Test");
var MultiSigEscrow = artifacts.require("MultiSigEscrow");


contract('TokenSale', function(accounts) {
  var metaPlatinium;
  var metaMultiSig;
  var metaEscrow;
  var metaTokenSale;
  var metaTest;

  var account_one = accounts[2];
  var account_two = accounts[3];
  var account_empty = accounts[6];

  var account_one_start_balance;
  var account_two_start_balance;
  var account_empty_start_balance;

  var totalsupply_start;

  var tokensRaised;

  const rate = 36;

  before(async function(){
    metaPlatinium = await Platinium.deployed();
    metaMultiSig = await MultiSigWallet.deployed();
    metaWhitelist = await Whitelist.deployed();
    metaTest = await Test.deployed();
    metaEscrow = await MultiSigEscrow.deployed();
  });


  beforeEach(function(){
    return Platinium.deployed().then(function(instance) {
        meta = instance;
        return meta.balanceOf(account_one);
    }).then(function(balance){
        account_one_start_balance = balance.toNumber();
        return meta.balanceOf(account_two);
    }).then(function(balance){
        account_two_start_balance = balance.toNumber();
        return meta.balanceOf(account_empty);
    }).then(function(balance){
        account_empty_start_balance = balance.toNumber();
        return meta.totalSupply.call();
    }).then(function(totalSupply){
        totalsupply_start = totalSupply.toNumber();
    });
  });

  beforeEach(function(){
    return TokenSale.deployed().then(function(instance){
      return instance.tokensRaised.call();
    }).then(function(tokensRaised){
      tokensRaised = tokensRaised;
    })
  });


   it('Should be able to use the constructor', function(done) {
    var starttime = Math.round((Date.now()/1000)+300)
      TokenSale.new(starttime, 36, "1080000000000000000000000", "0x20c721b0262bd9341c0a7ec685768cb3d33eadfb", "0x20c721b0262bd9341c0a7ec685768cb3d33eadfb","0x20c721b0262bd9341c0a7ec685768cb3d33eadfb","0x20c721b0262bd9341c0a7ec685768cb3d33eadfb").then(
         function(tokensale) {
            tokensale.startTime.call().then(
               function(startTime) {
                  assert.equal(startTime.toNumber(), starttime, "The startTime is not correct");
                  done();
               }).catch(done);
         }).catch(done);
   });

   it('Should throw error when invoking function from smart contract', function() {
    var inThen=false;

    return Test.deployed().then(function(instance){
        metaTest = instance;
        return metaTest.sendTransaction({from: account_one, gas: 3000000, value: 1000000000000000000}); 
      }).then(function(){
        return web3.eth.getBalance(metaTest.address);
      })
      .then(function(balance) {
        return metaTest.buyTokensThroughTransfer();
      })
      .then(function(){
        inThen = true;
        assert.ok(false,"Should have failed, is a contract")
      }).catch(function(err){
        if (inThen) {
          assert.ok(false, "should have failed directly");
        } else {
          assert.ok(true, "Failed because not in whitelist");
        }
      })
      ;
   });  

   it('Should throw error when not in whitelist and tries to buy tokens', function() {
    var inThen=false;

    return TokenSale.deployed().then(function(instance){
        metaTokenSale = instance;
        return metaTokenSale.buyTokens(account_one,{from: account_one,gas:3000000, value: 1});
      }).then(function(){
        inThen = true;
        assert.ok(false,"Should have failed, not in whitelist")
      }).catch(function(err){
        if (inThen) {
          assert.ok(false, "should have failed directly");
        } else {
          assert.ok(true, "Failed because not in whitelist");
        }
      });
   });    
   

   it('Add in whitelist and then purchase tokens through fallback function + check right amount of tokens + check raised correctly tokensale + check platinium raised correctly', function() {

    return TokenSale.deployed().then(function(instance){
        metaTokenSale = instance;
        return metaWhitelist.getTier(account_one)
      }).then(function(tier){
        if(tier.toNumber() === 0){
          assert.ok(true, "Should not yet be in whitelist")
        } else {
          assert.ok(false, "Should not yet be in whitelist")
        }
        return metaWhitelist.addToWhitelist(account_one);
      }).then(function(){
        return metaWhitelist.getTier(account_one)
      }).then(function(tier) {
        if(tier.toNumber() != 0){
          assert.ok(true, "Should be in whitelist")
        } else {
          assert.ok(false, "Should be in whitelist")          
        }
        return metaTokenSale.sendTransaction({from: account_one, gas: 3000000, value: 1000000000000000000}); 
      }).then(function(){
        return metaPlatinium.balanceOf(account_one);
      }).then(function(balance){
        // rate + 100% bonus + 10% bonus first hour, multiplied by 10^18 because there are 18 digets
        assert.equal(balance.toNumber(),"72000000000000000000", "Should be the same amount");
        return metaTokenSale.tokensRaised.call();
      }).then(function(raised){
        assert.equal(raised.toNumber(),"72000000000000000000", "Should be 72000000000000000000");
        return metaPlatinium.totalSupply.call();
      }).then(function(totalsupply){
        assert.equal(totalsupply.toNumber(),"72000000000000000000", "Should be 72000000000000000000");        
      }).catch(function(err){
        assert.ok(false,"Should not fail here, but probably something with the truffle value parameter... \n" + err);
      })
      ;
   });


   it('Purchase tokens through buyTokens function + check right amount of tokens + check raised correctly tokensale + check platinium raised correctly', function() {

    return TokenSale.deployed().then(function(instance){
        metaTokenSale = instance;
        return metaWhitelist.getTier(account_one)
      }).then(function(tier) {
        if(tier.toNumber()!=0){
          assert.ok(true, "Should be in whitelist")
        } else {
          assert.ok(false, "Should be in whitelist")          
        }
        return metaTokenSale.buyTokens(account_one,{from: account_one, gas: 3000000, value: 1000000000000000000}); 
      }).then(function(){
        return metaPlatinium.balanceOf(account_one);
      }).then(function(balance){
        // rate + 100% bonus first hour, multiplied by 10^18 because there are 18 digets
        assert.equal(balance.toNumber(),"144000000000000000000", "Should be the same amount");
        return metaTokenSale.tokensRaised.call();
      }).then(function(raised){
        assert.equal(raised.toNumber(),"144000000000000000000", "Should be 144000000000000000000");
        return metaPlatinium.totalSupply.call();
      }).then(function(totalsupply){
        assert.equal(totalsupply.toNumber(),"144000000000000000000", "Should be 144000000000000000000");        
      }).catch(function(err){
        assert.ok(false,"Should not fail here, but probably something with the truffle value parameter... \n" + err);
      })
      ;
   });

// should fail if it is under 1 eth or above 20 eth
it('Should fail when sending more than 20 ETH', function() {
  var inThen=false;  

  return TokenSale.deployed().then(function(instance){
      metaTokenSale = instance;
      return metaWhitelist.getTier(account_one)
    }).then(function(tier) {
      if(tier.toNumber()!=0){
        assert.ok(true, "Should be in whitelist")
      } else {
        assert.ok(false, "Should be in whitelist")          
      }
      return metaTokenSale.buyTokens(account_one,{from: account_one, gas: 3000000, value: 21000000000000000000}); 
    }).then(function(){
      inThen = true;
      assert.ok(false, "Should failed cause send more than 20 ETH");
    }).catch(function(err){
      if (inThen) {
        assert.ok(false, "should have failed directly");
      } else {
        assert.ok(true, "Failed because send more than 20 ETH");
      }
    });
 });

 it('Should fail when sending 0 ETH', function() {
  var inThen=false;  

  return TokenSale.deployed().then(function(instance){
      metaTokenSale = instance;
      return metaWhitelist.getTier(account_one)
    }).then(function(tier) {
      if(tier.toNumber()!=0){
        assert.ok(true, "Should be in whitelist")
      } else {
        assert.ok(false, "Should be in whitelist")          
      }
      return metaTokenSale.buyTokens(account_one,{from: account_one, gas: 3000000, value: 0}); 
    }).then(function(){
      inThen = true;
      assert.ok(false, "Should failed cause send 0 ETH");
    }).catch(function(err){
      if (inThen) {
        assert.ok(false, "should have failed directly");
      } else {
        assert.ok(true, "Failed because send 0 ETH");
      }
    });
 });

 it('Should transfer funds to multisig account', function() {
  var multisig_start;

  return TokenSale.deployed().then(function(instance){
    metaTokenSale = instance;
    return web3.eth.getBalance(metaMultiSig.address);
  }).then(function(balance){
    multisig_start = balance.toNumber();
    return metaTokenSale.buyTokens(account_one,{from: account_one, gas: 3000000, value: 1000000000000000000});     
  }).then(function(){
    return web3.eth.getBalance(metaMultiSig.address);
  }).then(function(balance){
    assert.ok(balance.toNumber()>multisig_start, "Should have send the ETH amount to the multisig");
  })
 });

 it('Should not buy when tokensale is paused', function() {
  var inThen = false;

  return TokenSale.deployed().then(function(instance){
    metaTokenSale = instance;
    return metaTokenSale.pauseTokenSale();
  }).then(function(){
    return metaTokenSale.buyTokens(account_one,{from: account_one, gas: 3000000, value: 1000000000000000000});         
  }).then(function(){
    inThen = true;
    assert.ok(false, "should have failed");
  }).catch(function(){
    if (inThen) {
      assert.ok(false, "should have failed directly");
    } else {
      assert.ok(true, "Failed because sale is paused");
      return metaTokenSale.resumeTokenSale();      
    }
  })

 });  

 //only owner can pause

 it('Should fail because only owner can pause', function() {
  var inThen = false;

  return TokenSale.deployed().then(function(instance){
    metaTokenSale = instance;
    return metaTokenSale.pauseTokenSale({from: account_two, gas: 3000000});
  }).then(function(){
    inThen = true;
    assert.ok(false, "should have failed");
  }).catch(function(){
    if (inThen) {
      assert.ok(false, "should have failed directly");
      return metaTokenSale.resumeTokenSale();      
    } else {
      assert.ok(true, "Failed because sale is paused");
    }
  })
 });


 // TODO: Should not buy more than cap -> 8 ETH is the cap, buy 5 with account_one and 3-4 with account_two
 it('Should not buy more than cap', function() {
  var spent_account_one;
  var failedCorrect = false;
  var cap = "576000000000000000000";

  return TokenSale.deployed().then(function(instance){
    metaTokenSale = instance;
    return metaTokenSale.spentPhaseOne(account_one);
  }).then(function(spent){
    spent_account_one = spent.toNumber();
    return (web3.toWei(5, "ether")-spent_account_one);
  }).then(function(over){
    return metaTokenSale.buyTokens(account_one,{from: account_one, gas: 3000000, value: over});         
  }).then(function(){
    return metaWhitelist.getTier(account_two);
  }).then(function(tier){
    if(tier.toNumber() === 0){
      return metaWhitelist.addToWhitelist(account_two);      
    }
    return true;
  }).then(function(){
    return metaTokenSale.buyTokens(account_two,{from: account_two, gas: 3000000, value: 3000000000000000000});             
  }).then(function(){
    return metaTokenSale.tokensRaised.call();
  }).then(function(raised){
    assert.equal(raised.toNumber(),cap,"Should have fullfilled the amount");
  }).then(function(){
    //maxcap should be reached by now, so buying another one should fail
    failedCorrect = true;
    return metaTokenSale.buyTokens(account_two,{from: account_two, gas: 3000000, value: 1000000000000000000});                 
  }).catch(function(err){
    if(failedCorrect){
      assert.ok(true, "Failed because bought extra when cap was reached")
    } else {
      assert.ok(false, "Failed for another reason")      
    }
  })
 });  


 it('Should fail because only owner can finalize', function() {
  var inThen = false;

  return TokenSale.deployed().then(function(instance){
    metaTokenSale = instance;
    return metaTokenSale.finalize({from: account_two, gas: 3000000});
  }).then(function(){
    inThen = true;
    assert.ok(false, "should have failed");
  }).catch(function(){
    if (inThen) {
      assert.ok(false, "should have failed directly");
      return metaTokenSale.resumeTokenSale();      
    } else {
      assert.ok(true, "Failed because not owner");
    }
  })
 });

 // Finalize the sale and check if right amount is given to the vault
 it('Should send right amount to escrow and wallet vault when finalized', function() {

  return TokenSale.deployed().then(function(instance){
    metaTokenSale = instance;
    return metaTokenSale.finalize();
  }).then(function(){
    return metaTokenSale.isFinalized.call();
  }).then(function(isFinalized){
    if(isFinalized){
      assert.ok(true, "Should be true");
    }else {
      assert.ok(false, "Should be true");
    }
  }).catch(function(err){
    assert.ok(false,"Should not fail here");
  }).then(function(){
    return metaPlatinium.balanceOf(metaEscrow.address);
  }).then(function(amount){
    assert.equal(amount.toNumber(), "67200000000000000000000000", "Should be 67200000000000000000000000");
  }).then(function(){
    return metaPlatinium.balanceOf(metaMultiSig.address);
  }).then(function(amount){
    assert.equal(amount.toNumber(), "6720000000000000000000000", "Should be 6720000000000000000000000");
  }).then(function(){
    return metaTokenSale.hasEnded();
  }).then(function(ended){
    if(ended){
      assert.ok(true, "Has ended succesfull");
    } else {
      assert.ok(false, "Should be true when ended");
    }
  });
 });


 

});