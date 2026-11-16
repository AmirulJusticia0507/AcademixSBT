"use client";

import { useEffect, useState } from "react";
import { readTotalSupply } from "@/lib/chain";
import { getSupportedChains } from "@/lib/chains";

export function ChainStats() {
  const [totalSupply, setTotalSupply] = useState<number | null>(null);
  const chains = getSupportedChains();

  useEffect(() => {
    if (chains.length === 0) return;
    let active = true;
    Promise.all(chains.map((chain) => readTotalSupply(chain)))
      .then((values) => { if (active) setTotalSupply(values.reduce((sum, value) => sum + value, 0)); })
      .catch(() => {
        if (active) setTotalSupply(null);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="stats">
      <div className="stat">
        <strong>{totalSupply === null ? "—" : totalSupply.toLocaleString("id-ID")}</strong>
        <span>SBT ijazah terbit on-chain</span>
      </div>
      <div className="stat">
        <strong>{chains.length ? chains.map((chain) => chain.name).join(" + ") : "Belum dikonfigurasi"}</strong>
        <span>Multichain EVM · verifikasi read-only</span>
      </div>
      <div className="stat">
        <strong>ERC-5192</strong>
        <span>Non-transferable · metadata IPFS</span>
      </div>
    </div>
  );
}
