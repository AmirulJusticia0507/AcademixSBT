"use client";

import { useEffect, useState } from "react";
import { readTotalSupply } from "@/lib/chain";
import { config, isContractConfigured } from "@/lib/config";

export function ChainStats() {
  const [totalSupply, setTotalSupply] = useState<number | null>(null);

  useEffect(() => {
    if (!isContractConfigured) return;
    let active = true;
    readTotalSupply()
      .then((value) => {
        if (active) setTotalSupply(value);
      })
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
        <strong>{config.chainId === 80002 ? "Polygon Amoy" : `Chain ${config.chainId}`}</strong>
        <span>Testnet EVM · verifikasi read-only</span>
      </div>
      <div className="stat">
        <strong>ERC-5192</strong>
        <span>Non-transferable · metadata IPFS</span>
      </div>
    </div>
  );
}
