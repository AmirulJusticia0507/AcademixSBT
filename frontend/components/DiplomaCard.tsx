import { config, explorerAddress } from "@/lib/config";
import { formatDate } from "@/lib/format";
import { ipfsHttpUrl } from "@/lib/ipfs";
import type { VerifiedDiploma } from "@/lib/types";
import { HashCompare } from "./HashCompare";
import { QrShare } from "./QrShare";
import { StatusBadge } from "./StatusBadge";

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="data-row">
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

export function DiplomaCard({ diploma }: { diploma: VerifiedDiploma }) {
  const status = diploma.revoked ? "revoked" : diploma.locked ? "valid" : "invalid";
  const payload = diploma.metadata?.diploma;
  const fullName = payload?.full_name || diploma.metadata?.name || "—";
  const ipfsUrl = ipfsHttpUrl(diploma.tokenUri);

  return (
    <div className="result-stack">
      <article className={`diploma-card border-${status}`}>
        <header className="diploma-head">
          <div>
            <p className="eyebrow">Soulbound Token · ERC-5192</p>
            <h1>{fullName}</h1>
            <p className="muted">
              Token ID <strong>#{diploma.tokenId}</strong> · {payload?.institution_name || "Institusi tidak diketahui"}
            </p>
          </div>
          <StatusBadge status={status} />
        </header>

        {diploma.revoked && (
          <p className="alert alert-error">
            Ijazah ini telah <strong>dicabut (revoked)</strong> oleh institusi. Jangan gunakan
            sebagai bukti kelulusan yang sah.
          </p>
        )}
        {!diploma.locked && !diploma.revoked && (
          <p className="alert alert-warning">
            Token tidak dalam status terkunci. Verifikasi keaslian dengan institusi penerbit.
          </p>
        )}

        <div className="diploma-body">
          <dl className="data-grid">
            <DataRow label="Nama Lengkap" value={payload?.full_name} />
            <DataRow label="NIM" value={payload?.nim} />
            <DataRow label="Program Studi" value={payload?.study_program} />
            <DataRow label="Gelar" value={payload?.degree} />
            <DataRow label="Institusi" value={payload?.institution_name} />
            <DataRow label="Nomor Ijazah" value={payload?.certificate_number} />
            <DataRow label="Tanggal Lulus" value={payload?.graduation_date} />
            <DataRow label="Tanggal Minting" value={formatDate(diploma.mintedAt)} />
          </dl>

          <aside className="onchain-panel">
            <p className="eyebrow">Bukti on-chain</p>
            <dl className="data-stack">
              <DataRow
                label="Pemilik wallet"
                value={
                  <a href={explorerAddress(diploma.owner)} target="_blank" rel="noreferrer">
                    <code>{diploma.owner}</code>
                  </a>
                }
              />
              <DataRow
                label="Institusi penerbit"
                value={
                  diploma.issuer ? (
                    <a href={explorerAddress(diploma.issuer)} target="_blank" rel="noreferrer">
                      <code>{diploma.issuer}</code>
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <DataRow label="Status locked" value={diploma.locked ? "Terkunci (soulbound)" : "Tidak terkunci"} />
              <DataRow
                label="Metadata IPFS"
                value={
                  <a href={ipfsUrl} target="_blank" rel="noreferrer">
                    <code>{diploma.tokenUri}</code>
                  </a>
                }
              />
              <DataRow
                label="Kontrak"
                value={
                  <a
                    href={explorerAddress(config.contractAddress)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <code>{config.contractAddress}</code>
                  </a>
                }
              />
            </dl>
          </aside>
        </div>

        {diploma.metadataError && (
          <p className="alert alert-warning">
            Metadata IPFS tidak dapat dibaca: {diploma.metadataError}. Status on-chain tetap
            valid dan dapat diverifikasi.
          </p>
        )}

        {diploma.metadata?.attributes && diploma.metadata.attributes.length > 0 && (
          <div className="attribute-list">
            {diploma.metadata.attributes.map((attribute) => (
              <span key={`${attribute.trait_type}-${attribute.value}`} className="chip">
                <strong>{attribute.trait_type}:</strong> {attribute.value}
              </span>
            ))}
          </div>
        )}

        <QrShare tokenId={diploma.tokenId} />
      </article>

      <HashCompare
        expectedHash={payload?.document_hash}
        documentFileName={payload?.document_file_name}
      />
    </div>
  );
}
