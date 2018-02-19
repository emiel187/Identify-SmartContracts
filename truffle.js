module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
      gas: 3000000,
      gasPrice: 5000000000 // in wei -> 5GWEI      
    },
    testing: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
      gas: 4712388,
      gasPrice: 5000000000 // in wei -> 5GWEI  
    }
  },
};
