const { ethers, network } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`Network          : ${network.name}`);
  console.log(`Deployer         : ${deployer.address}`);
  console.log(`Deployer balance : ${ethers.formatEther(balance)} ETH`);

  const DiplomaSBT = await ethers.getContractFactory("DiplomaSBT");
  const contract = await DiplomaSBT.deploy("Academix Diploma SBT", "ADBT");
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`DiplomaSBT       : ${address}`);
  console.log(`MINTER_ROLE      : ${await contract.MINTER_ROLE()}`);

  // Opsional: daftarkan wallet institusi tambahan dari env ISSUER_ADDRESS.
  const issuer = process.env.ISSUER_ADDRESS;
  if (issuer && ethers.isAddress(issuer) && issuer !== deployer.address) {
    const tx = await contract.registerIssuer(issuer);
    await tx.wait();
    console.log(`Issuer terdaftar : ${issuer}`);
  }

  console.log("\nSimpan alamat kontrak di .env backend/frontend:");
  console.log(`CONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
