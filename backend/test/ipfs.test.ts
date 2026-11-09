import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ServiceUnavailableError } from "../src/lib/errors";
import { cidFromUri, LocalIpfsProvider } from "../src/services/ipfs";

describe("IPFS lokal", () => {
  let dir: string;
  let provider: LocalIpfsProvider;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "academix-ipfs-"));
    provider = new LocalIpfsProvider(dir);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("menyimpan dan membaca JSON kembali dengan CID deterministik", async () => {
    const value = { hello: "dunia", n: 1 };
    const first = await provider.uploadJson(value);
    const second = await provider.uploadJson(value);

    expect(first.cid).toMatch(/^local-[a-f0-9]{32}$/);
    expect(second.cid).toBe(first.cid);
    await expect(provider.readJson(first.cid)).resolves.toEqual(value);
  });

  it("melempar error jika CID tidak ditemukan", async () => {
    await expect(provider.readJson("local-tidakada")).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
  });

  it("menolak CID berbahaya (path traversal)", async () => {
    await expect(provider.readJson("../../etc/passwd")).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
  });
});

describe("cidFromUri", () => {
  it("mengambil CID dari URI ipfs", () => {
    expect(cidFromUri("ipfs://bafyabc")).toBe("bafyabc");
    expect(cidFromUri("ipfs://bafyabc/metadata.json")).toBe("bafyabc");
  });

  it("mengambil CID dari URL gateway", () => {
    expect(cidFromUri("https://gateway.pinata.cloud/ipfs/bafyabc")).toBe("bafyabc");
  });

  it("mengembalikan null untuk URI tidak valid", () => {
    expect(cidFromUri("https://example.com/foo")).toBeNull();
    expect(cidFromUri("bukan-uri")).toBeNull();
  });
});
