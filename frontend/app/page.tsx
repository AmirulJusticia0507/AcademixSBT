import Link from "next/link";
import { ChainStats } from "@/components/ChainStats";
import { VerifyForm } from "@/components/VerifyForm";

const FEATURES = [
  {
    icon: "⛓",
    title: "Read-only dari blockchain",
    body: "Portal membaca kontrak langsung via RPC publik. Tidak butuh login wallet, tidak bergantung pada server kampus.",
  },
  {
    icon: "🔒",
    title: "Soulbound & anti-pemalsuan",
    body: "Token ERC-5192 terkunci permanen ke wallet alumni. Transfer antar wallet selalu revert di smart contract.",
  },
  {
    icon: "#",
    title: "Bukti hash SHA-256",
    body: "Hash PDF ijazah tersimpan di metadata IPFS. Verifikator bisa mengunggah PDF dan mencocokkan hash di browser.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div>
              <p className="eyebrow">Zero-downtime credential verification</p>
              <h1>
                Ijazah yang <span className="gradient-text">tidak bisa dipalsukan</span>, bahkan
                saat server kampus down.
              </h1>
              <p className="lede">
                AcademixSBT menerbitkan ijazah sebagai Soulbound Token (ERC-5192). Verifikator
                cukup memindai QR atau memasukkan Token ID — tanpa login, tanpa captcha, langsung
                dari ledger publik.
              </p>
              <div className="hero-points">
                <span className="pill">ERC-5192 Soulbound</span>
                <span className="pill">SHA-256 + IPFS</span>
                <span className="pill">Public RPC</span>
                <span className="pill">Tanpa login wallet</span>
              </div>
              <ChainStats />
            </div>

            <div>
              <VerifyForm />
              <p className="small muted" style={{ marginTop: "0.8rem", textAlign: "center" }}>
                Sudah punya ijazah SBT? Pindai QR pada kartu ijazah atau masukkan Token ID.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="cara-kerja">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Cara kerja</p>
              <h2>Tiga lapis bukti, satu halaman verifikasi</h2>
            </div>
            <Link href="/#cara-kerja" className="muted small">
              Tanpa wallet · tanpa captcha
            </Link>
          </div>

          <div className="feature-grid">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="feature-card">
                <div className="feature-icon" aria-hidden="true">
                  {feature.icon}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Untuk HRD & instansi</p>
                <h2>Verifikasi dalam hitungan detik</h2>
                <p className="muted small">
                  Masukkan Token ID dari pelamar, pindai QR pada sertifikat, atau cek seluruh
                  ijazah SBT milik sebuah wallet. Hasil menampilkan status locked/revoked,
                  institusi penerbit, metadata ijazah, dan perbandingan hash PDF.
                </p>
              </div>
              <Link href="/" className="button button-ghost">
                Mulai verifikasi
              </Link>
            </div>
            <div className="stats" style={{ marginTop: 0 }}>
              <div className="stat">
                <strong>Tanpa login</strong>
                <span>Portal publik read-only</span>
              </div>
              <div className="stat">
                <strong>QR / Token ID</strong>
                <span>Dua jalur verifikasi cepat</span>
              </div>
              <div className="stat">
                <strong>Hash PDF</strong>
                <span>Bandingkan dokumen asli</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
