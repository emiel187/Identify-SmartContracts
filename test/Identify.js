// Tests are tested with TestRPC.
// @author Kevin Leyssens - <kevin.leyssens@theledger.be>
// When testing on own network instead of truffles -> unlock accounts 0,1 and 4

var Presale = artifacts.require("Presale");
var Identify = artifacts.require("Identify");

contract('Identify', function(accounts) {

    var account_one = accounts[0];
    var account_two = accounts[1];
    var account_empty = accounts[4];

    var account_one_start_balance;
    var account_two_start_balance;
    var account_empty_start_balance;

    var meta;

    var identifyAddress;

    before(function() {
        try{
            // make accounts[0] owner of Identify token contract. Not the presale contract anymore
            var meta;
            return Presale.deployed().then(function(instance){
                meta = instance;
                identifyAddress = Identify.address;
                return meta.transferOwnershipToken(accounts[0]);
            });
        } catch(err) {
            console.log('Already owner of contract. Just continue the testing.' + err);
            return true;
        }
        
    });

    beforeEach(function(){
        return Identify.deployed().then(function(instance) {
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
        });
    });


   it('Should be able to use the constructor', function(done) {

      Identify.new().then(
         function(Identify) {
            Identify.name.call().then(
               function(name) {
                  assert.equal(name, "IDENTIFY", "The name is not correct");
                  done();
               }).catch(done);
         }).catch(done);
   });

   it("Should transfer tokens correctly", function() {

    return Identify.deployed().then(function(instance) {
      meta = instance;
      return meta.transferFrom(identifyAddress,account_one,20000000000);        
    }).then(function(){
        return meta.balanceOf(account_one);         
    })
    .then(function(balance){
        // Should have transfered to account number 1
        assert.equal(balance.toNumber(),account_one_start_balance + 20000000000,"Balance should be  startingbalance + 20000000000");
        return meta.balanceOf(account_two);        
    }).then(function(balance){
        assert.equal(balance.toNumber(),account_two_start_balance,"Balance still should be start balance");
        return true;
    }).then(function(r){
        // transfer half to account 2
        return meta.transferFrom(account_one,account_two,10000000000);
    }).then(function(){
        return meta.balanceOf(account_one);        
    })
    .then(function(balance){
        assert.equal(balance.toNumber(),account_one_start_balance + (20000000000 - 10000000000),"Balance should be 10000000000 less than before");
        return true;
    }).then(function(r){
        //transfer from account 2 to account 1
        return meta.transfer(account_one,10000000000,{from: account_two, gas: 3000000});
    }).then(function(){
        return meta.balanceOf(account_two);        
    })
    .then(function(balance){
        assert.equal(balance.toNumber(),account_two_start_balance,"Balance should be  accounts 2 start balance");
    });
  });

  

it("Should fail when address for transfer is invalid", function() {
    var inThen = false;
    
    return Identify.deployed().then(function(instance) {
        meta = instance;
        return meta.balanceOf(account_one);        
    }).then(function(balance){
        assert.ok(balance.toNumber()>100, "Should have some amount of tokens");
    }).then(function(){
        // invalid address
        return meta.transfer("invalidaddress",100);
    }).then(function(err){
        inThen = true;
        assert.ok(false,"should fail")
    }).catch(function(err){
        if(inThen){
            assert.ok(false,"Should have failed because invalid address");
        }else{
            assert.ok(true,"Failed successfull");
        }
    })
    ;
});


it("Should not transferfrom tokens if not owner of contract", function() {
    var inThen = false;
    
    return Identify.deployed().then(function(instance) {
        meta = instance;
        // mint 10000000000 so the totalsupply will be 10000000000 or higher
        return meta.transferFrom(identifyAddress,account_one,10000000000,{from: account_empty, gas: 3000000}); 
    }).then(function(err){
        inThen = true;
        assert.ok(false,"Should fail")
    }).catch(function(err){
        if(inThen){
            assert.ok(false,"Should have failed because only owner of contract can invoke transferfrom");
        }else{
            assert.ok(true,"Failed successfull");
        }
    });
});

it("Should throw error when insufficient amount", function() {
    var inThen = false;

    return Identify.deployed().then(function(instance) {
        meta = instance;
        assert.equal(account_empty_start_balance,0,"Balance should be 0");
        // transfer from an empty account
        return meta.transfer(account_one,10000000000,{from: account_empty, gas: 3000000});
    }).then(function(r){
        //extra boolean to check
        inThen=true;
        assert.ok(false,"Should fail");
    }).catch(function(err){
        if(inThen){
            assert.ok(false,"Should have failed because account is empty");
        }else{
            assert.ok(true,"Failed successfull");
        }
    });
});


it("Should throw error when disable transfer is invoked by owner", function() {
    var inThen = false;
    
    return Identify.deployed().then(function(instance) {
        meta = instance;
        assert.equal(account_empty_start_balance,0,"Balance should be 0");
        return true;
    }).then(function(r){
        //disable transfers
        return meta.disableTransfer();
    }).then(function(r){
        return meta.transfer(account_two,10000000000,{from: account_one, gas: 3000000});        
    }).then(function(err){
        inThen = true;
        assert.ok(false,"Should fail")
    }).catch(function(err){
        if(inThen){
            assert.ok(false,"Should have failed because transfer is disabled en should not have gone in the then function");
            meta.enableTransfer();            
        }else{
            assert.ok(true,"Failed successfull");
            meta.enableTransfer();
        }
    });
});

it("Should burn tokens and update the totalsupply of it", function() {
    return Identify.deployed().then(function(instance) {
        meta = instance;
        return meta.totalSupply.call();        
    }).then(function(totalSupply){
        assert.equal(totalSupply.toNumber(), "49253333333000000");
        return meta.burn(account_one,10000000000);
    }).then(function(){
        return meta.totalSupply.call();        
    })
    .then(function(totalSupply){
        return assert.equal(totalSupply.toNumber(), "49253323333000000", "Should have burned 10000000000 tokens");
    });
});    


it("Should not burn more tokens than owner has", function() {
    var inThen = false;
    
    return Identify.deployed().then(function(instance) {
        meta = instance;
        return meta.burn(account_one,account_one_start_balance + 1);        
    }).then(function(err){
        inThen = true;
        assert.ok(false,"Should fail")
    }).catch(function(err){
        if(inThen){
            assert.ok(false,"Should have failed because owner doesn't have that many tokens");
        }else{
            assert.ok(true,"Failed successfull");
        }
    });
});  



it("Should only transferfrom from other accounts when owner", function() {
    var inThen;

    return Identify.deployed().then(function(instance) {
        meta = instance; 
        return meta.transferFrom(identifyAddress, account_two, 10000000000);         
    }).then(function(){
        return meta.transferFrom(account_two, account_empty,10000000000,{from:account_two, gas: 3000000});
    }).then(function(){
        inThen = true;
        assert.ok(false,"Should fail")
    }).catch(function(err){
        if(inThen){
            assert.ok(false,"Should have failed because not owner of contract");
        }else{
            assert.ok(true,"Failed successfull");
        }
    })
    ;
});

it("Should not burn tokens if not owner of contract", function() {
    var inThen = false;
    
    return Identify.deployed().then(function(instance) {
        meta = instance;
        return meta.transferFrom(identifyAddress, account_one,10000000000); 
    }).then(function(){
        return meta.burn(account_one,10000000000,{from: account_empty, gas: 3000000});
    }).then(function(err){
        inThen = true;
        assert.ok(false,"Should fail")
    }).catch(function(err){
        if(inThen){
            assert.ok(false,"Should have failed because only owner of contract can invoke burn");
        }else{
            assert.ok(true,"Failed successfull");
        }
    });
});


it("Should not transfer ownership when not owner of contract", function() {
    var inThen = false;
    

    return Identify.deployed().then(function(instance) {
        meta = instance;
        // return meta.owner.call()
        return meta.transferOwnership(account_two, {from: account_two, gas: 3000000}); 
    }).then(function(){
        inThen = true;
        assert.ok(false,"Should fail")
    }).catch(function(err){
        if(inThen){
            assert.ok(false,"Should have failed because only owner of contract can invoke transfer of ownership");
        }else{
            assert.ok(true,"Failed successfull");
        }
    })
    ;
});
// test approve

// test approve and call

it("Should transfer ownership when owner of contract", function() {
    var old_owner;

    return Identify.deployed().then(function(instance) {
        meta = instance;
        return meta.owner.call()
    }).then(function(owner){
        old_owner = owner;
        return meta.transferOwnership(account_empty, {from: account_one, gas: 3000000}); 
    }).then(function(){
        return meta.owner.call()
    }).then(function(owner){
        assert.ok(owner != old_owner);
        assert.ok(owner === account_empty);
    })
    ;
});


});