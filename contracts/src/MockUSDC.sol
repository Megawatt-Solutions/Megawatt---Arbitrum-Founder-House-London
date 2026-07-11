// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "openzeppelin-contracts/token/ERC20/ERC20.sol";

/// @notice Testnet stand-in for USDC: 6 decimals, open capped faucet.
contract MockUSDC is ERC20 {
    uint256 public constant MAX_MINT_PER_CALL = 1_000_000e6;

    constructor() ERC20("Mock USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        require(amount <= MAX_MINT_PER_CALL, "MockUSDC: amount exceeds per-call cap");
        _mint(to, amount);
    }
}
