import { createApp } from "./app";
import { config } from "./config";
import { Database } from "./db";
import { DiplomaRepository } from "./repositories/diplomaRepository";
import { BlockchainService } from "./services/blockchain";
import { DiplomaService } from "./services/diploma";
import { createIpfsProvider } from "./services/ipfs";
import { VerificationService } from "./services/verification";

const db = new Database(config.databaseUrl);
const repo = new DiplomaRepository(db);
const ipfs = createIpfsProvider({
  provider: config.ipfsProvider,
  localDir: config.localIpfsDir,
  gateway: config.ipfsGateway,
  pinataJwt: config.pinataJwt,
  pinataApiKey: config.pinataApiKey,
  pinataSecretKey: config.pinataSecretKey,
});
const chain = new BlockchainService({
  rpcUrl: config.rpcUrl,
  chainId: config.chainId,
  contractAddress: config.contractAddress,
  privateKey: config.privateKey,
});
const verification = new VerificationService(chain, ipfs);
const diploma = new DiplomaService(chain, ipfs, repo);

const app = createApp({ config, db, repo, ipfs, chain, verification, diploma });

const server = app.listen(config.port, () => {
  console.log(`AcademixSBT API listening on http://localhost:${config.port}`);
  console.log(`IPFS provider : ${config.ipfsProvider}`);
  console.log(
    `Contract      : ${config.contractAddress || "(belum diisi — verification & minting akan 503)"}`,
  );
});

async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} diterima, menutup server...`);
  server.close(async () => {
    await db.close();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
