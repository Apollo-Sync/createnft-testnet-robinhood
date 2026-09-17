import hre from "hardhat";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const rl = readline.createInterface({ input, output });

function makeSymbol(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return cleaned.slice(0, 8) || "NFT";
}

function parseGmt7(raw: string): number {
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!match) {
    throw new Error("Sai định dạng. Dùng YYYY-MM-DD HH:MM");
  }

  const [, y, mo, d, h, mi] = match.map(Number);
  // GMT+7 = UTC-7 giờ
  const utcMs = Date.UTC(y, mo - 1, d, h - 7, mi, 0);
  const ts = Math.floor(utcMs / 1000);
  if (!Number.isFinite(ts)) {
    throw new Error("Thời gian không hợp lệ");
  }
  return ts;
}

async function ask(question: string): Promise<string> {
  const answer = await rl.question(question);
  return answer.trim();
}

async function main() {
  if (!process.env.PRIVATE_KEY) {
    throw new Error("Thiếu PRIVATE_KEY trong file .env");
  }

  const name = await ask("nhập tên NFT: ");
  if (!name) throw new Error("Tên không được trống");

  const supplyRaw = await ask("nhập số lượng NFT: ");
  const supply = Number(supplyRaw);
  if (!Number.isInteger(supply) || supply <= 0) {
    throw new Error("Số lượng phải là số nguyên > 0");
  }

  console.log("Định dạng giờ mint GMT+7: YYYY-MM-DD HH:MM");
  console.log("Ví dụ: 2026-09-20 14:30");
  const timeRaw = await ask("nhập thời gian mint ( GMT +7 ): ");
  const mintStart = parseGmt7(timeRaw);
  const symbol = makeSymbol(name);

  console.log("\n--- Thông tin deploy ---");
  console.log(`Tên        : ${name}`);
  console.log(`Symbol     : ${symbol}`);
  console.log(`Số lượng   : ${supply}`);
  console.log(`Mint GMT+7 : ${timeRaw}`);
  console.log(`Unix UTC   : ${mintStart}`);

  const ok = (await ask("\nDeploy? (y/n): ")).toLowerCase();
  rl.close();
  if (ok !== "y") {
    console.log("Đã hủy.");
    return;
  }

  const [signer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(signer.address);
  console.log(`Ví deploy  : ${signer.address}`);
  console.log(`ETH test   : ${hre.ethers.formatEther(balance)}`);

  if (balance === 0n) {
    throw new Error(
      "Ví hết ETH testnet. Faucet: https://faucet.testnet.chain.robinhood.com"
    );
  }

  const Factory = await hre.ethers.getContractFactory("SimpleNFT");
  const contract = await Factory.deploy(name, symbol, supply, mintStart);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\nDeploy thành công.");
  console.log(`Contract   : ${address}`);
  console.log(
    `Explorer   : https://explorer.testnet.chain.robinhood.com/address/${address}`
  );
  console.log("Sau giờ mint, gọi hàm mint(address) để mint từng NFT.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});