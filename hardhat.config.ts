import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      // dùng cho contract SimpleNFT.sol (tự viết)
      { version: "0.8.20", settings: { optimizer: { enabled: true, runs: 200 } } },
      // dùng cho contract chuẩn SeaDrop (bản gốc OpenSea, pin cứng 0.8.17)
      { version: "0.8.17", settings: { optimizer: { enabled: true, runs: 1000000 } } },
    ],
  },
  networks: {
    robinhoodTestnet: {
      // RPC công khai, có rate-limit. Nếu chậm/lỗi, đổi sang RPC của Alchemy:
      // https://robinhood-testnet.g.alchemy.com/v2/<API_KEY>
      url: "https://rpc.testnet.chain.robinhood.com",
      chainId: 46630,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};

export default config;
