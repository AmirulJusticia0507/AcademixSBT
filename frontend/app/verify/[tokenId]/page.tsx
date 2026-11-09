"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DiplomaCard } from "@/components/DiplomaCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ChainNotConfiguredError, InvalidInputError, TokenNotFoundError } from "@/lib/chain";
import { verifyToken } from "@/lib/verification";
import type { VerifiedDiploma } from "@/lib/types";

type State =
  | { status: "loading" }
  | { status: "ok"; data: VerifiedDiploma }
  | { status: "not-found"; message: string }
  | { status: "error"; message: string; hint?: string };

export default function VerifyPage() {
  const params = useParams<{ tokenId: string }>();
  const tokenId = params?.tokenId ?? "";
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });

    verifyToken(tokenId)
      .then((data) => {
        if (active) setState({ status: "ok", data });
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof TokenNotFoundError) {
          setState({ status: "not-found", message: error.message });
          return;
        }
        if (error instanceof ChainNotConfiguredError) {
          setState({
            status: "error",
            message: error.message,
            hint: "Deploy kontrak dari folder contracts/, lalu isi NEXT_PUBLIC_CONTRACT_ADDRESS di frontend/.env.",
          });
          return;
        }
        if (error instanceof InvalidInputError) {
          setState({ status: "error", message: error.message });
          return;
        }
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Gagal memverifikasi ijazah.",
          hint: "Periksa koneksi RPC / gateway IPFS, lalu coba lagi.",
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
            <p className="eyebrow">Portal verifikasi publik</p>
            <h1>Verifikasi Token #{tokenId || "—"}</h1>
          </div>
          <Link href="/" className="button button-ghost">
            ← Verifikasi lain
          </Link>
        </div>

        {state.status === "loading" && (
          <div className="result-stack">
            <div className="loading-state">
              <span className="spinner" aria-hidden="true" />
              <p>Membaca kontrak & metadata IPFS…</p>
              <p className="small muted">Tidak perlu login wallet.</p>
            </div>
          </div>
        )}

        {state.status === "not-found" && (
          <div className="result-stack">
            <div className="empty-state">
              <StatusBadge status="not-found" />
              <h2 style={{ marginTop: "0.8rem" }}>Token tidak ditemukan</h2>
              <p className="muted">{state.message}</p>
              <p className="small muted" style={{ marginTop: "0.5rem" }}>
                Pastikan Token ID benar dan kontrak yang dikonfigurasi sesuai jaringan.
              </p>
              <Link href="/" className="button button-primary" style={{ marginTop: "1rem" }}>
                Coba Token ID lain
              </Link>
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

        {state.status === "ok" && <DiplomaCard diploma={state.data} />}
      </div>
    </div>
  );
}
