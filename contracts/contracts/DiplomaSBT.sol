// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title IERC5192 — Minimal ERC-5192 interface (Soulbound)
 * @notice Mendefinisikan status locked untuk SBT.
 * @dev Standar ERC-5192: `locked(uint256) returns (bool)`.
 */
interface IERC5192 {
    /// @notice Mengembalikan true jika token terkunci (soulbound).
    function locked(uint256 tokenId) external view returns (bool);

    /// @notice Event yang di-emit saat token dikunci.
    event Locked(uint256 tokenId);
}

/**
 * @title DiplomaSBT (ERC-5192 Compliant)
 * @notice Soulbound Token ijazah: non-transferable, terikat permanen ke wallet alumni.
 * @dev Hanya wallet institusi terdaftar (`isRegisteredIssuer`) yang memegang
 *      `MINTER_ROLE` yang dapat minting. Hanya `DEFAULT_ADMIN_ROLE` yang dapat
 *      mendaftarkan institusi dan melakukan revoke.
 *      Revoke tidak membakar token (bukti tetap ada), hanya menandai `isRevoked`.
 *      ERC-721 Enumerable disertakan agar portal verifikasi dapat mencari token
 *      berdasarkan wallet alumni tanpa backend.
 */
contract DiplomaSBT is ERC721Enumerable, AccessControl, IERC5192 {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // Mapping Token ID ke URI metadata IPFS
    mapping(uint256 => string) private _tokenURIs;
    // Mapping Token ID ke status locked (ERC-5192)
    mapping(uint256 => bool) private _locked;
    // Mapping status Revocation ijazah
    mapping(uint256 => bool) public isRevoked;
    // Institusi penerbit tiap token (untuk verifikasi on-chain)
    mapping(uint256 => address) public issuerOf;
    // Wallet institusi yang terdaftar/terverifikasi
    mapping(address => bool) public isRegisteredIssuer;

    /// @notice Emit saat ijazah di-revoke (di luar ERC-5192).
    event Revoked(uint256 tokenId);
    /// @notice Emit saat wallet institusi didaftarkan.
    event IssuerRegistered(address indexed issuer);
    /// @notice Emit saat wallet institusi dicabut pendaftarannya.
    event IssuerUnregistered(address indexed issuer);

    modifier onlyRegisteredIssuer() {
        require(
            isRegisteredIssuer[msg.sender],
            "SBTError: Caller is not a registered issuer"
        );
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_
    ) ERC721(name_, symbol_) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        // Deployer menjadi institusi pertama agar PoC bisa langsung minting.
        _registerIssuer(msg.sender);
    }

    // ===== Institution registry =====

    /**
     * @notice Daftarkan wallet institusi sebagai issuer terverifikasi.
     * @dev Otomatis memberikan `MINTER_ROLE` ke wallet tersebut.
     */
    function registerIssuer(
        address issuer
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _registerIssuer(issuer);
    }

    /**
     * @notice Cabut pendaftaran wallet institusi beserta `MINTER_ROLE`-nya.
     */
    function unregisterIssuer(
        address issuer
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            isRegisteredIssuer[issuer],
            "SBTError: Issuer is not registered"
        );
        isRegisteredIssuer[issuer] = false;
        _revokeRole(MINTER_ROLE, issuer);
        emit IssuerUnregistered(issuer);
    }

    function _registerIssuer(address issuer) internal {
        require(issuer != address(0), "SBTError: Issuer is zero address");
        require(
            !isRegisteredIssuer[issuer],
            "SBTError: Issuer already registered"
        );
        isRegisteredIssuer[issuer] = true;
        _grantRole(MINTER_ROLE, issuer);
        emit IssuerRegistered(issuer);
    }

    // ===== ERC-5192 =====

    /**
     * @inheritdoc IERC5192
     * @dev Revert jika token tidak ada (mengikuti perilaku `_requireOwned`).
     */
    function locked(uint256 tokenId) external view override returns (bool) {
        _requireOwned(tokenId);
        return _locked[tokenId];
    }

    /// @notice Helper non-standar untuk keterbacaan.
    function isLocked(uint256 tokenId) external view returns (bool) {
        return _locked[tokenId];
    }

    // ===== Soulbound constraint =====

    /**
     * @dev Mengizinkan minting (from == address(0)) dan burning,
     *      tetapi MENOLAK transfer antar wallet.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721Enumerable) returns (address) {
        address from = _ownerOf(tokenId);

        if (from != address(0) && to != address(0)) {
            revert("SBTError: Token is soulbound and non-transferable");
        }
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    // ===== Mint & Revoke =====

    /**
     * @notice Mint SBT ijazah ke wallet alumni dan kunci token.
     * @param to Wallet alumni penerima ijazah.
     * @param tokenId Token ID unik.
     * @param uri URI metadata IPFS (mis. `ipfs://bafy...`).
     */
    function safeMintSBT(
        address to,
        uint256 tokenId,
        string memory uri
    ) public onlyRole(MINTER_ROLE) onlyRegisteredIssuer {
        require(to != address(0), "SBTError: Receiver is zero address");
        require(bytes(uri).length > 0, "SBTError: Token URI is empty");

        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = uri;
        _locked[tokenId] = true;
        issuerOf[tokenId] = msg.sender;

        emit Locked(tokenId);
    }

    /**
     * @notice Tandai ijazah bermasalah sebagai revoked (tidak membakar token).
     */
    function revokeDiploma(
        uint256 tokenId
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _requireOwned(tokenId);
        require(!isRevoked[tokenId], "SBTError: Diploma already revoked");
        isRevoked[tokenId] = true;
        emit Revoked(tokenId);
    }

    // ===== Views =====

    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _tokenURIs[tokenId];
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return
            interfaceId == type(IERC5192).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
