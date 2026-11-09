"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { ChainNotConfiguredError, InvalidInputError } from "@/lib/chain";
import { formatDate, shortAddress } from "@/lib/format";
import { verifyWallet } from "@/lib/verification";
import type { VerifiedDiploma } from "@/lib/types";

type State =
  | { status: "loading" }
  | { status: "ok"; tokens: VerifiedDiploma[] }
  | { status: "error"; message: string; hint?: string };

export default function WalletPage() {
  const params = useParams<{ address: string }>();
  const address = params?.address ?? "";
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });

    verifyWallet(address)
      .then((tokens) => {
        if (active) setState({ status: "ok", tokens });
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ChainNotConfiguredError) {
          setState({
            status: "error",
            message: error.message,
            hint: "Set NEXT_PUBLIC_CONTRACT_ADDRESS di frontend/.env lalu rebuild.",
          });
          return;
        }
        if (error instanceof InvalidInputError) {
          setState({ status: "error", message: error.message });
          return;
        }
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Gagal membaca wallet.",
          hint: "Periksa koneksi RPC lalu coba lagi.",
        });
      });

    return () => {
      active = false;
    };
  }, [address]);

  return (
    <div className="page">
      <div className="container">
        <div className="page-head">
          <div>
            <p className="eyebrow">Verifikasi via wallet</p>
            <h1>Ijazah SBT milik wallet</h1>
            <p className="muted small">
              <code>{address}</code>
            </p>
          </div>
          <Link href="/" className="button button-ghost">
            ← Verifikasi lain
          </Link>
        </div>

        {state.status === "loading" && (
          <div className="loading-state">
            <span className="spinner" aria-hidden="true" />
            <p>Membaca token milik wallet…</p>
          </div>
        )}

        {state.status === "error" && (
          <div className="empty-state">
            <StatusBadge status="invalid" />
            <h2 style={{ marginTop: "0.8rem" }}>Gagal membaca wallet</h2>
            <p className="muted">{state.message}</p>
            {state.hint && <p className="small muted">{state.hint}</p>}
          </div>
        )}

        {state.status === "ok" && state.tokens.length === 0 && (
          <div className="empty-state">
            <StatusBadge status="not-found" />
            <h2 style={{ marginTop: "0.8rem" }}>Belum ada ijazah SBT</h2>
            <p className="muted">
              Wallet <code>{shortAddress(address)}</code> belum memiliki token ijazah pada
              kontrak ini.
            </p>
          </div>
        )}

        {state.status === "ok" && state.tokens.length > 0 && (
          <>
            <p className="muted small" style={{ marginBottom: "0.8rem" }}>
              {state.tokens.length} ijazah ditemukan.
            </p>
            <div className="wallet-list">
              {state.tokens.map((token) => {
                const status = token.revoked ? "revoked" : token.locked ? "valid" : "invalid";
                const payload = token.metadata?.diploma;
                return (
                  <Link key={token.tokenId} href={`/verify/${token.tokenId}`} className="wallet-item">
                    <div>
                      <h3>{payload?.full_name || token.metadata?.name || `Token #${token.tokenId}`}</h3>
                      <p className="meta">
                        {payload?.study_program || "Program studi —"} ·{" "}
                        {payload?.institution_name || "Institusi —"} · Token #{token.tokenId}
                      </p>
                      <p className="meta">Minting: {formatDate(token.mintedAt)}</p>
                    </div>
                    <StatusBadge status={status} />
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
