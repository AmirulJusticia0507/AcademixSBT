"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { isValidAddress, isValidTokenId } from "@/lib/format";
import { ScanQrButton, type ScanResult } from "./ScanQrButton";

type Mode = "token" | "wallet";

export function VerifyForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("token");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const navigate = useCallback(
    (kind: Mode, rawValue: string) => {
      const trimmed = rawValue.trim();
      if (kind === "token") {
        if (!isValidTokenId(trimmed)) {
          setError("Token ID harus berupa angka bulat positif.");
          return;
        }
        router.push(`/verify/${trimmed}`);
        return;
      }

      if (!isValidAddress(trimmed)) {
        setError("Alamat wallet harus diawali 0x dan terdiri dari 40 karakter hex.");
        return;
      }
      router.push(`/wallet/${trimmed}`);
    },
    [router],
  );

  const handleScan = useCallback(
    (result: ScanResult) => {
      setError(null);
      setMode(result.type);
      setValue(result.value);
      navigate(result.type, result.value);
    },
    [navigate],
  );

  return (
    <div className="verify-card">
      <div className="segmented" role="tablist" aria-label="Metode verifikasi">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "token"}
          className={mode === "token" ? "active" : ""}
          onClick={() => {
            setMode("token");
            setValue("");
            setError(null);
          }}
        >
          Token ID
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "wallet"}
          className={mode === "wallet" ? "active" : ""}
          onClick={() => {
            setMode("wallet");
            setValue("");
            setError(null);
          }}
        >
          Wallet Address
        </button>
      </div>

      <form
        className="verify-form"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          navigate(mode, value);
        }}
      >
        <label htmlFor="verify-input" className="sr-only">
          {mode === "token" ? "Token ID" : "Alamat wallet"}
        </label>
        <input
          id="verify-input"
          className="input"
          inputMode={mode === "token" ? "numeric" : "text"}
          placeholder={mode === "token" ? "Contoh: 1" : "Contoh: 0x1234…abcd"}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className="button button-primary">
          Verifikasi
        </button>
      </form>

      <div className="verify-actions">
        <ScanQrButton onResult={handleScan} />
        <span className="muted small">
          {mode === "token"
            ? "Tanpa login wallet — data dibaca langsung dari blockchain."
            : "Masukkan wallet alumni untuk melihat semua ijazah SBT miliknya."}
        </span>
      </div>

      {error && <p className="alert alert-error">{error}</p>}
    </div>
  );
}
