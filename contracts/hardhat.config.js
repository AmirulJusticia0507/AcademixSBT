require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const rawPrivateKey = process.env.PRIVATE_KEY?.trim();
const PRIVATE_KEY =
  rawPrivateKey && /^(0x)?[a-fA-F0-9]{64}$/.test(rawPrivateKey) ? rawPrivateKey : undefined;
const accounts = PRIVATE_KEY ? [PRIVATE_KEY] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: { evmVersion: "cancun" },
  },
  networks: {
    amoy: {
      url: process.env.RPC_URL || "https://rpc-amoy.polygon.technology",
      accounts,
      chainId: 80002,
    },
    arbitrumSepolia: {
      url: process.env.ARBITRUM_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
      accounts,
      chainId: 421614,
    },
  },
};
