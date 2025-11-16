require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  defaultNetwork: "hardhat",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    hardhat: {
      // Disable verbose logging to reduce noise
      loggingEnabled: false,
      // Show more detailed transaction info
      blockGasLimit: 30000000,
      gas: 12000000,
      gasPrice: 8000000000,
      // Mining settings for better logging
      mining: {
        auto: true,
        interval: 2000, // 2 second block time for development
      },
    },
  },
  // Enable console.log in contracts
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};
