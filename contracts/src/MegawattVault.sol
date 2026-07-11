// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "openzeppelin-contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/utils/ReentrancyGuard.sol";

interface ICredentialOracle {
    function isVerified(address user) external view returns (bool);
}

/// @notice BESS fundraising vault. Deposited USDC mints receipt shares 1:1
/// (par value) — the shares ARE the tradeable position. Raised capital is
/// drawn down by the operator to build the site; yield is pushed back in via
/// `distributeYield` and is claimable per-share (MasterChef accounting that
/// survives transfers, so shares trade cleanly on the marketplace). Principal
/// exits are async (ERC-7540 flavor): request escrows shares, the operator
/// fulfills at par.
contract MegawattVault is ERC20, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Stage {
        Pipeline,
        Fundraising,
        Active,
        Operational
    }

    uint256 private constant PRECISION = 1e18;

    IERC20 public immutable asset; // USDC, 6 decimals
    ICredentialOracle public oracle;
    string public siteId; // maps to the app's vault id, e.g. "bess-zagreb-01"

    Stage public stage;
    uint256 public raiseTarget; // asset units
    uint256 public totalRaised; // cumulative deposits
    uint256 public totalDrawnDown;

    // yield accounting
    uint256 public accYieldPerShare; // scaled by PRECISION
    uint256 public totalYieldDistributed;
    uint256 public totalYieldClaimed;
    mapping(address => uint256) public yieldDebt; // scaled checkpoint
    mapping(address => uint256) public pendingStored; // harvested, unclaimed

    // async redemption
    mapping(address => uint256) public redeemRequestShares;
    uint256 public totalPendingRedeemShares;

    event Deposited(address indexed sender, address indexed receiver, uint256 assets);
    event YieldDistributed(uint256 amount);
    event YieldClaimed(address indexed user, uint256 amount);
    event RedeemRequested(address indexed user, uint256 shares);
    event RedeemCancelled(address indexed user, uint256 shares);
    event RedeemFulfilled(address indexed user, uint256 shares, uint256 assets);
    event Drawdown(address indexed to, uint256 amount);
    event StageChanged(Stage stage);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory siteId_,
        IERC20 asset_,
        ICredentialOracle oracle_,
        uint256 raiseTarget_,
        Stage stage_,
        address owner_
    ) ERC20(name_, symbol_) Ownable(owner_) {
        asset = asset_;
        oracle = oracle_;
        siteId = siteId_;
        raiseTarget = raiseTarget_;
        stage = stage_;
    }

    function decimals() public pure override returns (uint8) {
        return 6; // parity with USDC so shares mint 1:1
    }

    // ─── deposits ────────────────────────────────────────────────

    function deposit(uint256 assets, address receiver) external nonReentrant returns (uint256 shares) {
        require(stage == Stage.Fundraising, "vault: not fundraising");
        require(oracle.isVerified(receiver), "vault: receiver not verified");
        require(assets > 0, "vault: zero deposit");
        require(totalRaised + assets <= raiseTarget, "vault: exceeds raise target");

        asset.safeTransferFrom(msg.sender, address(this), assets);
        shares = assets; // 1:1 par
        _mint(receiver, shares);
        totalRaised += assets;
        emit Deposited(msg.sender, receiver, assets);
    }

    function maxDeposit(address) external view returns (uint256) {
        if (stage != Stage.Fundraising) return 0;
        return raiseTarget - totalRaised;
    }

    function totalAssets() public view returns (uint256) {
        return asset.balanceOf(address(this));
    }

    // ─── yield ───────────────────────────────────────────────────

    function distributeYield(uint256 amount) external onlyOwner {
        require(totalSupply() > 0, "vault: no shares");
        require(amount > 0, "vault: zero amount");
        asset.safeTransferFrom(msg.sender, address(this), amount);
        accYieldPerShare += (amount * PRECISION) / totalSupply();
        totalYieldDistributed += amount;
        emit YieldDistributed(amount);
    }

    function pendingYield(address user) public view returns (uint256) {
        return pendingStored[user] + (balanceOf(user) * accYieldPerShare) / PRECISION - yieldDebt[user];
    }

    function claimYield() external nonReentrant returns (uint256 amount) {
        _harvest(msg.sender);
        yieldDebt[msg.sender] = (balanceOf(msg.sender) * accYieldPerShare) / PRECISION;
        amount = pendingStored[msg.sender];
        if (amount == 0) return 0;
        pendingStored[msg.sender] = 0;
        totalYieldClaimed += amount;
        asset.safeTransfer(msg.sender, amount);
        emit YieldClaimed(msg.sender, amount);
    }

    /// @dev Settle accrued yield for both sides of any balance change so the
    /// per-share accounting survives mints, burns, and marketplace transfers.
    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0)) _harvest(from);
        if (to != address(0)) _harvest(to);
        super._update(from, to, value);
        if (from != address(0)) yieldDebt[from] = (balanceOf(from) * accYieldPerShare) / PRECISION;
        if (to != address(0)) yieldDebt[to] = (balanceOf(to) * accYieldPerShare) / PRECISION;
    }

    function _harvest(address user) private {
        uint256 owed = (balanceOf(user) * accYieldPerShare) / PRECISION - yieldDebt[user];
        if (owed > 0) pendingStored[user] += owed;
    }

    // ─── async redemption (7540 flavor) ──────────────────────────

    function requestRedeem(uint256 shares) external nonReentrant {
        require(shares > 0, "vault: zero shares");
        _transfer(msg.sender, address(this), shares); // escrow
        redeemRequestShares[msg.sender] += shares;
        totalPendingRedeemShares += shares;
        emit RedeemRequested(msg.sender, shares);
    }

    function cancelRedeem(uint256 shares) external nonReentrant {
        require(shares > 0 && shares <= redeemRequestShares[msg.sender], "vault: bad amount");
        redeemRequestShares[msg.sender] -= shares;
        totalPendingRedeemShares -= shares;
        _transfer(address(this), msg.sender, shares);
        emit RedeemCancelled(msg.sender, shares);
    }

    function fulfillRedeem(address user, uint256 shares) external onlyOwner nonReentrant {
        require(shares > 0 && shares <= redeemRequestShares[user], "vault: bad amount");
        redeemRequestShares[user] -= shares;
        totalPendingRedeemShares -= shares;
        _burn(address(this), shares);
        asset.safeTransfer(user, shares); // 1:1 par
        emit RedeemFulfilled(user, shares, shares);
    }

    // ─── operator ────────────────────────────────────────────────

    /// @notice Pull raised capital to fund the BESS build. Distributed-but-
    /// unclaimed yield stays reserved in the vault.
    function drawdown(uint256 amount, address to) external onlyOwner {
        uint256 reservedYield = totalYieldDistributed - totalYieldClaimed;
        uint256 available = asset.balanceOf(address(this)) - reservedYield;
        require(amount <= available, "vault: exceeds available");
        totalDrawnDown += amount;
        asset.safeTransfer(to, amount);
        emit Drawdown(to, amount);
    }

    function setStage(Stage newStage) external onlyOwner {
        stage = newStage;
        emit StageChanged(newStage);
    }

    function setOracle(ICredentialOracle newOracle) external onlyOwner {
        oracle = newOracle;
    }
}
