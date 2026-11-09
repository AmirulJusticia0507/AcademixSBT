import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, ValidationError } from "../src/lib/errors";
import type { SaveMintedDiplomaInput } from "../src/repositories/diplomaRepository";
import { DiplomaService, type ChainWriter, type DiplomaStore } from "../src/services/diploma";
import { LocalIpfsProvider } from "../src/services/ipfs";
import type { DiplomaRecord, MintDiplomaInput } from "../src/types";

const baseInput: MintDiplomaInput = {
  tokenId: "1",
  walletAddress: "0x00000000000000000000000000000000000000A1",
  certificateNumber: "IJZ-2026-001",
  institutionCode: "UNIV-01",
  institutionName: "Universitas Contoh",
  nim: "20210001",
  fullName: "Budi Santoso",
  studyProgram: "Teknik Informatika",
  degree: "S.Kom",
  graduationDate: "2026-08-01",
  document: Buffer.from("%PDF-1.4 ijazah palsu untuk uji"),
  documentFileName: "ijazah.pdf",
  documentMimeType: "application/pdf",
  actor: "api-key",
};

function fakeStore(existing?: { token?: DiplomaRecord; certificate?: DiplomaRecord }) {
  const saved: SaveMintedDiplomaInput[] = [];
  const revoked: Array<{ tokenId: string; actor: string; txHash: string }> = [];

  const store: DiplomaStore = {
    findByTokenId: vi.fn().mockResolvedValue(existing?.token ?? null),
    findByCertificateNumber: vi.fn().mockResolvedValue(existing?.certificate ?? null),
    saveMinted: vi.fn(async (input: SaveMintedDiplomaInput) => {
      saved.push(input);
    }),
    markRevoked: vi.fn(async (tokenId: string, actor: string, txHash: string) => {
      revoked.push({ tokenId, actor, txHash });
    }),
  };
  return { store, saved, revoked };
}

describe("DiplomaService", () => {
  let dir: string;
  let ipfs: LocalIpfsProvider;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "academix-diploma-"));
    ipfs = new LocalIpfsProvider(dir);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("minting end-to-end: hash -> IPFS -> chain -> database", async () => {
    const chain: ChainWriter = {
      mint: vi.fn().mockResolvedValue({
        txHash: "0x" + "1".repeat(64),
        issuerAddress: "0x00000000000000000000000000000000000000B2",
      }),
      revoke: vi.fn(),
    };
    const { store, saved } = fakeStore();
    const service = new DiplomaService(chain, ipfs, store);

    const result = await service.mint(baseInput);

    expect(result.documentHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(result.tokenUri).toBe(`ipfs://${result.ipfsCid}`);
    expect(result.txHash).toBe("0x" + "1".repeat(64));
    expect(chain.mint).toHaveBeenCalledWith(baseInput.walletAddress, "1", result.tokenUri);
    expect(saved).toHaveLength(1);
    expect(saved[0].minted.tokenId).toBe("1");
    expect(saved[0].institution.walletAddress).toBe("0x00000000000000000000000000000000000000B2");

    const metadata = (await ipfs.readJson(result.ipfsCid)) as {
      diploma: { document_hash: string; full_name: string };
    };
    expect(metadata.diploma.document_hash).toBe(result.documentHash);
    expect(metadata.diploma.full_name).toBe("Budi Santoso");
  });

  it("menolak token ID yang sudah tercatat", async () => {
    const chain: ChainWriter = { mint: vi.fn(), revoke: vi.fn() };
    const { store } = fakeStore({ token: { tokenId: "1" } as DiplomaRecord });
    const service = new DiplomaService(chain, ipfs, store);

    await expect(service.mint(baseInput)).rejects.toBeInstanceOf(ConflictError);
    expect(chain.mint).not.toHaveBeenCalled();
  });

  it("menolak nomor ijazah yang sudah tercatat", async () => {
    const chain: ChainWriter = { mint: vi.fn(), revoke: vi.fn() };
    const { store } = fakeStore({ certificate: { tokenId: "2" } as DiplomaRecord });
    const service = new DiplomaService(chain, ipfs, store);

    await expect(service.mint(baseInput)).rejects.toBeInstanceOf(ConflictError);
  });

  it("menolak berkas kosong atau terlalu besar", async () => {
    const chain: ChainWriter = { mint: vi.fn(), revoke: vi.fn() };
    const { store } = fakeStore();
    const service = new DiplomaService(chain, ipfs, store);

    await expect(service.mint({ ...baseInput, document: Buffer.alloc(0) })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(
      service.mint({ ...baseInput, document: Buffer.alloc(10 * 1024 * 1024 + 1) }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("revoke memanggil chain lalu menandai database", async () => {
    const chain: ChainWriter = {
      mint: vi.fn(),
      revoke: vi.fn().mockResolvedValue({ txHash: "0x" + "2".repeat(64) }),
    };
    const { store, revoked } = fakeStore();
    const service = new DiplomaService(chain, ipfs, store);

    const result = await service.revoke("1", "0xissuer");

    expect(result.txHash).toBe("0x" + "2".repeat(64));
    expect(revoked).toEqual([{ tokenId: "1", actor: "0xissuer", txHash: result.txHash }]);
  });
});
