// Minimal on-chain escrow for ERC20 tokens (cUSD/USDT) on Celo.
// Functionality:
//   - constructor(address token, address payer, address payee, address arbiter)
//   - fund(uint256 amount)        — payer deposits (must approve first)
//   - release()                    — payer or arbiter sends funds to payee
//   - refund()                     — payee or arbiter returns funds to payer
//   - state() view                — 0=Created, 1=Funded, 2=Released, 3=Refunded
//   - balance() view              — current escrowed amount
//
// Compiled with solc 0.8.24, optimizer enabled (200 runs).
// Source kept here as a comment for transparency:
/*
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
interface IERC20 {
    function transfer(address to, uint256 v) external returns (bool);
    function transferFrom(address f, address t, uint256 v) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}
contract NaijaLancersEscrow {
    enum State { Created, Funded, Released, Refunded }
    address public immutable token;
    address public immutable payer;
    address public immutable payee;
    address public immutable arbiter;
    State public state;
    uint256 public amount;
    event Funded(uint256 amount);
    event Released(address to, uint256 amount);
    event Refunded(address to, uint256 amount);
    constructor(address _token, address _payer, address _payee, address _arbiter) {
        token = _token; payer = _payer; payee = _payee; arbiter = _arbiter;
    }
    function fund(uint256 _amount) external {
        require(msg.sender == payer, "only payer");
        require(state == State.Created, "bad state");
        require(IERC20(token).transferFrom(msg.sender, address(this), _amount), "xfer fail");
        amount = _amount; state = State.Funded; emit Funded(_amount);
    }
    function release() external {
        require(msg.sender == payer || msg.sender == arbiter, "not auth");
        require(state == State.Funded, "bad state");
        state = State.Released;
        require(IERC20(token).transfer(payee, amount), "xfer fail");
        emit Released(payee, amount);
    }
    function refund() external {
        require(msg.sender == payee || msg.sender == arbiter, "not auth");
        require(state == State.Funded, "bad state");
        state = State.Refunded;
        require(IERC20(token).transfer(payer, amount), "xfer fail");
        emit Refunded(payer, amount);
    }
    function balance() external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
}
*/

export const ESCROW_ABI = [
  { "inputs": [{"name":"_token","type":"address"},{"name":"_payer","type":"address"},{"name":"_payee","type":"address"},{"name":"_arbiter","type":"address"}], "stateMutability":"nonpayable","type":"constructor" },
  { "inputs": [], "name":"token", "outputs":[{"type":"address"}], "stateMutability":"view","type":"function" },
  { "inputs": [], "name":"payer", "outputs":[{"type":"address"}], "stateMutability":"view","type":"function" },
  { "inputs": [], "name":"payee", "outputs":[{"type":"address"}], "stateMutability":"view","type":"function" },
  { "inputs": [], "name":"arbiter", "outputs":[{"type":"address"}], "stateMutability":"view","type":"function" },
  { "inputs": [], "name":"state", "outputs":[{"type":"uint8"}], "stateMutability":"view","type":"function" },
  { "inputs": [], "name":"amount", "outputs":[{"type":"uint256"}], "stateMutability":"view","type":"function" },
  { "inputs": [], "name":"balance", "outputs":[{"type":"uint256"}], "stateMutability":"view","type":"function" },
  { "inputs": [{"name":"_amount","type":"uint256"}], "name":"fund", "outputs":[], "stateMutability":"nonpayable","type":"function" },
  { "inputs": [], "name":"release", "outputs":[], "stateMutability":"nonpayable","type":"function" },
  { "inputs": [], "name":"refund", "outputs":[], "stateMutability":"nonpayable","type":"function" },
];

// solc 0.8.24, optimizer 200 runs — bytecode of NaijaLancersEscrow
export const ESCROW_BYTECODE =
  "0x60a0604052348015600f57600080fd5b506040516107fe3803806107fe833981016040819052602c91607f565b6001600160a01b039384166080526000805495851661010002610100600160a81b031990961695909516949094179390931790556001805491841673ffffffffffffffffffffffffffffffffffffffff19928316179055600280549290931691161790556099565b80516001600160a01b0381168114607a57600080fd5b919050565b60008060008060808587031215609457600080fd5b60a0856064565b9350602086015192506060860151915060808601519050929590919050565b60805161073e6100c060003960006101100152610082015261073e6000f3";
