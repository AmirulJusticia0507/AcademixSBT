"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export function QrShare({ tokenId, compact = false }: { tokenId: string; compact?: boolean }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/verify/${tokenId}`);
  }, [tokenId]);

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={compact ? "qr-share compact" : "qr-share"}>
      {url ? (
        <QRCodeSVG
          value={url}
          size={compact ? 108 : 152}
          bgColor="#ffffff"
          fgColor="#0f172a"
          level="M"
          title={`QR verifikasi Token ID ${tokenId}`}
        />
      ) : (
        <div className="qr-placeholder" aria-hidden="true" />
      )}
      <div className="qr-meta">
        <p className="eyebrow">Bagikan / cetak</p>
        <p className="small muted">
          QR berisi URL verifikasi Token ID <strong>{tokenId}</strong>. HRD dapat memindai
          langsung tanpa login.
        </p>
        <button type="button" className="button button-small button-ghost" onClick={copy}>
          {copied ? "Tersalin ✓" : "Salin link verifikasi"}
        </button>
      </div>
    </div>
  );
}
