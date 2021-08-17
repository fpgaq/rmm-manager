// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.6;

import "../base/Admin.sol";

contract TestAdmin is Admin {
    constructor() {
        initializeAdmin(msg.sender);
    }
}
