import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { isContractConfigured } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AcademixSBT — Verifikasi Ijazah Soulbound",
    template: "%s · AcademixSBT",
  },
  description:
    "Portal verifikasi ijazah publik berbasis Soulbound Token (ERC-5192) — read-only via blockchain, tanpa login wallet, dengan bukti hash SHA-256.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>
        <header className="site-header">
          <div className="container">
            <Link href="/" className="brand">
              <span className="brand-mark">A</span>
              Academix<span className="muted">SBT</span>
            </Link>
            <nav className="nav" aria-label="Navigasi utama">
              <Link href="/">Verifikasi</Link>
              <Link href="/#cara-kerja">Cara Kerja</Link>
              <a
                href="https://github.com/AmirulJusticia0507/AcademixSBT"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </nav>
          </div>
        </header>

        {!isContractConfigured && (
          <div className="banner-warning">
            <div className="container">
              Kontrak belum dikonfigurasi — set <code>NEXT_PUBLIC_CONTRACT_ADDRESS</code> di
              <code> frontend/.env</code> lalu restart/rebuild portal.
            </div>
          </div>
        )}

        <main>{children}</main>

        <footer className="footer">
          <div className="container">
            <span>AcademixSBT · Proof of Concept ERC-5192 · MIT License</span>
            <span>
              Bukan layanan resmi PDDikti/PISN. Selalu cocokkan dengan institusi penerbit.
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
