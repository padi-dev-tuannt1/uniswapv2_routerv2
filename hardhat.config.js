require("@nomiclabs/hardhat-etherscan");
require("ethereum-waffle");
require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("@nomiclabs/hardhat-ethers");
require("hardhat-deploy-ethers");
require("@nomiclabs/hardhat-solhint");
require("@nomiclabs/hardhat-web3");
require("hardhat-deploy");
require("hardhat-preprocessor");
require("hardhat-gas-reporter");

const Secrets = require("./secrets");

module.exports = {
  solidity: {
    version: "0.6.6",
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    hardhat: {
      forking: {
        url: "https://eth-mainnet.g.alchemy.com/v2/ed-r6LXeqR8adnJmPyAvizqrDT625qAu",
      },
      chainId: 1,
      mining: {
        auto: true,
        interval: 5000,
      },
      allowUnlimitedContractSize: true,
    },
    goerli: {
      url: "https://rpc.ankr.com/eth_goerli",
      chainId: 5,
      accounts: [Secrets.privateKey],
    },
    baseGoerli: {
      url: "https://base-goerli.public.blastapi.io",
      chainId: 84531,
      accounts: [Secrets.privateKey],
    },
    baseSepolia: {
      url: "https://base-sepolia.blockpi.network/v1/rpc/public",
      chainId: 84532,
      accounts: [Secrets.privateKey],
    },
    bscTest: {
      url: "https://data-seed-prebsc-1-s2.bnbchain.org:8545",
      chainId: 97,
      accounts: [Secrets.privateKey]
    },
    bsc: {
      url: "https://bsc-dataseed1.ninicoin.io",
      chainId: 56,
      accounts: [Secrets.privateKey]
    },
    base: {
      url: "https://base.publicnode.com",
      chainId: 8453,
      accounts: [Secrets.privateKey],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: {
      bsc: "HRDD2XSSZD9K4EZRSDDMSDWWXUT8V3RDU7",
      bscTestnet: 'HRDD2XSSZD9K4EZRSDDMSDWWXUT8V3RDU7',
      goerli: "FVG97R76QVSXEMNHT19TCCUQSZSW2HY6F7",
      baseGoerli: Secrets.explorer_key.BASE,
      baseSepolia: Secrets.explorer_key.BASE,
    },
    customChains: [
      {
        network: "baseGoerli",
        chainId: 84531,
        urls: {
          apiURL: "https://api-goerli.basescan.org/api",
          browserURL: "https://goerli.basescan.org/",
        },
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org/",
        },
      },
    ],
  },
};
