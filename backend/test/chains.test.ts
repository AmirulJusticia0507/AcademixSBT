import { describe, expect, it } from "vitest";
import { ChainRegistry, parseChainsJson } from "../src/lib/chains";

describe("ChainRegistry multi-chain (P2)", () => {
  it("parse CHAINS_JSON valid", () => {
    const chains = parseChainsJson(
      '[{"chainId":421614,"rpcUrl":"https://sepolia-rollup.arbitrum.io/rpc","contractAddress":"0x00000000000000000000000000000000000000B2"}]',
    );
    expect(chains).toHaveLength(1);
    expect(chains[0].name).toBe("Arbitrum Sepolia");
  });

  it("parse CHAINS_JSON tidak valid melempar error", () => {
    expect(() => parseChainsJson("bukan-json")).toThrow();
    expect(() => parseChainsJson('[{"chainId":0}]')).toThrow();
  });

  it("registry resolve ke primary bila chainId tidak dikenal", () => {
    const registry = new ChainRegistry({
      chainId: 80002, name: "Polygon Amoy", rpcUrl: "https://rpc-amoy.polygon.technology", contractAddress: "0x00000000000000000000000000000000000000B2",
    });
    expect(registry.resolve(999999).chainId).toBe(80002);
    expect(registry.list()).toHaveLength(1);
  });
});
