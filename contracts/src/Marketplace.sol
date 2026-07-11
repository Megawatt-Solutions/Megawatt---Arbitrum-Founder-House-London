// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/utils/ReentrancyGuard.sol";

/// @notice P2P secondary market for vault receipt shares, settled in USDC.
/// Listings escrow the shares; a buyer pays the seller's ask and receives
/// them. Yield accrued while escrowed keeps accounting via the vault's
/// transfer hooks.
contract Marketplace is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Listing {
        address seller;
        IERC20 shareToken; // MegawattVault
        uint256 shares;
        uint256 priceUsdc; // total ask for the whole lot
        bool active;
    }

    IERC20 public immutable usdc;
    Listing[] public listings;

    event Listed(uint256 indexed id, address indexed seller, address indexed shareToken, uint256 shares, uint256 priceUsdc);
    event Cancelled(uint256 indexed id);
    event Purchased(uint256 indexed id, address indexed buyer);

    constructor(IERC20 usdc_) {
        usdc = usdc_;
    }

    function list(IERC20 shareToken, uint256 shares, uint256 priceUsdc) external nonReentrant returns (uint256 id) {
        require(shares > 0, "market: zero shares");
        require(priceUsdc > 0, "market: zero price");
        shareToken.safeTransferFrom(msg.sender, address(this), shares);
        id = listings.length;
        listings.push(Listing({seller: msg.sender, shareToken: shareToken, shares: shares, priceUsdc: priceUsdc, active: true}));
        emit Listed(id, msg.sender, address(shareToken), shares, priceUsdc);
    }

    function cancel(uint256 id) external nonReentrant {
        Listing storage l = listings[id];
        require(l.active, "market: inactive");
        require(l.seller == msg.sender, "market: not seller");
        l.active = false;
        l.shareToken.safeTransfer(msg.sender, l.shares);
        emit Cancelled(id);
    }

    function buy(uint256 id) external nonReentrant {
        Listing storage l = listings[id];
        require(l.active, "market: inactive");
        l.active = false;
        usdc.safeTransferFrom(msg.sender, l.seller, l.priceUsdc);
        l.shareToken.safeTransfer(msg.sender, l.shares);
        emit Purchased(id, msg.sender);
    }

    function listingCount() external view returns (uint256) {
        return listings.length;
    }
}
