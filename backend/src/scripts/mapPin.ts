import { mapToNationalDiplomaNumber } from "../lib/nationalDiplomaNumber";

/**
 * Preview mapping PIN lama (15 digit) -> NINa PISN (21 digit).
 *
 *   npm run map:pin -- 792022017000019 001021
 *   npm run map:pin -- 001021551012024100003 001021
 *
 * Nomor resmi tetap harus di-generate/diverifikasi di aplikasi PISN.
 */
function main(): void {
  const [number, institutionCode] = process.argv.slice(2);

  if (!number || !institutionCode) {
    console.error(
      "Usage: npm run map:pin -- <PIN 15 digit | NINa 21 digit> <kode PT 6 digit>",
    );
    process.exitCode = 1;
    return;
  }

  const result = mapToNationalDiplomaNumber(number, { institutionCode });
  console.log(JSON.stringify({ ...result, institutionCode }, null, 2));
}

main();
