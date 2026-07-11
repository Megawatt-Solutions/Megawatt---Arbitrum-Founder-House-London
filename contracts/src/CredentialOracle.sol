// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";

/// @notice KYC allowlist gate for vault deposits. `openMode` (default on)
/// lets everyone through so the testnet flows work without ceremony;
/// flip it off to enforce the allowlist.
contract CredentialOracle is Ownable {
    bool public openMode = true;
    mapping(address => bool) public verified;

    event OpenModeSet(bool open);
    event VerifiedSet(address indexed user, bool verified);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function isVerified(address user) external view returns (bool) {
        return openMode || verified[user];
    }

    function setOpenMode(bool open) external onlyOwner {
        openMode = open;
        emit OpenModeSet(open);
    }

    function setVerified(address user, bool isOk) external onlyOwner {
        verified[user] = isOk;
        emit VerifiedSet(user, isOk);
    }
}
