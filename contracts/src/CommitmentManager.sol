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
        uint256 joinPrice;   // precio mínimo para unirse (en wei); 0 = gratis
    }

    mapping(address => uint256) public reputation;
    mapping(uint256 => CommitmentData) public commitments;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    mapping(address => uint256[]) private userCommitmentIds;

    event CommitmentCreated(uint256 indexed id, address indexed creator, uint256 deadline, uint256 joinPrice);
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

    // Crear un compromiso es GRATUITO. El creador define joinPrice para que otros se unan.
    function createCommitment(
        string calldata _goal,
        uint256 _deadline,
        string calldata _criteria,
        string calldata _evidenceType,
        uint256 _groupId,
        uint256 _joinPrice
    ) external returns (uint256) {
        require(_deadline > block.timestamp, "Deadline invalido");

        uint256 id = nextCommitmentId++;

        commitments[id] = CommitmentData({
            creator: msg.sender,
            deadline: _deadline,
            totalFunds: 0,
            status: Status.Active,
            goal: _goal,
            criteria: _criteria,
            evidenceType: _evidenceType,
            evidenceHash: bytes32(0),
            groupId: _groupId,
            joinPrice: _joinPrice
        });

        userCommitmentIds[msg.sender].push(id);

        emit CommitmentCreated(id, msg.sender, _deadline, _joinPrice);
        return id;
    }

    // Unirse a un compromiso pagando el joinPrice (o más). 0 joinPrice = gratis.
    function supportCommitment(uint256 _id) external payable {
        CommitmentData storage c = commitments[_id];
        require(c.creator != address(0), "Compromiso no existe");
        require(c.status == Status.Active, "Compromiso no activo");
        require(block.timestamp < c.deadline, "Plazo vencido");
        require(msg.value >= c.joinPrice, "Monto menor al joinPrice");
        require(msg.value > 0 || c.joinPrice == 0, "Enviar MON para unirse");

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

    // El agente IA resuelve el compromiso. Si cumplido, el creador recibe todos los fondos.
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
