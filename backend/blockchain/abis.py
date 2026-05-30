"""
ABIs de los contratos de soTives.
Se actualizan cuando el equipo de contratos hace el deploy.
"""

# CommitmentManager — contrato principal de compromisos
COMMITMENT_MANAGER_ABI = [
    {
        "name": "createCommitment",
        "type": "function",
        "stateMutability": "payable",
        "inputs": [
            {"name": "goal", "type": "string"},
            {"name": "deadline", "type": "uint256"},
            {"name": "criteria", "type": "string"},
            {"name": "evidenceType", "type": "string"},
            {"name": "groupId", "type": "uint256"},  # 0 = individual
        ],
        "outputs": [{"name": "commitmentId", "type": "uint256"}],
    },
    {
        "name": "submitEvidence",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "commitmentId", "type": "uint256"},
            {"name": "evidenceHash", "type": "string"},
        ],
        "outputs": [],
    },
    {
        "name": "resolveCommitment",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "commitmentId", "type": "uint256"},
            {"name": "fulfilled", "type": "bool"},
        ],
        "outputs": [],
    },
    {
        "name": "supportCommitment",
        "type": "function",
        "stateMutability": "payable",
        "inputs": [{"name": "commitmentId", "type": "uint256"}],
        "outputs": [],
    },
    {
        "name": "getCommitment",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "commitmentId", "type": "uint256"}],
        "outputs": [
            {"name": "owner", "type": "address"},
            {"name": "goal", "type": "string"},
            {"name": "deadline", "type": "uint256"},
            {"name": "criteria", "type": "string"},
            {"name": "evidenceType", "type": "string"},
            {"name": "stake", "type": "uint256"},
            {"name": "state", "type": "uint8"},  # 0=ACTIVE, 1=EVIDENCE_SUBMITTED, 2=FULFILLED, 3=FAILED
            {"name": "groupId", "type": "uint256"},
        ],
    },
    {
        "name": "getUserCommitments",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "user", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256[]"}],
    },
    {
        "name": "CommitmentCreated",
        "type": "event",
        "inputs": [
            {"name": "commitmentId", "type": "uint256", "indexed": True},
            {"name": "owner", "type": "address", "indexed": True},
            {"name": "stake", "type": "uint256", "indexed": False},
        ],
    },
    {
        "name": "CommitmentResolved",
        "type": "event",
        "inputs": [
            {"name": "commitmentId", "type": "uint256", "indexed": True},
            {"name": "fulfilled", "type": "bool", "indexed": False},
        ],
    },
]

# GroupMultisig — para compromisos grupales con multifirma
GROUP_MULTISIG_ABI = [
    {
        "name": "createGroup",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "members", "type": "address[]"},
            {"name": "requiredSignatures", "type": "uint256"},
            {"name": "name", "type": "string"},
        ],
        "outputs": [{"name": "groupId", "type": "uint256"}],
    },
    {
        "name": "addMember",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "groupId", "type": "uint256"},
            {"name": "newMember", "type": "address"},
        ],
        "outputs": [],
    },
    {
        "name": "proposeAction",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "groupId", "type": "uint256"},
            {"name": "actionType", "type": "uint8"},  # 0=ADD_MEMBER, 1=REMOVE_MEMBER, 2=CREATE_COMMITMENT
            {"name": "data", "type": "bytes"},
        ],
        "outputs": [{"name": "proposalId", "type": "uint256"}],
    },
    {
        "name": "approveProposal",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "groupId", "type": "uint256"},
            {"name": "proposalId", "type": "uint256"},
        ],
        "outputs": [],
    },
    {
        "name": "getGroup",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "groupId", "type": "uint256"}],
        "outputs": [
            {"name": "name", "type": "string"},
            {"name": "members", "type": "address[]"},
            {"name": "requiredSignatures", "type": "uint256"},
            {"name": "commitmentIds", "type": "uint256[]"},
        ],
    },
    {
        "name": "isMember",
        "type": "function",
        "stateMutability": "view",
        "inputs": [
            {"name": "groupId", "type": "uint256"},
            {"name": "user", "type": "address"},
        ],
        "outputs": [{"name": "", "type": "bool"}],
    },
]
