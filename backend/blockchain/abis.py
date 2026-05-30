"""ABIs reales extraídos de los contratos deployados en Monad Testnet."""

COMMITMENT_MANAGER_ABI = [
    # ── Write ──────────────────────────────────────────────────────────────────
    {
        "name": "createCommitment",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "_goal", "type": "string"},
            {"name": "_deadline", "type": "uint256"},
            {"name": "_criteria", "type": "string"},
            {"name": "_evidenceType", "type": "string"},
            {"name": "_groupId", "type": "uint256"},
            {"name": "_joinPrice", "type": "uint256"},
        ],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "name": "supportCommitment",
        "type": "function",
        "stateMutability": "payable",
        "inputs": [{"name": "_id", "type": "uint256"}],
        "outputs": [],
    },
    {
        "name": "submitEvidence",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "_id", "type": "uint256"},
            {"name": "_evidenceHash", "type": "bytes32"},
        ],
        "outputs": [],
    },
    {
        "name": "resolveCommitment",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "_id", "type": "uint256"},
            {"name": "_fulfilled", "type": "bool"},
        ],
        "outputs": [],
    },
    {
        "name": "markExpired",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [{"name": "_id", "type": "uint256"}],
        "outputs": [],
    },
    {
        "name": "setAiAgent",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [{"name": "_newAgent", "type": "address"}],
        "outputs": [],
    },
    # ── Read ───────────────────────────────────────────────────────────────────
    {
        "name": "getCommitment",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "_id", "type": "uint256"}],
        "outputs": [
            {
                "name": "",
                "type": "tuple",
                "components": [
                    {"name": "creator", "type": "address"},
                    {"name": "deadline", "type": "uint256"},
                    {"name": "totalFunds", "type": "uint256"},
                    {"name": "status", "type": "uint8"},  # 0=Active,1=EvidenceSubmitted,2=Fulfilled,3=Failed
                    {"name": "goal", "type": "string"},
                    {"name": "criteria", "type": "string"},
                    {"name": "evidenceType", "type": "string"},
                    {"name": "evidenceHash", "type": "bytes32"},
                    {"name": "groupId", "type": "uint256"},
                ],
            }
        ],
    },
    {
        "name": "getUserCommitments",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "_user", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256[]"}],
    },
    {
        "name": "getContribution",
        "type": "function",
        "stateMutability": "view",
        "inputs": [
            {"name": "_id", "type": "uint256"},
            {"name": "_user", "type": "address"},
        ],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "name": "reputation",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "name": "nextCommitmentId",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "name": "aiAgent",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "address"}],
    },
    {
        "name": "owner",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "address"}],
    },
    # ── Events ─────────────────────────────────────────────────────────────────
    {
        "name": "CommitmentCreated",
        "type": "event",
        "inputs": [
            {"name": "id", "type": "uint256", "indexed": True},
            {"name": "creator", "type": "address", "indexed": True},
            {"name": "deadline", "type": "uint256", "indexed": False},
            {"name": "joinPrice", "type": "uint256", "indexed": False},
        ],
    },
    {
        "name": "CommitmentFulfilled",
        "type": "event",
        "inputs": [
            {"name": "id", "type": "uint256", "indexed": True},
            {"name": "creator", "type": "address", "indexed": True},
            {"name": "amount", "type": "uint256", "indexed": False},
        ],
    },
    {
        "name": "CommitmentFailed",
        "type": "event",
        "inputs": [
            {"name": "id", "type": "uint256", "indexed": True},
            {"name": "amount", "type": "uint256", "indexed": False},
        ],
    },
    {
        "name": "EvidenceSubmitted",
        "type": "event",
        "inputs": [
            {"name": "id", "type": "uint256", "indexed": True},
            {"name": "evidenceHash", "type": "bytes32", "indexed": False},
        ],
    },
    {
        "name": "ReputationUpdated",
        "type": "event",
        "inputs": [
            {"name": "user", "type": "address", "indexed": True},
            {"name": "newScore", "type": "uint256", "indexed": False},
        ],
    },
]

COMMITMENT_POOL_ABI = [
    {
        "name": "deposit",
        "type": "function",
        "stateMutability": "payable",
        "inputs": [],
        "outputs": [],
    },
    {
        "name": "authorize",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [{"name": "_contract", "type": "address"}],
        "outputs": [],
    },
    {
        "name": "invest",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_amount", "type": "uint256"},
        ],
        "outputs": [],
    },
    {
        "name": "totalFunds",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "name": "authorized",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "", "type": "address"}],
        "outputs": [{"name": "", "type": "bool"}],
    },
    {
        "name": "owner",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "address"}],
    },
]

GROUP_MULTISIG_ABI = [
    # ── Write ──────────────────────────────────────────────────────────────────
    {
        "name": "createGroup",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "_members", "type": "address[]"},
            {"name": "_requiredSignatures", "type": "uint256"},
            {"name": "_name", "type": "string"},
        ],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "name": "proposeAction",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "_groupId", "type": "uint256"},
            {"name": "_actionType", "type": "uint8"},  # 0=AddMember,1=RemoveMember,2=CreateCommitment
            {"name": "_data", "type": "bytes"},
        ],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "name": "approveProposal",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "_groupId", "type": "uint256"},
            {"name": "_proposalId", "type": "uint256"},
        ],
        "outputs": [],
    },
    # ── Read ───────────────────────────────────────────────────────────────────
    {
        "name": "getGroup",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "_groupId", "type": "uint256"}],
        "outputs": [
            {"name": "name", "type": "string"},
            {"name": "members", "type": "address[]"},
            {"name": "requiredSignatures", "type": "uint256"},
        ],
    },
    {
        "name": "getProposal",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "_proposalId", "type": "uint256"}],
        "outputs": [
            {
                "name": "",
                "type": "tuple",
                "components": [
                    {"name": "groupId", "type": "uint256"},
                    {"name": "actionType", "type": "uint8"},
                    {"name": "data", "type": "bytes"},
                    {"name": "approvals", "type": "uint256"},
                    {"name": "status", "type": "uint8"},  # 0=Pending,1=Executed,2=Cancelled
                    {"name": "proposer", "type": "address"},
                ],
            }
        ],
    },
    {
        "name": "isMember",
        "type": "function",
        "stateMutability": "view",
        "inputs": [
            {"name": "_groupId", "type": "uint256"},
            {"name": "_address", "type": "address"},
        ],
        "outputs": [{"name": "", "type": "bool"}],
    },
    {
        "name": "nextGroupId",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    # ── Events ─────────────────────────────────────────────────────────────────
    {
        "name": "GroupCreated",
        "type": "event",
        "inputs": [
            {"name": "groupId", "type": "uint256", "indexed": True},
            {"name": "name", "type": "string", "indexed": False},
            {"name": "members", "type": "address[]", "indexed": False},
            {"name": "requiredSignatures", "type": "uint256", "indexed": False},
        ],
    },
    {
        "name": "ProposalExecuted",
        "type": "event",
        "inputs": [{"name": "proposalId", "type": "uint256", "indexed": True}],
    },
]
