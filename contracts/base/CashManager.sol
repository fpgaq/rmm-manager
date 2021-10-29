// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.6;

/// @title   CashManager contract
/// @author  Primitive
/// @notice  Utils contract to manage ETH and token balances

import "../interfaces/ICashManager.sol";
import "../base/HouseBase.sol";
import "../libraries/TransferHelper.sol";
import "../interfaces/external/IWETH9.sol";

abstract contract CashManager is ICashManager, HouseBase {
    /// @notice Only WETH9 can send ETH to this contract
    receive() external payable {
        if (msg.sender != WETH9) revert OnlyWETHError();
    }

    /// @inheritdoc ICashManager
    function wrap(uint256 value) external payable override {
        if (address(this).balance < value) {
            revert BalanceTooLowError(address(this).balance, value);
        }

        IWETH9(WETH9).deposit{value: value}();
        IWETH9(WETH9).transfer(msg.sender, value);
    }

    /// @inheritdoc ICashManager
    function unwrap(uint256 amountMin, address recipient) external payable override {
        uint256 balance = IWETH9(WETH9).balanceOf(address(this));

        if (balance < amountMin) revert BalanceTooLowError(balance, amountMin);

        if (balance > 0) {
            IWETH9(WETH9).withdraw(balance);
            TransferHelper.safeTransferETH(recipient, balance);
        }
    }

    /// @inheritdoc ICashManager
    function sweepToken(
        address token,
        uint256 amountMin,
        address recipient
    ) external payable override {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance < amountMin) revert BalanceTooLowError(balance, amountMin);

        if (balance > 0) {
            TransferHelper.safeTransfer(token, recipient, balance);
        }
    }

    /// @inheritdoc ICashManager
    function refundETH() external payable override {
        if (address(this).balance > 0) TransferHelper.safeTransferETH(msg.sender, address(this).balance);
    }

    /// @param token The token to transfer as payment
    /// @param payer The account that pays
    /// @param recipient The account that receives payment
    /// @param value The amount to pay
    function pay(
        address token,
        address payer,
        address recipient,
        uint256 value
    ) internal {
        if (token == WETH9 && address(this).balance > value) {
            IWETH9(WETH9).deposit{value: value}();
            IWETH9(WETH9).transfer(recipient, value);
        } else if (payer == address(this)) {
            TransferHelper.safeTransfer(token, recipient, value);
        } else {
            TransferHelper.safeTransferFrom(token, payer, recipient, value);
        }
    }
}
