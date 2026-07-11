// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {CredentialOracle} from "../src/CredentialOracle.sol";
import {MegawattVault, ICredentialOracle} from "../src/MegawattVault.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";

contract MegawattTest is Test {
    MockUSDC usdc;
    CredentialOracle oracle;
    MegawattVault vault;
    Marketplace market;

    address operator = makeAddr("operator");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        usdc = new MockUSDC();
        oracle = new CredentialOracle(operator);
        vault = new MegawattVault(
            "Megawatt BESS Test 01",
            "mwTST01",
            "bess-test-01",
            IERC20(address(usdc)),
            ICredentialOracle(address(oracle)),
            1_000_000e6,
            MegawattVault.Stage.Fundraising,
            operator
        );
        market = new Marketplace(IERC20(address(usdc)));

        usdc.mint(alice, 1_000_000e6);
        usdc.mint(bob, 1_000_000e6);
        usdc.mint(operator, 1_000_000e6);
        vm.prank(alice);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(operator);
        usdc.approve(address(vault), type(uint256).max);
    }

    function test_DepositMintsSharesAtPar() public {
        vm.prank(alice);
        vault.deposit(600_000e6, alice);
        assertEq(vault.balanceOf(alice), 600_000e6);
        assertEq(vault.totalRaised(), 600_000e6);
        assertEq(vault.maxDeposit(alice), 400_000e6);
    }

    function test_DepositRevertsOverTarget() public {
        vm.prank(alice);
        vm.expectRevert("vault: exceeds raise target");
        vault.deposit(1_000_001e6, alice);
    }

    function test_DepositRevertsOutsideFundraising() public {
        vm.prank(operator);
        vault.setStage(MegawattVault.Stage.Pipeline);
        vm.prank(alice);
        vm.expectRevert("vault: not fundraising");
        vault.deposit(1e6, alice);
    }

    function test_OracleGateBlocksUnverified() public {
        vm.startPrank(operator);
        oracle.setOpenMode(false);
        oracle.setVerified(alice, true);
        vm.stopPrank();

        vm.prank(alice);
        vault.deposit(10e6, alice); // verified: fine

        vm.prank(bob);
        vm.expectRevert("vault: receiver not verified");
        vault.deposit(10e6, bob);
    }

    function test_YieldSplitsProRataAndClaims() public {
        vm.prank(alice);
        vault.deposit(600_000e6, alice);
        vm.prank(bob);
        vault.deposit(400_000e6, bob);

        vm.prank(operator);
        vault.distributeYield(100_000e6);

        assertEq(vault.pendingYield(alice), 60_000e6);
        assertEq(vault.pendingYield(bob), 40_000e6);

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice);
        vault.claimYield();
        assertEq(usdc.balanceOf(alice) - before, 60_000e6);
        assertEq(vault.pendingYield(alice), 0);
        assertEq(vault.pendingYield(bob), 40_000e6);
    }

    function test_YieldSurvivesTransfers() public {
        vm.prank(alice);
        vault.deposit(1_000e6, alice);
        vm.prank(operator);
        vault.distributeYield(100e6); // all accrues to alice

        vm.prank(alice);
        vault.transfer(bob, 1_000e6); // sell the whole position

        vm.prank(operator);
        vault.distributeYield(100e6); // accrues to bob

        assertEq(vault.pendingYield(alice), 100e6);
        assertEq(vault.pendingYield(bob), 100e6);
    }

    function test_AsyncRedeemFlow() public {
        vm.prank(alice);
        vault.deposit(500e6, alice);

        vm.prank(alice);
        vault.requestRedeem(200e6);
        assertEq(vault.balanceOf(alice), 300e6);
        assertEq(vault.redeemRequestShares(alice), 200e6);

        uint256 before = usdc.balanceOf(alice);
        vm.prank(operator);
        vault.fulfillRedeem(alice, 200e6);
        assertEq(usdc.balanceOf(alice) - before, 200e6);
        assertEq(vault.totalSupply(), 300e6);
    }

    function test_DrawdownReservesUnclaimedYield() public {
        vm.prank(alice);
        vault.deposit(1_000e6, alice);
        vm.prank(operator);
        vault.distributeYield(100e6);

        // 1100 in vault, 100 reserved for yield -> only 1000 available
        vm.prank(operator);
        vm.expectRevert("vault: exceeds available");
        vault.drawdown(1_001e6, operator);

        vm.prank(operator);
        vault.drawdown(1_000e6, operator);
        assertEq(vault.totalDrawnDown(), 1_000e6);

        vm.prank(alice);
        vault.claimYield();
        assertEq(usdc.balanceOf(address(vault)), 0);
    }

    function test_MarketplaceListAndBuy() public {
        vm.prank(alice);
        vault.deposit(500e6, alice);

        vm.startPrank(alice);
        vault.approve(address(market), 500e6);
        uint256 id = market.list(IERC20(address(vault)), 500e6, 520e6); // ask premium over par
        vm.stopPrank();
        assertEq(vault.balanceOf(address(market)), 500e6);

        vm.startPrank(bob);
        usdc.approve(address(market), 520e6);
        market.buy(id);
        vm.stopPrank();

        assertEq(vault.balanceOf(bob), 500e6);
        assertEq(usdc.balanceOf(alice), 1_000_000e6 - 500e6 + 520e6);

        // yield accrues to the new holder
        vm.prank(operator);
        vault.distributeYield(50e6);
        assertEq(vault.pendingYield(bob), 50e6);
        assertEq(vault.pendingYield(alice), 0);
    }

    function test_MarketplaceCancel() public {
        vm.prank(alice);
        vault.deposit(100e6, alice);
        vm.startPrank(alice);
        vault.approve(address(market), 100e6);
        uint256 id = market.list(IERC20(address(vault)), 100e6, 110e6);
        market.cancel(id);
        vm.stopPrank();
        assertEq(vault.balanceOf(alice), 100e6);
    }
}
