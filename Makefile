start:
	geth --port 30303 --networkid 1234 --datadir ~/Documents/Projecten/presale_identify/ethChain --maxpeers 2 --nodiscover --rpc --rpcapi "db,eth,net,web3,parity,personal,miner" --ipcpath /Users/kevinleyssens/Library/Ethereum/geth.ipc console