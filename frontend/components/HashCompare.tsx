"use client";

import { useState } from "react";
import { hashesMatch, sha256File } from "@/lib/format";

interface Props {
  expectedHash?: string;
  documentFileName?: string;
}

export function HashCompare({ expectedHash, documentFileName }: Props) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [actualHash, setActualHash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    setFileName(file.name);
    setActualHash(null);
    try {
      setActualHash(await sha256File(file));
    } catch {
      setError("Gagal menghitung hash berkas di browser.");
    } finally {
      setBusy(false);
    }
  }

  const match = expectedHash && actualHash ? hashesMatch(expectedHash, actualHash) : null;

  return (
    <section className="panel hash-panel">
      <div className="panel-head">
        <div>
          <h2>Cek keaslian berkas PDF</h2>
          <p className="muted small">
            Hash dihitung <strong>di browser Anda</strong>; berkas tidak diunggah ke server.
            {documentFileName ? ` Berkas asli: ${documentFileName}.` : ""}
          </p>
        </div>
      </div>

      {expectedHash ? (
        <>
          <label className="file-drop">
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => void handleFile(event.target.files?.[0])}
            />
            <span className="file-drop-icon" aria-hidden="true">
              ⇪
            </span>
            <span>
              <strong>{busy ? "Menghitung hash…" : "Pilih berkas PDF ijazah"}</strong>
              <span className="muted small"> Maks. 10 MB, diproses lokal.</span>
            </span>
          </label>

          {error && <p className="alert alert-error">{error}</p>}

          {actualHash && (
            <div className={`hash-result ${match ? "match" : "mismatch"}`}>
              <p className="hash-verdict">
                {match ? "✓ Hash COCOK — berkas identik dengan yang terdaftar" : "✕ Hash TIDAK COCOK — berkas berbeda"}
              </p>
              <dl className="hash-list">
                <div>
                  <dt>Hash metadata (on-chain/IPFS)</dt>
                  <dd>
                    <code>{expectedHash}</code>
                  </dd>
                </div>
                <div>
                  <dt>Hash berkas Anda {fileName ? `(${fileName})` : ""}</dt>
                  <dd>
                    <code>{actualHash}</code>
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </>
      ) : (
        <p className="alert alert-warning">
          Metadata ijazah tidak menyertakan hash dokumen, sehingga perbandingan tidak tersedia.
        </p>
      )}
    </section>
  );
}
