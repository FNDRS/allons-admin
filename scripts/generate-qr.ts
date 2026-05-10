/**
 * Generates one PNG + SVG QR per source into ./qrs/.
 *
 * Run from allons-admin:
 *   pnpm run qr
 *   BASE_URL=https://allonsapp.com pnpm run qr
 *
 * Each QR encodes:
 *   {BASE_URL}/?src={slug}
 *
 * Notes:
 * - This script is intentionally hosted in allons-admin, where waitlist QR
 *   attribution is managed.
 * - Keep slugs stable between reprints so analytics remain consistent.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import QRCode from "qrcode";

interface Source {
  slug: string;
  label?: string;
}

const SOURCES: Source[] = [
  { slug: "la20", label: "La 20 Cervecería" },
  { slug: "diunsa", label: "Diunsa" },
  { slug: "multiplaza", label: "Mall Multiplaza" },
];

const baseFromEnv =
  process.env.BASE_URL ?? process.env.NEXT_PUBLIC_WAITLIST_BASE_URL;
const BASE_URL = baseFromEnv ?? "https://allonsapp.com";
const OUT_DIR = path.resolve(process.cwd(), "qrs");

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const summary: { slug: string; url: string; png: string; svg: string }[] = [];

  for (const src of SOURCES) {
    const url = `${BASE_URL}/?src=${encodeURIComponent(src.slug)}`;
    const safeName = src.slug.replace(/[^a-z0-9-_]/gi, "");

    const pngPath = path.join(OUT_DIR, `${safeName}.png`);
    const svgPath = path.join(OUT_DIR, `${safeName}.svg`);

    await QRCode.toFile(pngPath, url, {
      width: 1024,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "H",
    });

    const svg = await QRCode.toString(url, {
      type: "svg",
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "H",
    });
    await fs.writeFile(svgPath, svg, "utf8");

    summary.push({ slug: src.slug, url, png: pngPath, svg: svgPath });
    console.log(`✓ ${src.label ?? src.slug}  →  ${url}`);
  }

  const indexPath = path.join(OUT_DIR, "index.json");
  await fs.writeFile(indexPath, JSON.stringify(summary, null, 2));
  console.log(`\nGenerated ${summary.length} QR codes in ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
