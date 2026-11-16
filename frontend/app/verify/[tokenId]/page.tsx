"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DiplomaCard } from "@/components/DiplomaCard";
import { StatusBadge } from "@/components/StatusBadge";
import { InvalidInputError } from "@/lib/chain";
import { getTargetChains } from "@/lib/chains";
import { verifyTokenMulti, type MultiVerifyResult } from "@/lib/verification";

type State =
  | { status: "loading" }
  | { status: "ok"; data: MultiVerifyResult }
  | { status: "error"; message: string; hint?: string };

export default function VerifyPage() {
  const params = useParams<{ tokenId: string }>();
  const tokenId = params?.tokenId ?? "";
  const [state, setState] = useState<State>({ status: "loading" });
  const targets = getTargetChains();

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });

    verifyTokenMulti(tokenId)
      .then((data) => {
        if (active) setState({ status: "ok", data });
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof InvalidInputError) {
          setState({ status: "error", message: error.message });
          return;
        }
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Gagal memverifikasi ijazah.",
          hint: "Periksa konfigurasi kontrak (NEXT_PUBLIC_ARB_CONTRACT_ADDRESS / NEXT_PUBLIC_POLYGON_CONTRACT_ADDRESS), koneksi RPC, dan gateway IPFS.",
        });
      });

    return () => {
      active = false;
    };
  }, [tokenId]);

  return (
    <div className="page">
      <div className="container">
        <div className="page-head">
          <div>
            <p className="eyebrow">Portal verifikasi publik · Multichain</p>
            <h1>Verifikasi Token #{tokenId || "—"}</h1>
            <p className="muted small">Pencarian di: Arbitrum One & Polygon PoS (sesuai kontrak yang dikonfigurasi).</p>
          </div>
          <Link href="/" className="button button-ghost">
            ← Verifikasi lain
          </Link>
        </div>

        {targets.some((t) => !t.configured) && (
          <p className="alert alert-warning" style={{ marginBottom: "1rem" }}>
            Chain yang belum dikonfigurasi kontraknya: {targets.filter((t) => !t.configured).map((t) => t.name).join(", ")}. Set env <code>NEXT_PUBLIC_ARB_CONTRACT_ADDRESS</code> / <code>NEXT_PUBLIC_POLYGON_CONTRACT_ADDRESS</code>.
          </p>
        )}

        {state.status === "loading" && (
          <div className="result-stack">
            <div className="loading-state">
              <span className="spinner" aria-hidden="true" />
              <p>Membaca kontrak & metadata IPFS di setiap chain…</p>
              <p className="small muted">Tidak perlu login wallet.</p>
            </div>
          </div>
        )}

        {state.status === "error" && (
          <div className="result-stack">
            <div className="empty-state">
              <StatusBadge status="invalid" />
              <h2 style={{ marginTop: "0.8rem" }}>Verifikasi gagal</h2>
              <p className="muted">{state.message}</p>
              {state.hint && <p className="small muted">{state.hint}</p>}
              <Link href="/" className="button button-primary" style={{ marginTop: "1rem" }}>
                Kembali
              </Link>
            </div>
          </div>
        )}

        {state.status === "ok" && state.data.found.length === 0 && (
          <div className="result-stack">
            <div className="empty-state">
              <StatusBadge status="not-found" />
              <h2 style={{ marginTop: "0.8rem" }}>Token tidak ditemukan</h2>
              <p className="muted">Token ID #{tokenId} tidak ditemukan di chain yang dikonfigurasi.</p>
              <div style={{ marginTop: "1rem", textAlign: "left" }}>
                {state.data.results.map((r) => (
                  <p key={r.chain.id} className="small muted">
                    <strong>{r.chain.name}:</strong> {r.status === "not-found" ? "tidak ditemukan" : r.status === "error" ? `error — ${r.message}` : "ditemukan"}
                  </p>
                ))}
              </div>
              <Link href="/" className="button button-primary" style={{ marginTop: "1rem" }}>
                Coba Token ID lain
              </Link>
            </div>
          </div>
        )}

        {state.status === "ok" && state.data.found.length > 0 && (
          <div className="result-stack">
            {state.data.found.length > 1 && (
              <p className="alert alert-warning">Token ID #{tokenId} ditemukan di {state.data.found.length} chain.</p>
            )}
            {state.data.found.map((d) => (
              <DiplomaCard key={`${d.chain.id}-${d.tokenId}`} diploma={d} />
            ))}
            {state.data.results.filter((r) => r.status !== "found").length > 0 && (
              <div className="empty-state" style={{ marginTop: "1rem" }}>
                <p className="small muted"><strong>Status chain lain:</strong></p>
                {state.data.results.filter((r) => r.status !== "found").map((r) => (
                  <p key={r.chain.id} className="small muted">{r.chain.name}: {r.status === "not-found" ? "tidak ditemukan" : `error — ${(r as any).message}`}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
