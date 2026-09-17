# NFT Deploy — Robinhood Chain Testnet

## Cài đặt

```
npm install
```

## Cấu hình

1. Đổi tên `.env.example` thành `.env`
2. Điền `PRIVATE_KEY` (private key ví dùng để deploy, có ETH testnet)

## Deploy

### Option A — Contract chuẩn SeaDrop (khuyên dùng, để bot/trang mint chuẩn OpenSea đọc được)

```
npm run deploy:seadrop
```

Script sẽ hỏi: tên, symbol tự sinh, max supply, giá mint (ETH), số lượng tối đa mỗi ví,
thời gian bắt đầu/kết thúc (GMT+7). Sau khi deploy, script tự động:
- `setMaxSupply`
- `updateCreatorPayoutAddress` (ví nhận tiền bán NFT — bắt buộc)
- `updatePublicDrop` (đăng ký giá/giờ/giới hạn lên SeaDrop singleton)

Mint bằng cách gọi `ISeaDrop(seaDropAddress).mintPublic(nftContract, feeRecipient, minter, quantity)`
kèm `msg.value = mintPrice * quantity`.

### Option B — Contract tự viết đơn giản (SimpleNFT.sol)

```
npm run deploy
```

Contract riêng, có giá mint + giới hạn/ví ngay trong contract, mint bằng gọi thẳng
`mint(address to)` kèm ETH.

## Cấu trúc

- `contracts/seadrop/` — source gốc OpenSea SeaDrop (không sửa)
- `contracts/MyNFTSeaDrop.sol` — contract kế thừa ERC721SeaDrop, dùng cho Option A
- `contracts/SimpleNFT.sol` — contract tự viết, dùng cho Option B
- `scripts/deploy-seadrop.ts` — script deploy Option A
- `scripts/deploy.ts` — script deploy Option B

## Lưu ý

- Chưa compile-test được trong môi trường tạo file này (mạng sandbox chặn tải solc).
  Chạy `npx hardhat compile` trên máy bạn trước để chắc chắn không lỗi; nếu lỗi,
  gửi log lại để fix tiếp.
- Network `robinhoodTestnet` trong `hardhat.config.ts` dùng RPC công khai
  `https://rpc.testnet.chain.robinhood.com` (chain ID 46630), có thể bị rate-limit.
  Nếu deploy hay lỗi timeout, đổi sang RPC Alchemy trong file `hardhat.config.ts`.
