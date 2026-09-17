import hre from "hardhat";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const rl = readline.createInterface({ input, output });

// Địa chỉ SeaDrop singleton (canonical, deploy cùng địa chỉ trên hầu hết
// EVM chain qua CREATE2). Bot của bạn báo là đã tồn tại trên Robinhood
// testnet, nên giữ mặc định này. Có thể override bằng biến môi trường
// SEADROP_ADDRESS nếu chain của bạn dùng địa chỉ khác.
const SEADROP_ADDRESS =
  process.env.SEADROP_ADDRESS || "0x00005EA00Ac477B1030CE78506496e8C2dE24bf5";

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
  const utcMs = Date.UTC(y, mo - 1, d, h - 7, mi, 0);
  const ts = Math.floor(utcMs / 1000);
  if (!Number.isFinite(ts)) throw new Error("Thời gian không hợp lệ");
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

  const supplyRaw = await ask("nhập số lượng NFT (max supply): ");
  const supply = Number(supplyRaw);
  if (!Number.isInteger(supply) || supply <= 0) {
    throw new Error("Số lượng phải là số nguyên > 0");
  }

  const maxPerWalletRaw = await ask("nhập số lượng NFT tối đa mỗi ví được mint: ");
  const maxPerWallet = Number(maxPerWalletRaw);
  if (!Number.isInteger(maxPerWallet) || maxPerWallet <= 0 || maxPerWallet > 65535) {
    throw new Error("Số lượng tối đa mỗi ví phải là số nguyên > 0 (≤ 65535)");
  }
  if (maxPerWallet > supply) {
    throw new Error("Số lượng tối đa mỗi ví không được lớn hơn tổng supply");
  }

  const priceRaw = await ask("nhập giá mint (ETH, ví dụ 0.01, để 0 nếu miễn phí): ");
  const priceNum = Number(priceRaw);
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    throw new Error("Giá mint không hợp lệ");
  }
  const mintPrice = hre.ethers.parseEther(priceRaw || "0");

  console.log("Định dạng giờ GMT+7: YYYY-MM-DD HH:MM (ví dụ 2026-09-20 14:30)");
  const startRaw = await ask("nhập thời gian BẮT ĐẦU mint (GMT+7): ");
  const startTime = parseGmt7(startRaw);

  const endRaw = await ask(
    "nhập thời gian KẾT THÚC mint (GMT+7, để trống = 1 năm sau khi bắt đầu): "
  );
  const endTime = endRaw ? parseGmt7(endRaw) : startTime + 365 * 24 * 60 * 60;
  if (endTime <= startTime) {
    throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu");
  }

  const symbol = makeSymbol(name);

  console.log("\n--- Thông tin deploy (chuẩn SeaDrop) ---");
  console.log(`Tên              : ${name}`);
  console.log(`Symbol           : ${symbol}`);
  console.log(`Max supply       : ${supply}`);
  console.log(`Tối đa / ví      : ${maxPerWallet}`);
  console.log(`Giá mint         : ${priceRaw || "0"} ETH`);
  console.log(`Bắt đầu (GMT+7)  : ${startRaw}`);
  console.log(`Kết thúc (GMT+7) : ${endRaw || "(mặc định +1 năm)"}`);
  console.log(`SeaDrop address  : ${SEADROP_ADDRESS}`);

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
    throw new Error("Ví hết ETH testnet.");
  }

  // 1) Deploy contract NFT, cho phép SeaDrop singleton mint hộ.
  const Factory = await hre.ethers.getContractFactory("MyNFTSeaDrop");
  const contract = await Factory.deploy(name, symbol, [SEADROP_ADDRESS]);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`\nContract deploy thành công: ${address}`);

  // 2) Set max supply cho collection.
  const txSupply = await (contract as any).setMaxSupply(supply);
  await txSupply.wait();
  console.log(`Đã set max supply = ${supply}`);

  // 3) Set địa chỉ nhận tiền bán NFT (bắt buộc, nếu không mint sẽ revert).
  const txPayout = await (contract as any).updateCreatorPayoutAddress(
    SEADROP_ADDRESS,
    signer.address
  );
  await txPayout.wait();
  console.log(`Đã set creator payout = ${signer.address}`);

  // 4) Đăng ký public drop (giá, thời gian, giới hạn/ví) lên SeaDrop singleton.
  const publicDrop = {
    mintPrice: mintPrice,
    startTime: startTime,
    endTime: endTime,
    maxTotalMintableByWallet: maxPerWallet,
    feeBps: 0,
    restrictFeeRecipients: false,
  };
  const txDrop = await (contract as any).updatePublicDrop(
    SEADROP_ADDRESS,
    publicDrop
  );
  await txDrop.wait();
  console.log("Đã đăng ký public drop lên SeaDrop singleton.");

  console.log("\n=== HOÀN TẤT ===");
  console.log(`Contract   : ${address}`);
  console.log(
    `Bot/mint page đọc getPublicDrop(${address}) trên SeaDrop ${SEADROP_ADDRESS} sẽ ra đúng dữ liệu.`
  );
  console.log(
    "Gọi mint qua ISeaDrop(seaDropAddress).mintPublic(nftContract, feeRecipient, minter, quantity) kèm msg.value = mintPrice * quantity."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
