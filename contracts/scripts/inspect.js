const { ethers, network } = require("hardhat");

/**
 * Baca status ijazah langsung dari kontrak (tanpa backend).
 *
 *   CONTRACT_ADDRESS=0x... TOKEN_ID=1 npx hardhat run scripts/inspect.js --network localhost
 */
async function main() {
  const address = process.env.CONTRACT_ADDRESS;
  if (!address) {
    throw new Error("Set CONTRACT_ADDRESS terlebih dahulu.");
  }

  const tokenId = process.env.TOKEN_ID || "1";
  const contract = await ethers.getContractAt("DiplomaSBT", address);
  const owner = await contract.ownerOf(tokenId);
  const [issuer, tokenUri, locked, revoked, mintedAt] = await Promise.all([
    contract.issuerOf(tokenId),
    contract.tokenURI(tokenId),
    contract.locked(tokenId),
    contract.isRevoked(tokenId),
    contract.mintedAt(tokenId),
  ]);

  console.log(
    JSON.stringify(
      {
        network: network.name,
        contract: address,
        tokenId,
        owner,
        issuer,
        tokenUri,
        locked,
        revoked,
        mintedAt: new Date(Number(mintedAt) * 1000).toISOString(),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
