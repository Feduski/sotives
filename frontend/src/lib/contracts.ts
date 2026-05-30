/**
 * ABIs mínimos para interactuar con los contratos desde el frontend.
 * Las funciones que llama el usuario directamente (createCommitment, supportCommitment, submitEvidence).
 * resolveCommitment lo llama el backend, no el frontend.
 */

export const COMMITMENT_MANAGER_ABI = [
  {
    name: "createCommitment",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_goal", type: "string" },
      { name: "_deadline", type: "uint256" },
      { name: "_criteria", type: "string" },
      { name: "_evidenceType", type: "string" },
      { name: "_groupId", type: "uint256" },
      { name: "_joinPrice", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "supportCommitment",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "_id", type: "uint256" }],
    outputs: [],
  },
  {
    name: "submitEvidence",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_id", type: "uint256" },
      { name: "_evidenceHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "getCommitment",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_id", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "creator", type: "address" },
          { name: "deadline", type: "uint256" },
          { name: "totalFunds", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "goal", type: "string" },
          { name: "criteria", type: "string" },
          { name: "evidenceType", type: "string" },
          { name: "evidenceHash", type: "bytes32" },
          { name: "groupId", type: "uint256" },
          { name: "joinPrice", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "getUserCommitments",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_user", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "reputation",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "nextCommitmentId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const GROUP_MULTISIG_ABI = [
  {
    name: "createGroup",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_members", type: "address[]" },
      { name: "_requiredSignatures", type: "uint256" },
      { name: "_name", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "proposeAction",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_groupId", type: "uint256" },
      { name: "_actionType", type: "uint8" },
      { name: "_data", type: "bytes" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "approveProposal",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_groupId", type: "uint256" },
      { name: "_proposalId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "getGroup",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_groupId", type: "uint256" }],
    outputs: [
      { name: "name", type: "string" },
      { name: "members", type: "address[]" },
      { name: "requiredSignatures", type: "uint256" },
    ],
  },
  {
    name: "isMember",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_groupId", type: "uint256" },
      { name: "_address", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "nextGroupId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// Status del compromiso (mismo orden que el enum en Solidity)
export const COMMITMENT_STATUS = {
  0: "Active",
  1: "EvidenceSubmitted",
  2: "Fulfilled",
  3: "Failed",
} as const;

// Tipos de evidencia que acepta el backend (ValidatorAgent)
export const EVIDENCE_TYPES = ["URL", "TEXT", "GITHUB", "IMAGEN"] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];
