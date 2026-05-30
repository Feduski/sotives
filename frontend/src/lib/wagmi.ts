import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { monadTestnet } from "viem/chains";

export { monadTestnet };

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [
    injected({ shimDisconnect: true }),
  ],
  transports: {
    [monadTestnet.id]: http("https://testnet-rpc.monad.xyz"),
  },
  ssr: true,
});

export const CONTRACTS = {
  commitmentManager: process.env.NEXT_PUBLIC_COMMITMENT_MANAGER_ADDRESS as `0x${string}`,
  commitmentPool: process.env.NEXT_PUBLIC_COMMITMENT_POOL_ADDRESS as `0x${string}`,
  groupMultisig: process.env.NEXT_PUBLIC_MULTISIG_ADDRESS as `0x${string}`,
};

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
