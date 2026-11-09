import { describe, expect, it, vi } from "vitest";
import { NotFoundError } from "../src/lib/errors";
import {
  parseDiplomaMetadata,
  VerificationService,
  type ChainReader,
  type MetadataReader,
} from "../src/services/verification";

const metadataFixture = {
  name: "Ijazah S.Kom — Budi",
  diploma: {
    certificate_number: "IJZ-001",
    document_hash: `sha256:${"b".repeat(64)}`,
    full_name: "Budi",
    schema: "academixsbt/diploma/v1",
  },
};

function chainFixture(overrides: Partial<Awaited<ReturnType<ChainReader["getDiploma"]>>> = {}) {
  const token = {
    tokenId: "1",
    owner: "0x00000000000000000000000000000000000000A1",
    issuer: "0x00000000000000000000000000000000000000B2",
    tokenUri: "ipfs://bafy-metadata",
    locked: true,
    revoked: false,
    ...overrides,
  };

  const chain: ChainReader = {
    getDiploma: vi.fn().mockResolvedValue(token),
    findByOwner: vi.fn().mockResolvedValue([token]),
  };
  return { chain, token };
}

describe("VerificationService", () => {
  it("memverifikasi token dan mengambil metadata IPFS", async () => {
    const { chain } = chainFixture();
    const ipfs: MetadataReader = { readJson: vi.fn().mockResolvedValue(metadataFixture) };
    const service = new VerificationService(chain, ipfs);

    const result = await service.verifyToken("1");

    expect(result.found).toBe(true);
    expect(result.locked).toBe(true);
    expect(result.revoked).toBe(false);
    expect(result.metadata?.diploma.certificate_number).toBe("IJZ-001");
    expect(ipfs.readJson).toHaveBeenCalledWith("bafy-metadata");
  });

  it("tetap mengembalikan data on-chain saat metadata rusak", async () => {
    const { chain } = chainFixture();
    const ipfs: MetadataReader = {
      readJson: vi.fn().mockRejectedValue(new Error("gateway down")),
    };
    const service = new VerificationService(chain, ipfs);

    const result = await service.verifyToken("1");

    expect(result.metadata).toBeNull();
    expect(result.metadataError).toBe("gateway down");
  });

  it("menandai token URI non-IPFS sebagai metadata error", async () => {
    const { chain } = chainFixture({ tokenUri: "https://example.com/meta.json" });
    const ipfs: MetadataReader = { readJson: vi.fn() };
    const service = new VerificationService(chain, ipfs);

    const result = await service.verifyToken("1");

    expect(result.metadata).toBeNull();
    expect(result.metadataError).toContain("bukan alamat IPFS");
    expect(ipfs.readJson).not.toHaveBeenCalled();
  });

  it("meneruskan NotFoundError untuk token yang tidak ada", async () => {
    const chain: ChainReader = {
      getDiploma: vi.fn().mockRejectedValue(new NotFoundError("tidak ada")),
      findByOwner: vi.fn(),
    };
    const service = new VerificationService(chain, { readJson: vi.fn() });

    await expect(service.verifyToken("999")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("memverifikasi semua token milik wallet", async () => {
    const { chain } = chainFixture();
    const ipfs: MetadataReader = { readJson: vi.fn().mockResolvedValue(metadataFixture) };
    const service = new VerificationService(chain, ipfs);

    const result = await service.verifyWallet("0x00000000000000000000000000000000000000A1");

    expect(result).toHaveLength(1);
    expect(result[0].tokenId).toBe("1");
  });
});

describe("parseDiplomaMetadata", () => {
  it("menolak metadata tanpa document_hash yang valid", () => {
    expect(() =>
      parseDiplomaMetadata({ name: "x", diploma: { certificate_number: "1", document_hash: "abc" } }),
    ).toThrow();
  });

  it("menerima metadata valid", () => {
    expect(parseDiplomaMetadata(metadataFixture).diploma.document_hash).toMatch(/^sha256:/);
  });
});
