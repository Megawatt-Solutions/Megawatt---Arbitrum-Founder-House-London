// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {MegawattVault, ICredentialOracle} from "../src/MegawattVault.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";

/// Deploys the two ACTIVE (fully funded, earning) vaults — Koper 01 and
/// Graz 01 — against the already-deployed MockUSDC + CredentialOracle.
/// Funds them to target from the deployer, flips them to Active, and seeds
/// roughly one month of yield so there is something to claim immediately.
contract DeployActive is Script {
    MockUSDC constant USDC = MockUSDC(0x4232353b04a62547eAB29217332e1340c917e852);
    address constant ORACLE = 0x4851abE7Ae1dc3c20108540f86a14c5B5f1FA2e0;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        console2.log("deployer:", deployer);

        vm.startBroadcast(pk);

        // Top up so full funding + yield seeds never run dry (capped faucet).
        USDC.mint(deployer, 1_000_000e6);

        MegawattVault koper = new MegawattVault(
            "Megawatt BESS Koper 01",
            "mwKOP01",
            "bess-koper-01",
            IERC20(address(USDC)),
            ICredentialOracle(ORACLE),
            2_200_000e6,
            MegawattVault.Stage.Fundraising,
            deployer
        );
        MegawattVault graz = new MegawattVault(
            "Megawatt BESS Graz 01",
            "mwGRZ01",
            "bess-graz-01",
            IERC20(address(USDC)),
            ICredentialOracle(ORACLE),
            1_400_000e6,
            MegawattVault.Stage.Fundraising,
            deployer
        );

        USDC.approve(address(koper), type(uint256).max);
        USDC.approve(address(graz), type(uint256).max);
        koper.deposit(2_200_000e6, deployer);
        graz.deposit(1_400_000e6, deployer);

        koper.setStage(MegawattVault.Stage.Active);
        graz.setStage(MegawattVault.Stage.Active);

        // ~1 month of yield at each vault's APY (12% / 11.5%).
        koper.distributeYield(22_000e6);
        graz.distributeYield(13_417e6);

        vm.stopBroadcast();

        console2.log("Vault Koper:", address(koper));
        console2.log("Vault Graz: ", address(graz));

        string memory json = "active";
        vm.serializeAddress(json, "vaultKoper", address(koper));
        string memory out = vm.serializeAddress(json, "vaultGraz", address(graz));
        vm.writeJson(out, "./deployments/arbitrum-sepolia-active.json");
    }
}
