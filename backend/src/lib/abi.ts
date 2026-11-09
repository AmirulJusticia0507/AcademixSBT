/**
 * ABI minimal `DiplomaSBT` — hanya fungsi/event yang dipakai backend & portal.
 */
export const DIPLOMA_SBT_ABI = [
  // Reads
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function locked(uint256 tokenId) view returns (bool)",
  "function isLocked(uint256 tokenId) view returns (bool)",
  "function isRevoked(uint256 tokenId) view returns (bool)",
  "function issuerOf(uint256 tokenId) view returns (address)",
  "function isRegisteredIssuer(address issuer) view returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function MINTER_ROLE() view returns (bytes32)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  // Writes
  "function safeMintSBT(address to, uint256 tokenId, string uri)",
  "function revokeDiploma(uint256 tokenId)",
  "function registerIssuer(address issuer)",
  "function unregisterIssuer(address issuer)",
  // Events
  "event Locked(uint256 tokenId)",
  "event Revoked(uint256 tokenId)",
  "event IssuerRegistered(address indexed issuer)",
  "event IssuerUnregistered(address indexed issuer)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
] as const;
