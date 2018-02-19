// Tests are tested with TestRPC.
// @author Kevin Leyssens - <kevin.leyssens@theledger.be>
// When testing on own network instead of truffles -> unlock accounts 0,1 and 4

var TokenSale = artifacts.require("TokenSale");
var Platinium = artifacts.require("Platinium");

contract('Platinium', function(accounts) {

    var account_one = accounts[0];
    var account_two = accounts[1];
    var account_empty = accounts[4];

    var account_one_start_balance;
    var account_two_start_balance;
    var account_empty_start_balance;

    var totalsupply_start;

    var meta;

    before(function() {
        try{
            // make accounts[0] owner of platinium token contract. Not the tokensale contract anymore
            var meta;
            return TokenSale.deployed().then(function(instance){
                meta = instance;
                return meta.transferOwnershipToken(accounts[0]);
            });
        } catch(err) {
            console.log('Already owner of tokensaleContract. Just continue the testing.' + err);
            return true;
        }
        
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


   it('Should be able to use the constructor', function(done) {

      Platinium.new("PlatiniumToken", "PLAM", 18).then(
         function(platinium) {
            platinium.name.call().then(
               function(name) {
                  assert.equal(name, "PlatiniumToken", "The name is not correct");
                  done();
               }).catch(done);
         }).catch(done);
   });

   it("Should mint and transfer tokens correctly and update totalsupply", function() {

    return Platinium.deployed().then(function(instance) {
      meta = instance;
      return meta.mint(account_one,20000000000);        
    }).then(function(){
        return meta.balanceOf(account_one);         
    })
    .then(function(balance){
        // Should have been minted to account number 1
        assert.equal(balance.toNumber(),account_one_start_balance + 20000000000,"Balance should be  startingbalance + 20000000000");
        return meta.totalSupply.call();
    }).then(function(totalSupply){
        assert.equal(totalSupply.toNumber(),totalsupply_start + 20000000000, "Totalsupply should be starting supply + 20000000000");
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
    
    return Platinium.deployed().then(function(instance) {
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


it("Should not mint tokens if not owner of contract", function() {
    var inThen = false;
    
    return Platinium.deployed().then(function(instance) {
        meta = instance;
        // mint 10000000000 so the totalsupply will be 10000000000 or higher
        return meta.mint(account_one,10000000000,{from: account_empty, gas: 3000000}); 
    }).then(function(err){
        inThen = true;
        assert.ok(false,"should fail")
    }).catch(function(err){
        if(inThen){
            assert.ok(false,"Should have failed because only owner of contract can invoke mint tokens");
        }else{
            assert.ok(true,"Failed successfull");
        }
    });
});

it("Should throw error when insufficient amount", function() {
    var inThen = false;

    return Platinium.deployed().then(function(instance) {
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


it("Should throw error when enableTransfers is false", function() {
    var inThen = false;
    
    return Platinium.deployed().then(function(instance) {
        meta = instance;
        assert.equal(account_empty_start_balance,0,"Balance should be 0");
        if(account_one_start_balance<10000000000){
            meta.mint(account_one,10000000000);                    
        }
        return true;
    }).then(function(r){
        //disable transfers
        return meta.enableTransfers(false);
    }).then(function(r){
        return meta.transfer(account_two,10000000000,{from: account_one, gas: 3000000});        
    }).then(function(err){
        inThen = true;
        assert.ok(false,"should fail")
    }).catch(function(err){
        if(inThen){
            assert.ok(false,"Should have failed because transfer is disabled en should not have gone in the then function");
            meta.enableTransfers(true);            
        }else{
            assert.ok(true,"Failed successfull");
            meta.enableTransfers(true);
        }
    });
});

it("Should burn tokens and update the totalsupply of it", function() {
    return Platinium.deployed().then(function(instance) {
        meta = instance;
        // mint 10000000000 so the totalsupply will be 10000000000 or higher
        return meta.mint(account_one,10000000000); 
    }).then(function(){
        return meta.totalSupply.call();        
    })
    .then(function(totalSupply){
        assert.equal(totalSupply.toNumber(), totalsupply_start + 10000000000);
        return meta.burnTokens(account_one,10000000000);
    }).then(function(){
        return meta.totalSupply.call();        
    })
    .then(function(totalSupply){
        assert.equal(totalSupply.toNumber(), totalsupply_start, "Should have burned the added tokens");
    });
});    

it("Should not go over maximum amount", function() {
    var inThen;
    // maximum amount is 84000000000000000000000000
    return Platinium.deployed().then(function(instance) {
        meta = instance; 
        return meta.totalSupply.call();
    }).then(function(totalsupply){
        assert.equal(totalsupply.toNumber(),"20000000000", "Should be 20000000000");
    }).then(function(){
        return meta.mint(account_two,"83999999999999990000000000");
    }).then(function(){
        inThen = true;
        assert.ok(false,"Should fail")
    }).catch(function(err){
        if(inThen){
            assert.ok(false,"Should have failed because can not mint more than maximum tokens");
        }else{
            assert.ok(true,"Failed successfull");
        }
    })
    ;
});


it("Should not burn more tokens than owner has", function() {
    var inThen = false;
    
    return Platinium.deployed().then(function(instance) {
        meta = instance;
        return meta.burnTokens(account_one,account_one_start_balance + 100000);        
    }).then(function(err){
        inThen = true;
        assert.ok(false,"should fail")
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

    return Platinium.deployed().then(function(instance) {
        meta = instance; 
        return meta.mint(account_two,10000000000);         
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
    
    return Platinium.deployed().then(function(instance) {
        meta = instance;
        // mint 10000000000 so the totalsupply will be 10000000000 or higher
        return meta.mint(account_one,10000000000); 
    }).then(function(){
        return meta.totalSupply.call();        
    }).then(function(totalSupply){
        assert.equal(totalSupply.toNumber(), totalsupply_start + 10000000000);
        return meta.burnTokens(account_one,10000000000,{from: account_empty, gas: 3000000});
    }).then(function(err){
        inThen = true;
        assert.ok(false,"should fail")
    }).catch(function(err){
        if(inThen){
            assert.ok(false,"Should have failed because only owner of contract can invoke burntokens");
        }else{
            assert.ok(true,"Failed successfull");
        }
    });
});



it("Should not transfer ownership when not owner of contract", function() {
    var inThen = false;
    

    return Platinium.deployed().then(function(instance) {
        meta = instance;
        // return meta.owner.call()
        return meta.transferOwnership(account_two, {from: account_two, gas: 3000000}); 
    }).then(function(){
        inThen = true;
        assert.ok(false,"should fail")
    }).catch(function(err){
        if(inThen){
            assert.ok(false,"Should have failed because only owner of contract can invoke burntokens");
        }else{
            assert.ok(true,"Failed successfull");
        }
    })
    ;
});


it("Should transfer ownership when owner of contract", function() {
    var old_owner;

    return Platinium.deployed().then(function(instance) {
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