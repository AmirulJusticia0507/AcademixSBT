import { cp, rm } from "node:fs/promises";

// Vercel runs from the repository root when Root Directory is ".". The Next.js
// app lives in frontend/, so expose its completed build at the root location
// expected by Vercel's Next.js builder.
await rm(".next", { recursive: true, force: true });
await cp("frontend/.next", ".next", { recursive: true });
console.log("Copied frontend/.next to root .next for Vercel packaging.");
