// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {CredentialOracle} from "../src/CredentialOracle.sol";
import {MegawattVault, ICredentialOracle} from "../src/MegawattVault.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";

/// Deploys the Megawatt testnet suite to Arbitrum Sepolia and seeds the
/// fundraising vaults so on-chain state mirrors the app's mock numbers.
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        console2.log("deployer:", deployer);

        vm.startBroadcast(pk);

        MockUSDC usdc = new MockUSDC();
        CredentialOracle oracle = new CredentialOracle(deployer);
        Marketplace market = new Marketplace(IERC20(address(usdc)));

        MegawattVault zagreb = new MegawattVault(
            "Megawatt BESS Zagreb 01",
            "mwZAG01",
            "bess-zagreb-01",
            IERC20(address(usdc)),
            ICredentialOracle(address(oracle)),
            1_800_000e6,
            MegawattVault.Stage.Fundraising,
            deployer
        );
        MegawattVault trieste = new MegawattVault(
            "Megawatt BESS Trieste 01",
            "mwTRS01",
            "bess-trieste-01",
            IERC20(address(usdc)),
            ICredentialOracle(address(oracle)),
            700_000e6,
            MegawattVault.Stage.Fundraising,
            deployer
        );
        MegawattVault belgrade = new MegawattVault(
            "Megawatt BESS Belgrade 01",
            "mwBEL01",
            "bess-belgrade-01",
            IERC20(address(usdc)),
            ICredentialOracle(address(oracle)),
            3_200_000e6,
            MegawattVault.Stage.Pipeline,
            deployer
        );

        // Fund the deployer with test USDC (faucet is capped per call).
        for (uint256 i = 0; i < 5; i++) {
            usdc.mint(deployer, 1_000_000e6);
        }

        // Seed raises to mirror the app's mock data (742k / 588k).
        usdc.approve(address(zagreb), type(uint256).max);
        usdc.approve(address(trieste), type(uint256).max);
        zagreb.deposit(742_000e6, deployer);
        trieste.deposit(588_000e6, deployer);

        vm.stopBroadcast();

        console2.log("MockUSDC:        ", address(usdc));
        console2.log("CredentialOracle:", address(oracle));
        console2.log("Marketplace:     ", address(market));
        console2.log("Vault Zagreb:    ", address(zagreb));
        console2.log("Vault Trieste:   ", address(trieste));
        console2.log("Vault Belgrade:  ", address(belgrade));

        string memory json = "deployments";
        vm.serializeUint(json, "chainId", block.chainid);
        vm.serializeAddress(json, "deployer", deployer);
        vm.serializeAddress(json, "mockUsdc", address(usdc));
        vm.serializeAddress(json, "credentialOracle", address(oracle));
        vm.serializeAddress(json, "marketplace", address(market));
        vm.serializeAddress(json, "vaultZagreb", address(zagreb));
        vm.serializeAddress(json, "vaultTrieste", address(trieste));
        string memory out = vm.serializeAddress(json, "vaultBelgrade", address(belgrade));
        vm.writeJson(out, "./deployments/arbitrum-sepolia.json");
    }
}
