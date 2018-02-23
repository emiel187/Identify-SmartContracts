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
// test approve / allow

it("Should approve succesfull tokens and let the approver spend them", function() {
    

    return Identify.deployed().then(function(instance) {
        meta = instance;
        // account_two has 10000000000 tokens, account_empty 0
        return meta.approve(account_empty,200,{from: account_two}); 
    }).then(function(){
        return meta.transferFrom(account_two,account_one, 100,{from: account_empty});
    }).then(function(){
        return meta.balanceOf(account_one);
    }).then(function(balance){
        return assert.equal(balance.toNumber(),account_one_start_balance + 100, "Should added 100 to account_one");
    }).then(function(){
        return meta.balanceOf(account_two);
    }).then(function(balance){
        return assert.equal(balance.toNumber(),account_two_start_balance - 100, "Should substracted 100 of account_two");
    })
    ;
});

it("Should not spend more than approved", function() {
    var inThen = false;

    return Identify.deployed().then(function(instance) {
        meta = instance;
        // account_empty still has 100 to spend
        return meta.transferFrom(account_two,account_one, 101,{from: account_empty});
    }).then(function(){
        inThen = true;
        assert.ok(false,"Should fail")
    }).catch(function(err){
        if(inThen){
            assert.ok(false,"Should have failed because cannot spend more than approved");
        }else{
            assert.ok(true,"Failed successfull");
        }
    }).then(function(){
        // transfer remaining 100
        return meta.transferFrom(account_two,account_one, 100,{from: account_empty});        
    }).then(function(){
        return meta.balanceOf(account_one);
    }).then(function(balance){
        return assert.equal(balance.toNumber(),account_one_start_balance + 100, "Should added 100 to account_one");
    }).then(function(){
        return meta.balanceOf(account_two);
    }).then(function(balance){
        return assert.equal(balance.toNumber(),account_two_start_balance - 100, "Should substracted 100 of account_two");
    })
    ;
});

// test already approved to increase approval

it("Should fail when overwriting approval", function() {
    var inThen = false;

    return Identify.deployed().then(function(instance) {
        meta = instance;
        return meta.approve(account_empty,200,{from: account_two}); 
    }).then(function(){
        return meta.approve(account_empty,200,{from: account_two}); 
    }).then(function(){
        inThen = true;
        assert.ok(false,"Should fail")
    }).catch(function(err){
        if(inThen){
            assert.ok(false,"Should have failed because already an approved amount");
        }else{
            assert.ok(true,"Failed successfull");
        }
    })
    ;
});

it("Should increase correclty", function() {
    var inThen = false;

    return Identify.deployed().then(function(instance) {
        meta = instance;
        // already has 200 approved from function above
        return meta.increaseApproval(account_empty,100,{from: account_two}); 
    }).then(function(){
        return meta.transferFrom(account_two,account_one, 300,{from: account_empty});        
    }).then(function(){
        return meta.balanceOf(account_one);
    }).then(function(balance){
        return assert.equal(balance.toNumber(),account_one_start_balance + 300, "Should added 300 to account_one");
    }).then(function(){
        return meta.balanceOf(account_two);
    }).then(function(balance){
        return assert.equal(balance.toNumber(),account_two_start_balance - 300, "Should substracted 300 of account_two");
    })
    ;
});

it("Should decrease correclty", function() {
    var inThen = false;

    return Identify.deployed().then(function(instance) {
        meta = instance;
        return meta.approve(account_empty,200,{from: account_two}); 
    }).then(function(){
        return meta.decreaseApproval(account_empty,100,{from: account_two}); 
    }).then(function(){
        return meta.allowance.call(account_two,account_empty);
    }).then(function(spendAmount){
        return assert.equal(spendAmount.toNumber(),100, "Should decreased to 100");
    })
    ;
});

it("Should use the approveandcall method", function() {

    return Identify.deployed().then(function(instance) {
        meta = instance;
        return meta.approveAndCall(account_one, 150, "extradata",{from: account_two}); 
    }).then(function(){
        return meta.allowance.call(account_two,account_one);
    }).then(function(spendAmount){
        return assert.equal(spendAmount.toNumber(),150, "Should be 150");
    })
    ;
});

it("Should fail when already approved through approveandcall method", function() {
    var inThen = false;

    return Identify.deployed().then(function(instance) {
        meta = instance;
        return meta.approveAndCall(account_one, 150, "extradata",{from: account_two}); 
    }).then(function(){
        inThen = true;
        assert.ok(false,"Should fail")
    }).catch(function(err){
        if(inThen){
            assert.ok(false,"Should have failed because already an approved amount");
        }else{
            assert.ok(true,"Failed successfull");
        }
    })
    ;
});


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