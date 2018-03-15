module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
      gas: 4600000,
      gasPrice: 5000000000 // in wei -> 5GWEI      
    },
    testing: {
      host: 'localhost',
      port: 8545,
      network_id: '5777',
      gas: 3000000,
      gasPrice: 5000000000 // in wei -> 5GWEI  
    },
    local: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
      gas: 3000000,
      gasPrice: 5000000000 // in wei -> 5GWEI      
    }
  },
};
