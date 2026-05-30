// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

contract GroupMultisig {

    uint256 public nextGroupId;
    uint256 public nextProposalId;

    enum ActionType { AddMember, RemoveMember, CreateCommitment }
    enum ProposalStatus { Pending, Executed, Cancelled }

    struct Group {
        string name;
        address[] members;
        uint256 requiredSignatures;
        bool exists;
    }

    struct Proposal {
        uint256 groupId;
        ActionType actionType;
        bytes data;
        uint256 approvals;
        ProposalStatus status;
        address proposer;
    }

    mapping(uint256 => Group) public groups;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public isMemberOf;
    mapping(uint256 => mapping(address => bool)) public hasApproved;

    event GroupCreated(uint256 indexed groupId, string name, address[] members, uint256 requiredSignatures);
    event ProposalCreated(uint256 indexed proposalId, uint256 indexed groupId, ActionType actionType, address proposer);
    event ProposalApproved(uint256 indexed proposalId, address approver, uint256 totalApprovals);
    event ProposalExecuted(uint256 indexed proposalId);
    event MemberAdded(uint256 indexed groupId, address member);
    event MemberRemoved(uint256 indexed groupId, address member);

    modifier onlyMember(uint256 _groupId) {
        require(isMemberOf[_groupId][msg.sender], "No eres miembro del grupo");
        _;
    }

    function createGroup(
        address[] calldata _members,
        uint256 _requiredSignatures,
        string calldata _name
    ) external returns (uint256) {
        require(_members.length >= 2, "Minimo 2 miembros");
        require(_requiredSignatures >= 1 && _requiredSignatures <= _members.length, "Firmas requeridas invalidas");

        uint256 groupId = nextGroupId++;

        groups[groupId] = Group({
            name: _name,
            members: _members,
            requiredSignatures: _requiredSignatures,
            exists: true
        });

        for (uint256 i = 0; i < _members.length; i++) {
            isMemberOf[groupId][_members[i]] = true;
        }

        emit GroupCreated(groupId, _name, _members, _requiredSignatures);
        return groupId;
    }

    function proposeAction(
        uint256 _groupId,
        ActionType _actionType,
        bytes calldata _data
    ) external onlyMember(_groupId) returns (uint256) {
        require(groups[_groupId].exists, "Grupo no existe");

        uint256 proposalId = nextProposalId++;

        proposals[proposalId] = Proposal({
            groupId: _groupId,
            actionType: _actionType,
            data: _data,
            approvals: 1,
            status: ProposalStatus.Pending,
            proposer: msg.sender
        });

        hasApproved[proposalId][msg.sender] = true;

        emit ProposalCreated(proposalId, _groupId, _actionType, msg.sender);
        emit ProposalApproved(proposalId, msg.sender, 1);

        if (groups[_groupId].requiredSignatures == 1) {
            _executeProposal(proposalId);
        }

        return proposalId;
    }

    function approveProposal(uint256 _groupId, uint256 _proposalId) external onlyMember(_groupId) {
        Proposal storage p = proposals[_proposalId];
        require(p.groupId == _groupId, "Propuesta no pertenece al grupo");
        require(p.status == ProposalStatus.Pending, "Propuesta no pendiente");
        require(!hasApproved[_proposalId][msg.sender], "Ya aprobaste esta propuesta");

        hasApproved[_proposalId][msg.sender] = true;
        p.approvals++;

        emit ProposalApproved(_proposalId, msg.sender, p.approvals);

        if (p.approvals >= groups[_groupId].requiredSignatures) {
            _executeProposal(_proposalId);
        }
    }

    function _executeProposal(uint256 _proposalId) internal {
        Proposal storage p = proposals[_proposalId];
        p.status = ProposalStatus.Executed;

        if (p.actionType == ActionType.AddMember) {
            address newMember = abi.decode(p.data, (address));
            _addMember(p.groupId, newMember);
        } else if (p.actionType == ActionType.RemoveMember) {
            address memberToRemove = abi.decode(p.data, (address));
            _removeMember(p.groupId, memberToRemove);
        }
        // CreateCommitment: el backend lee el evento y llama a CommitmentManager

        emit ProposalExecuted(_proposalId);
    }

    function _addMember(uint256 _groupId, address _member) internal {
        require(!isMemberOf[_groupId][_member], "Ya es miembro");
        groups[_groupId].members.push(_member);
        isMemberOf[_groupId][_member] = true;
        emit MemberAdded(_groupId, _member);
    }

    function _removeMember(uint256 _groupId, address _member) internal {
        require(isMemberOf[_groupId][_member], "No es miembro");
        isMemberOf[_groupId][_member] = false;

        address[] storage members = groups[_groupId].members;
        for (uint256 i = 0; i < members.length; i++) {
            if (members[i] == _member) {
                members[i] = members[members.length - 1];
                members.pop();
                break;
            }
        }

        emit MemberRemoved(_groupId, _member);
    }

    function isMember(uint256 _groupId, address _address) external view returns (bool) {
        return isMemberOf[_groupId][_address];
    }

    function getGroup(uint256 _groupId) external view returns (
        string memory name,
        address[] memory members,
        uint256 requiredSignatures
    ) {
        Group storage g = groups[_groupId];
        require(g.exists, "Grupo no existe");
        return (g.name, g.members, g.requiredSignatures);
    }

    function getProposal(uint256 _proposalId) external view returns (Proposal memory) {
        return proposals[_proposalId];
    }
}
