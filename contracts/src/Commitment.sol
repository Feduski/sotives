// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

interface ICommitmentPool {
    function deposit() external payable;
}

contract Commitment {

    address public owner;
    address public aiAgent;
    ICommitmentPool public commitmentPool;

    uint256 public nextCommitmentId;

    enum Status { Active, Completed, Failed }

    struct CommitmentData {
        address beneficiary;
        uint256 deadline;
        uint256 totalFunds;
        Status status;
        string description;
    }

    mapping(uint256 => CommitmentData) public commitments;
    mapping(uint256 => mapping(address => uint256)) public investments;

    event CommitmentCreated(uint256 indexed id, address indexed beneficiary, uint256 deadline, string description);
    event FundsDeposited(uint256 indexed id, address indexed investor, uint256 amount);
    event CommitmentCompleted(uint256 indexed id, address indexed beneficiary, uint256 amount);
    event CommitmentFailed(uint256 indexed id, uint256 amount);

    constructor(address _aiAgent, address _commitmentPool) {
        owner = msg.sender;
        aiAgent = _aiAgent;
        commitmentPool = ICommitmentPool(_commitmentPool);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner");
        _;
    }

    modifier onlyAgent() {
        require(msg.sender == aiAgent, "Solo el agente IA");
        _;
    }

    function createCommitment(
        address _beneficiary,
        uint256 _deadline,
        string calldata _description
    ) external returns (uint256) {
        require(_beneficiary != address(0), "Beneficiario invalido");
        require(_deadline > block.timestamp, "Deadline invalido");

        uint256 id = nextCommitmentId++;
        commitments[id] = CommitmentData({
            beneficiary: _beneficiary,
            deadline: _deadline,
            totalFunds: 0,
            status: Status.Active,
            description: _description
        });

        emit CommitmentCreated(id, _beneficiary, _deadline, _description);
        return id;
    }

    function invest(uint256 _id) external payable {
        CommitmentData storage c = commitments[_id];
        require(c.beneficiary != address(0), "Compromiso no existe");
        require(c.status == Status.Active, "Compromiso no activo");
        require(block.timestamp < c.deadline, "Plazo vencido");
        require(msg.value > 0, "Monto debe ser mayor a 0");

        investments[_id][msg.sender] += msg.value;
        c.totalFunds += msg.value;

        emit FundsDeposited(_id, msg.sender, msg.value);
    }

    // El agente IA llama esto cuando verifica que el compromiso se cumplió
    function markCompleted(uint256 _id) external onlyAgent {
        CommitmentData storage c = commitments[_id];
        require(c.status == Status.Active, "Compromiso no activo");

        c.status = Status.Completed;
        uint256 amount = c.totalFunds;
        c.totalFunds = 0;

        if (amount > 0) {
            payable(c.beneficiary).transfer(amount);
        }

        emit CommitmentCompleted(_id, c.beneficiary, amount);
    }

    // El agente IA llama esto cuando el plazo venció sin cumplimiento
    function markFailed(uint256 _id) external onlyAgent {
        CommitmentData storage c = commitments[_id];
        require(c.status == Status.Active, "Compromiso no activo");
        require(block.timestamp >= c.deadline, "Plazo no vencido aun");

        c.status = Status.Failed;
        uint256 amount = c.totalFunds;
        c.totalFunds = 0;

        if (amount > 0) {
            commitmentPool.deposit{value: amount}();
        }

        emit CommitmentFailed(_id, amount);
    }

    function setAiAgent(address _newAgent) external onlyOwner {
        aiAgent = _newAgent;
    }

    function getCommitment(uint256 _id) external view returns (CommitmentData memory) {
        return commitments[_id];
    }

    function getInvestment(uint256 _id, address _investor) external view returns (uint256) {
        return investments[_id][_investor];
    }
}
