"use client";

import { useState } from "react";
import Link from "next/link";
import { config } from "@/lib/config";
import { isValidAddress } from "@/lib/format";

type ChainPortfolio = {
  network: string;
  networkName: string;
  native: { wei: string; eth: string; symbol: string } | null;
  tokens: Array<{ contractAddress: string; symbol?: string; name?: string; decimals?: number; balance: string; balanceFormatted?: string }>;
  transfers: Array<{ hash: string; from: string; to?: string; value?: number; asset?: string; category: string; blockNum: string; metadata?: { blockTimestamp?: string } }>;
  nfts: { totalCount: number; sample: Array<{ contract: string; tokenId: string; name?: string; image?: string }> };
  errors: string[];
};

type PortfolioResponse = { address: string; chains: ChainPortfolio[] };

export default function PortfolioPage() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PortfolioResponse | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = address.trim();
    if (!isValidAddress(value)) {
      setError("Alamat wallet harus 0x + 40 karakter hex.");
      return;
    }
    setError(null);
    setLoading(true);
    setData(null);
    try {
      const res = await fetch(`${config.apiUrl}/api/portfolio/${value}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || json?.message || "Gagal memuat portfolio");
      setData(json as PortfolioResponse);
    } catch (err: any) {
      setError(err.message || "Gagal memuat portfolio");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section">
      <div className="container">
        <p className="eyebrow">Option 1 — Alchemy multichain</p>
        <h1>Portfolio Dashboard</h1>
        <p className="lede">
          Lihat saldo native, token ERC-20, transfer terbaru, dan NFT untuk satu alamat di{" "}
          <strong>Arbitrum One</strong> dan <strong>Polygon PoS</strong> (via Alchemy API, melalui backend).
        </p>

        <form className="verify-form" style={{ maxWidth: 720, marginTop: "1rem" }} onSubmit={onSubmit}>
          <label htmlFor="portfolio-address" className="sr-only">Alamat wallet</label>
          <input
            id="portfolio-address"
            className="input"
            placeholder="0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
          <button className="button button-primary" type="submit" disabled={loading}>
            {loading ? "Memuat..." : "Lihat Portfolio"}
          </button>
        </form>

        {error && <p className="alert alert-error" style={{ marginTop: "1rem" }}>{error}</p>}
        {!data && !error && (
          <p className="muted small" style={{ marginTop: "1rem" }}>
            Butuh <code>ALCHEMY_API_KEY</code> di <code>backend/.env</code>. Endpoint: <code>{config.apiUrl}/api/portfolio/:address</code>
          </p>
        )}

        {data && (
          <div style={{ marginTop: "2rem", display: "grid", gap: "1.5rem" }}>
            <p className="muted">Alamat: <code>{data.address}</code></p>
            {data.chains.map((chain) => (
              <article key={chain.network} className="feature-card" style={{ padding: "1.25rem" }}>
                <h2 style={{ marginTop: 0 }}>{chain.networkName} <span className="muted small">({chain.network})</span></h2>

                {chain.errors.length > 0 && (
                  <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
                    Sebagian data gagal dimuat: {chain.errors.join("; ")}
                  </div>
                )}

                <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
                  <div>
                    <h3>Native Balance</h3>
                    {chain.native ? (
                      <p><strong>{chain.native.eth}</strong> {chain.native.symbol} <span className="muted small">({chain.native.wei} wei)</span></p>
                    ) : <p className="muted">Tidak tersedia</p>}
                  </div>
                  <div>
                    <h3>Token ERC-20 (non-zero, maks 20)</h3>
                    {chain.tokens.length === 0 ? <p className="muted">Tidak ada / tidak tersedia</p> : (
                      <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                        {chain.tokens.map((t) => (
                          <li key={t.contractAddress}>
                            <strong>{t.balanceFormatted ?? t.balance}</strong> {t.symbol || "?"} <span className="muted small">{t.name || t.contractAddress}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: "1rem" }}>
                  <h3>Transfer Terbaru (maks 10)</h3>
                  {chain.transfers.length === 0 ? <p className="muted">Tidak ada / tidak tersedia</p> : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead><tr><th align="left">Tx</th><th align="left">Kategori</th><th align="left">Aset</th><th align="left">Nilai</th><th align="left">Dari → Ke</th></tr></thead>
                        <tbody>
                          {chain.transfers.map((t, i) => (
                            <tr key={`${t.hash}-${i}`}>
                              <td><code>{t.hash?.slice(0, 10)}…</code></td>
                              <td>{t.category}</td>
                              <td>{t.asset || "-"}</td>
                              <td>{t.value ?? "-"}</td>
                              <td className="small"><code>{t.from?.slice(0, 8)}…</code> → <code>{t.to?.slice(0, 8) || "-"}…</code></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: "1rem" }}>
                  <h3>NFT ({chain.nfts.totalCount} total)</h3>
                  {chain.nfts.sample.length === 0 ? <p className="muted">Tidak ada / tidak tersedia</p> : (
                    <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                      {chain.nfts.sample.map((n, i) => (
                        <li key={`${n.contract}-${n.tokenId}-${i}`}>{n.name || `Token #${n.tokenId}`} <span className="muted small">({n.contract})</span></li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <p style={{ marginTop: "2rem" }}><Link href="/" className="muted">← Kembali ke Verifikasi Ijazah</Link></p>
      </div>
    </section>
  );
}
