// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import { ERC721SeaDrop } from "./seadrop/ERC721SeaDrop.sol";

/**
 * @title MyNFTSeaDrop
 * @notice Contract NFT chuẩn SeaDrop của OpenSea, không sửa logic mint gốc
 *         (theo đúng khuyến nghị của OpenSea để bot / trang mint của họ
 *         đọc được đợt drop). Toàn bộ giá mint, thời gian, giới hạn/ví
 *         được cấu hình sau khi deploy qua updatePublicDrop, KHÔNG nằm
 *         trong constructor.
 */
contract MyNFTSeaDrop is ERC721SeaDrop {
    constructor(
        string memory name,
        string memory symbol,
        address[] memory allowedSeaDrop
    ) ERC721SeaDrop(name, symbol, allowedSeaDrop) {}
}
