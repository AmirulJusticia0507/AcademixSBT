export const DIPLOMA_SBT_ABI = [
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function locked(uint256 tokenId) view returns (bool)",
  "function isRevoked(uint256 tokenId) view returns (bool)",
  "function issuerOf(uint256 tokenId) view returns (address)",
  "function mintedAt(uint256 tokenId) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
] as const;
