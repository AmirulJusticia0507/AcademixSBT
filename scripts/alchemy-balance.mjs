import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// Load .env (root) without extra dependencies.
const envPath = path.join(root, ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

const apiKey = process.env.ALCHEMY_API_KEY;
if (!apiKey) {
  console.error("ALCHEMY_API_KEY not found. Add it to root .env as ALCHEMY_API_KEY=<your-key>.");
  process.exit(1);
}

const endpoint = `https://arb-mainnet.g.alchemy.com/v2/${apiKey}`;
const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"; // vitalik.eth

const res = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "eth_getBalance",
    params: [address, "latest"],
  }),
});

const text = await res.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  console.error("Non-JSON response", res.status, text);
  process.exit(1);
}

if (!res.ok || json.error) {
  console.error("Request failed", { httpStatus: res.status, error: json.error ?? json });
  process.exit(1);
}

const wei = BigInt(json.result);
const ethWhole = wei / 10n ** 18n;
const ethFrac = (wei % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "") || "0";

console.log("Endpoint: https://arb-mainnet.g.alchemy.com/v2/<ALCHEMY_API_KEY>");
console.log("Method:   eth_getBalance");
console.log("Address:  ", address, "(vitalik.eth)");
console.log("Balance (wei):", wei.toString());
console.log("Balance (ETH):", `${ethWhole}.${ethFrac}`);
console.log("Raw result:", json.result);
