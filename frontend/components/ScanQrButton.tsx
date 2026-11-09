"use client";

import { useEffect, useRef, useState } from "react";

export interface ScanResult {
  type: "token" | "wallet";
  value: string;
}

export function parseScanResult(text: string): ScanResult | null {
  const trimmed = text.trim();

  if (/^\d+$/.test(trimmed)) {
    return { type: "token", value: trimmed };
  }
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return { type: "wallet", value: trimmed };
  }

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "verify" && parts[1] && /^\d+$/.test(parts[1])) {
      return { type: "token", value: parts[1] };
    }
    if (parts[0] === "wallet" && parts[1] && /^0x[a-fA-F0-9]{40}$/.test(parts[1])) {
      return { type: "wallet", value: parts[1] };
    }
  } catch {
    // bukan URL — abaikan
  }

  return null;
}

export function ScanQrButton({ onResult }: { onResult: (result: ScanResult) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function start() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            const parsed = parseScanResult(decodedText);
            if (!parsed) {
              setError("QR tidak berisi Token ID / URL verifikasi AcademixSBT.");
              return;
            }
            void scanner
              .stop()
              .catch(() => undefined)
              .then(() => {
                scanner.clear();
                setOpen(false);
                onResult(parsed);
              });
          },
          () => undefined,
        );
      } catch (scanError) {
        setError(
          scanError instanceof Error
            ? `Kamera tidak bisa dibuka: ${scanError.message}`
            : "Kamera tidak bisa dibuka.",
        );
      }
    }

    void start();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        void scanner
          .stop()
          .catch(() => undefined)
          .then(() => scanner.clear());
      }
    };
  }, [open, onResult]);

  return (
    <>
      <button type="button" className="button button-ghost" onClick={() => setOpen(true)}>
        <span aria-hidden="true">▣</span> Scan QR
      </button>

      {open && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Scan QR">
          <div className="modal">
            <div className="modal-head">
              <h2>Scan QR Ijazah</h2>
              <button type="button" className="icon-button" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>
            <p className="muted small">
              Arahkan kamera ke QR pada kartu ijazah / link verifikasi alumni.
            </p>
            <div id="qr-reader" className="qr-reader" />
            {error && <p className="alert alert-error">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
