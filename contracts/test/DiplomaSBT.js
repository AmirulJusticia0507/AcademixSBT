const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DiplomaSBT (ERC-5192)", function () {
  async function deployFixture() {
    const [admin, alumni, issuer, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DiplomaSBT", admin);
    const contract = await Factory.deploy("Academix Diploma SBT", "ADBT");
    await contract.waitForDeployment();
    return { contract, admin, alumni, issuer, other };
  }

  describe("Deployment & role", function () {
    it("mendaftarkan deployer sebagai issuer dan memberikan role", async function () {
      const { contract, admin } = await deployFixture();

      expect(await contract.isRegisteredIssuer(admin.address)).to.equal(true);
      expect(await contract.hasRole(await contract.DEFAULT_ADMIN_ROLE(), admin.address)).to.equal(true);
      expect(await contract.hasRole(await contract.MINTER_ROLE(), admin.address)).to.equal(true);
    });
  });

  describe("Minting", function () {
    it("minting mengunci token di wallet alumni", async function () {
      const { contract, admin, alumni } = await deployFixture();
      const uri = "ipfs://bafy-test-cid";

      await expect(contract.safeMintSBT(alumni.address, 1, uri))
        .to.emit(contract, "Locked")
        .withArgs(1);

      expect(await contract.ownerOf(1)).to.equal(alumni.address);
      expect(await contract.tokenURI(1)).to.equal(uri);
      expect(await contract.isLocked(1)).to.equal(true);
      expect(await contract.locked(1)).to.equal(true);
      expect(await contract.issuerOf(1)).to.equal(admin.address);
      expect(await contract.balanceOf(alumni.address)).to.equal(1n);
    });

    it("mendukung ERC-721 Enumerable untuk pencarian token per wallet", async function () {
      const { contract, alumni } = await deployFixture();

      await contract.safeMintSBT(alumni.address, 11, "ipfs://cid-11");
      await contract.safeMintSBT(alumni.address, 12, "ipfs://cid-12");

      expect(await contract.totalSupply()).to.equal(2n);
      expect(await contract.tokenOfOwnerByIndex(alumni.address, 0)).to.equal(11n);
      expect(await contract.tokenOfOwnerByIndex(alumni.address, 1)).to.equal(12n);
    });

    it("menolak minting dari wallet yang tidak terdaftar", async function () {
      const { contract, other } = await deployFixture();

      await expect(
        contract.connect(other).safeMintSBT(other.address, 2, "ipfs://cid")
      ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    });

    it("menolak minting jika wallet pernah terdaftar lalu dicabut", async function () {
      const { contract, issuer, alumni } = await deployFixture();

      await contract.registerIssuer(issuer.address);
      expect(await contract.isRegisteredIssuer(issuer.address)).to.equal(true);
      await contract.connect(issuer).safeMintSBT(alumni.address, 5, "ipfs://cid-5");
      expect(await contract.issuerOf(5)).to.equal(issuer.address);

      await contract.unregisterIssuer(issuer.address);
      expect(await contract.isRegisteredIssuer(issuer.address)).to.equal(false);

      await expect(
        contract.connect(issuer).safeMintSBT(alumni.address, 6, "ipfs://cid-6")
      ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    });

    it("menolak token URI kosong dan alamat nol", async function () {
      const { contract, alumni } = await deployFixture();

      await expect(
        contract.safeMintSBT(alumni.address, 7, "")
      ).to.be.revertedWith("SBTError: Token URI is empty");

      await expect(
        contract.safeMintSBT(ethers.ZeroAddress, 8, "ipfs://cid")
      ).to.be.revertedWith("SBTError: Receiver is zero address");
    });

    it("menolak minting token ID ganda", async function () {
      const { contract, alumni } = await deployFixture();

      await contract.safeMintSBT(alumni.address, 9, "ipfs://cid-9");
      await expect(
        contract.safeMintSBT(alumni.address, 9, "ipfs://cid-9-lagi")
      ).to.be.reverted;
    });
  });

  describe("Soulbound constraint", function () {
    it("transfer antar wallet harus revert", async function () {
      const { contract, alumni, other } = await deployFixture();
      await contract.safeMintSBT(alumni.address, 1, "ipfs://cid");

      await expect(
        contract.connect(alumni).transferFrom(alumni.address, other.address, 1)
      ).to.be.revertedWith("SBTError: Token is soulbound and non-transferable");
    });

    it("safeTransferFrom antar wallet juga harus revert", async function () {
      const { contract, alumni, other } = await deployFixture();
      await contract.safeMintSBT(alumni.address, 1, "ipfs://cid");

      await expect(
        contract
          .connect(alumni)
          ["safeTransferFrom(address,address,uint256)"](alumni.address, other.address, 1)
      ).to.be.revertedWith("SBTError: Token is soulbound and non-transferable");
    });
  });

  describe("Revocation", function () {
    it("revoke menandai isRevoked dan tidak membakar token", async function () {
      const { contract, admin, alumni } = await deployFixture();
      await contract.safeMintSBT(alumni.address, 1, "ipfs://cid");

      await expect(contract.connect(admin).revokeDiploma(1))
        .to.emit(contract, "Revoked")
        .withArgs(1);

      expect(await contract.isRevoked(1)).to.equal(true);
      expect(await contract.ownerOf(1)).to.equal(alumni.address);
    });

    it("hanya admin yang dapat revoke", async function () {
      const { contract, alumni, other } = await deployFixture();
      await contract.safeMintSBT(alumni.address, 1, "ipfs://cid");

      await expect(
        contract.connect(other).revokeDiploma(1)
      ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    });

    it("tidak bisa revoke dua kali", async function () {
      const { contract, alumni } = await deployFixture();
      await contract.safeMintSBT(alumni.address, 1, "ipfs://cid");

      await contract.revokeDiploma(1);
      await expect(contract.revokeDiploma(1)).to.be.revertedWith(
        "SBTError: Diploma already revoked"
      );
    });

    it("tidak bisa revoke token yang tidak ada", async function () {
      const { contract } = await deployFixture();

      await expect(contract.revokeDiploma(999)).to.be.revertedWithCustomError(
        contract,
        "ERC721NonexistentToken"
      );
    });
  });

  describe("Views & interface", function () {
    it("mendukung interface ERC-5192 dan ERC-721", async function () {
      const { contract } = await deployFixture();

      expect(await contract.supportsInterface("0xb45a3c0e")).to.equal(true); // IERC5192
      expect(await contract.supportsInterface("0x80ac58cd")).to.equal(true); // IERC721
      expect(await contract.supportsInterface("0x7965db0b")).to.equal(true); // IAccessControl
    });

    it("tokenURI dan locked revert untuk token tidak ada", async function () {
      const { contract } = await deployFixture();

      await expect(contract.tokenURI(404)).to.be.revertedWithCustomError(
        contract,
        "ERC721NonexistentToken"
      );
      await expect(contract.locked(404)).to.be.revertedWithCustomError(
        contract,
        "ERC721NonexistentToken"
      );
    });
  });
});
