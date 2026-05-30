// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import "forge-std/Script.sol";
import "../src/CommitmentPool.sol";
import "../src/CommitmentManager.sol";
import "../src/GroupMultisig.sol";

contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();

        CommitmentPool pool = new CommitmentPool();
        console.log("CommitmentPool deployed at:", address(pool));

        // AI agent = deployer wallet por ahora (cambiar con setAiAgent cuando este listo el backend)
        CommitmentManager manager = new CommitmentManager(msg.sender, address(pool));
        console.log("CommitmentManager deployed at:", address(manager));

        // Autorizar CommitmentManager para depositar en el pool
        pool.authorize(address(manager));
        console.log("CommitmentManager authorized in pool");

        GroupMultisig multisig = new GroupMultisig();
        console.log("GroupMultisig deployed at:", address(multisig));

        vm.stopBroadcast();
    }
}
