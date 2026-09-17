// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleNFT {
    string public name;
    string public symbol;
    address public owner;
    uint256 public maxSupply;
    uint256 public mintStart;
    uint256 public totalSupply;
    uint256 public maxPerWallet;
    uint256 public mintPrice;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => string) private _tokenURIs;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => uint256) public mintedCount;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _maxSupply,
        uint256 _mintStart,
        uint256 _maxPerWallet,
        uint256 _mintPrice
    ) {
        require(_maxSupply > 0, "supply=0");
        require(_maxPerWallet > 0, "maxPerWallet=0");
        name = _name;
        symbol = _symbol;
        maxSupply = _maxSupply;
        mintStart = _mintStart;
        maxPerWallet = _maxPerWallet;
        mintPrice = _mintPrice;
        owner = msg.sender;
    }

    function mint(address to) external payable {
        require(block.timestamp >= mintStart, "mint not started");
        require(totalSupply < maxSupply, "sold out");
        require(to != address(0), "zero address");
        require(mintedCount[to] < maxPerWallet, "wallet mint limit reached");
        require(msg.value >= mintPrice, "insufficient ETH sent");

        uint256 tokenId = totalSupply + 1;
        totalSupply = tokenId;
        mintedCount[to] += 1;
        _owners[tokenId] = to;
        _balances[to] += 1;
        emit Transfer(address(0), to, tokenId);
    }

    function withdraw() external onlyOwner {
        uint256 bal = address(this).balance;
        require(bal > 0, "nothing to withdraw");
        (bool sent, ) = payable(owner).call{value: bal}("");
        require(sent, "withdraw failed");
    }

    function setTokenURI(uint256 tokenId, string calldata uri) external onlyOwner {
        require(_owners[tokenId] != address(0), "not exist");
        _tokenURIs[tokenId] = uri;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "not exist");
        return _tokenURIs[tokenId];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address o = _owners[tokenId];
        require(o != address(0), "not exist");
        return o;
    }

    function balanceOf(address account) public view returns (uint256) {
        require(account != address(0), "zero address");
        return _balances[account];
    }

    function approve(address to, uint256 tokenId) external {
        address o = ownerOf(tokenId);
        require(msg.sender == o || _operatorApprovals[o][msg.sender], "not approved");
        _tokenApprovals[tokenId] = to;
        emit Approval(o, to, tokenId);
    }

    function getApproved(uint256 tokenId) public view returns (address) {
        require(_owners[tokenId] != address(0), "not exist");
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address account, address operator) public view returns (bool) {
        return _operatorApprovals[account][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        require(to != address(0), "zero address");
        address o = ownerOf(tokenId);
        require(o == from, "not owner");
        require(
            msg.sender == from ||
                msg.sender == _tokenApprovals[tokenId] ||
                _operatorApprovals[from][msg.sender],
            "not approved"
        );
        delete _tokenApprovals[tokenId];
        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        transferFrom(from, to, tokenId);
    }
}
