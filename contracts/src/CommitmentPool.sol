// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

contract CommitmentPool {

    address public owner;
    mapping(address => bool) public authorized;
    uint256 public totalFunds;

    event FundsReceived(address indexed from, uint256 amount);
    event FundsInvested(address indexed to, uint256 amount);

    constructor() {
        owner = msg.sender;
        authorized[msg.sender] = true;
    }

    modifier onlyAuthorized() {
        require(authorized[msg.sender], "No autorizado");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner");
        _;
    }

    function deposit() external payable onlyAuthorized {
        totalFunds += msg.value;
        emit FundsReceived(msg.sender, msg.value);
    }

    function authorize(address _contract) external onlyOwner {
        authorized[_contract] = true;
    }

    function invest(address payable _to, uint256 _amount) external onlyOwner {
        require(_amount <= totalFunds, "Fondos insuficientes");
        totalFunds -= _amount;
        _to.transfer(_amount);
        emit FundsInvested(_to, _amount);
    }

    receive() external payable {
        totalFunds += msg.value;
    }
}
