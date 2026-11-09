# Contracts — AcademixSBT

Smart contract ijazah **Soulbound Token (ERC-5192 + ERC-721 Enumerable)** menggunakan
OpenZeppelin `AccessControl`.

## Perintah

```bash
npm install
npm run compile
npm test

# Isi .env dulu (lihat .env.example), lalu:
npm run deploy:amoy      # Polygon Amoy
npm run deploy:sepolia   # Arbitrum Sepolia
```

## Model akses

| Role / state | Kemampuan |
|---|---|
| `DEFAULT_ADMIN_ROLE` | Daftar/cabut issuer, grant/revoke role, `revokeDiploma` |
| `MINTER_ROLE` | Dimiliki issuer terdaftar; syarat `safeMintSBT` |
| `isRegisteredIssuer[address]` | Penanda wallet institusi terverifikasi |
| `issuerOf[tokenId]` | Alamat institusi penerbit, dibaca publik |

## Perilaku penting

- `safeMintSBT(to, tokenId, uri)` hanya bisa dipanggil wallet yang punya
  `MINTER_ROLE` **dan** terdaftar sebagai issuer. Token langsung `locked`.
- Transfer antar wallet selalu revert:
  `SBTError: Token is soulbound and non-transferable`.
- `revokeDiploma(tokenId)` tidak membakar token; hanya menandai `isRevoked = true`
  dan meng-emit `Revoked(tokenId)` agar bukti tetap dapat diaudit.
- `tokenOfOwnerByIndex(wallet, i)` memungkinkan portal verifikasi mencari token
  berdasarkan wallet tanpa backend.
- `mintedAt(tokenId)` menyimpan block timestamp minting untuk ditampilkan di portal.

## ERC-5192

`locked(uint256) returns (bool)` mengikuti standar. `supportsInterface` mengembalikan
`true` untuk `IERC5192` (`0xb45a3c0e`), `IERC721`, dan `IAccessControl`.
