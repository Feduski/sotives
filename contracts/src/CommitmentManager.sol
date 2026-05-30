// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

interface ICommitmentPool {
    function deposit() external payable;
}

contract CommitmentManager {

    address public owner;
    address public aiAgent;
    ICommitmentPool public commitmentPool;

    uint256 public nextCommitmentId;

    enum Status { Active, EvidenceSubmitted, Fulfilled, Failed }

    struct CommitmentData {
        address creator;
        uint256 deadline;
        uint256 totalFunds;
        Status status;
        string goal;
        string criteria;
        string evidenceType;
        bytes32 evidenceHash;
        uint256 groupId;
    }

    // reputation score per address
    mapping(address => uint256) public reputation;

    mapping(uint256 => CommitmentData) public commitments;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    mapping(address => uint256[]) private userCommitmentIds;

    event CommitmentCreated(uint256 indexed id, address indexed creator, uint256 deadline, uint256 stake);
    event CommitmentSupported(uint256 indexed id, address indexed supporter, uint256 amount);
    event EvidenceSubmitted(uint256 indexed id, bytes32 evidenceHash);
    event CommitmentFulfilled(uint256 indexed id, address indexed creator, uint256 amount);
    event CommitmentFailed(uint256 indexed id, uint256 amount);
    event ReputationUpdated(address indexed user, uint256 newScore);

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
        string calldata _goal,
        uint256 _deadline,
        string calldata _criteria,
        string calldata _evidenceType,
        uint256 _groupId
    ) external payable returns (uint256) {
        require(_deadline > block.timestamp, "Deadline invalido");
        require(msg.value > 0, "Stake requerido");

        uint256 id = nextCommitmentId++;

        commitments[id] = CommitmentData({
            creator: msg.sender,
            deadline: _deadline,
            totalFunds: msg.value,
            status: Status.Active,
            goal: _goal,
            criteria: _criteria,
            evidenceType: _evidenceType,
            evidenceHash: bytes32(0),
            groupId: _groupId
        });

        contributions[id][msg.sender] = msg.value;
        userCommitmentIds[msg.sender].push(id);

        emit CommitmentCreated(id, msg.sender, _deadline, msg.value);
        return id;
    }

    function supportCommitment(uint256 _id) external payable {
        CommitmentData storage c = commitments[_id];
        require(c.creator != address(0), "Compromiso no existe");
        require(c.status == Status.Active, "Compromiso no activo");
        require(block.timestamp < c.deadline, "Plazo vencido");
        require(msg.value > 0, "Monto debe ser mayor a 0");

        contributions[_id][msg.sender] += msg.value;
        c.totalFunds += msg.value;

        emit CommitmentSupported(_id, msg.sender, msg.value);
    }

    function submitEvidence(uint256 _id, bytes32 _evidenceHash) external {
        CommitmentData storage c = commitments[_id];
        require(c.creator == msg.sender, "Solo el creador puede subir evidencia");
        require(c.status == Status.Active, "Compromiso no activo");
        require(block.timestamp < c.deadline, "Plazo vencido");

        c.evidenceHash = _evidenceHash;
        c.status = Status.EvidenceSubmitted;

        emit EvidenceSubmitted(_id, _evidenceHash);
    }

    function resolveCommitment(uint256 _id, bool _fulfilled) external onlyAgent {
        CommitmentData storage c = commitments[_id];
        require(c.status == Status.EvidenceSubmitted, "Evidencia no enviada");

        uint256 amount = c.totalFunds;
        c.totalFunds = 0;

        if (_fulfilled) {
            c.status = Status.Fulfilled;
            reputation[c.creator] += 10;
            if (amount > 0) {
                payable(c.creator).transfer(amount);
            }
            emit CommitmentFulfilled(_id, c.creator, amount);
            emit ReputationUpdated(c.creator, reputation[c.creator]);
        } else {
            c.status = Status.Failed;
            if (amount > 0) {
                commitmentPool.deposit{value: amount}();
            }
            emit CommitmentFailed(_id, amount);
        }
    }

    // Marca como fallido si venció el plazo sin evidencia
    function markExpired(uint256 _id) external onlyAgent {
        CommitmentData storage c = commitments[_id];
        require(c.status == Status.Active, "Compromiso no activo");
        require(block.timestamp >= c.deadline, "Plazo no vencido");

        c.status = Status.Failed;
        uint256 amount = c.totalFunds;
        c.totalFunds = 0;

        if (amount > 0) {
            commitmentPool.deposit{value: amount}();
        }

        emit CommitmentFailed(_id, amount);
    }

    function getCommitment(uint256 _id) external view returns (CommitmentData memory) {
        return commitments[_id];
    }

    function getUserCommitments(address _user) external view returns (uint256[] memory) {
        return userCommitmentIds[_user];
    }

    function getContribution(uint256 _id, address _user) external view returns (uint256) {
        return contributions[_id][_user];
    }

    function setAiAgent(address _newAgent) external onlyOwner {
        require(_newAgent != address(0), "Address invalido");
        aiAgent = _newAgent;
    }
}
