/**
 * 从森空岛官方 wiki 抓取武器、基质、淤积点信息，写入 src/data/bundle.json。
 *
 * 用法：
 *   pnpm exec tsx scripts/scrape-skland.ts --ids="465,472,..."  # 用 gameEntryId 列表
 *   pnpm exec tsx scripts/scrape-skland.ts --discover            # 自动从 catalog 页发现 (TODO)
 *
 * 由于 skland wiki 是 SPA，必须用 Playwright 渲染后再读 DOM 文本。
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DataBundleSchema, validateBundle, type DataBundle } from "../src/data/schema";
import { detailUrl, waitForRender } from "./lib/skland";
import { parseSubstratePage, type SubstrateInfo } from "./lib/parse-substrate";
import { parseWeaponPage, type WeaponInfo } from "./lib/parse-weapon";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLE_PATH = path.resolve(__dirname, "../src/data/bundle.json");

interface CliArgs {
  weaponIds: number[];
  substrateIds: number[];
  dryRun: boolean;
  fromManifest: boolean;
}

function parseArgs(): CliArgs {
  const out: CliArgs = {
    weaponIds: [],
    substrateIds: [],
    dryRun: false,
    fromManifest: false,
  };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--weapons=")) {
      out.weaponIds = arg
        .slice("--weapons=".length)
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n));
    } else if (arg.startsWith("--substrates=")) {
      out.substrateIds = arg
        .slice("--substrates=".length)
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n));
    } else if (arg === "--dry-run") {
      out.dryRun = true;
    } else if (arg === "--from-manifest") {
      out.fromManifest = true;
    }
  }

  if (out.fromManifest && out.weaponIds.length === 0 && out.substrateIds.length === 0) {
    const manifestPath = path.resolve(__dirname, "skland-ids.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as {
      weapons: number[];
      substrates: number[];
    };
    out.weaponIds = manifest.weapons ?? [];
    out.substrateIds = manifest.substrates ?? [];
  }

  return out;
}

async function main() {
  const args = parseArgs();
  if (args.weaponIds.length === 0 && args.substrateIds.length === 0) {
    console.error(
      "Usage:\n" +
        "  tsx scripts/scrape-skland.ts --weapons=1400,1401 --substrates=465,472\n" +
        "  tsx scripts/scrape-skland.ts --from-manifest\n" +
        "  add --dry-run to print without writing",
    );
    process.exit(1);
  }

  console.log("[scrape] launching browser...");
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
  });
  const page = await ctx.newPage();

  const weapons: WeaponInfo[] = [];
  for (const id of args.weaponIds) {
    console.log(`[scrape] weapon ${id}`);
    await page.goto(detailUrl("weapon", id));
    await waitForRender(page);
    const w = await parseWeaponPage(page, id);
    if (w) weapons.push(w);
    else console.warn(`  ! failed to parse weapon ${id}`);
  }

  const substrates: SubstrateInfo[] = [];
  for (const id of args.substrateIds) {
    console.log(`[scrape] substrate ${id}`);
    await page.goto(detailUrl("substrate", id));
    await waitForRender(page);
    const s = await parseSubstratePage(page, id);
    if (s) substrates.push(s);
    else console.warn(`  ! failed to parse substrate ${id}`);
  }

  await browser.close();

  if (args.dryRun) {
    console.log(JSON.stringify({ weapons, substrates }, null, 2));
    return;
  }

  await mergeIntoBundle({ weapons, substrates });
  console.log(`[scrape] wrote ${BUNDLE_PATH}`);
}

async function mergeIntoBundle(input: {
  weapons: WeaponInfo[];
  substrates: SubstrateInfo[];
}) {
  const existing: DataBundle = DataBundleSchema.parse(
    JSON.parse(fs.readFileSync(BUNDLE_PATH, "utf-8")),
  );

  // Merge weapons by id (id = pinyin slug; we don't have pinyin here so use gameEntryId)
  const weaponById = new Map(existing.weapons.map((w) => [w.id, w]));
  for (const w of input.weapons) {
    const id = `g${w.gameEntryId}`;
    weaponById.set(id, {
      id,
      name: w.name,
      rarity: w.rarity,
      weaponClass: w.weaponClass as DataBundle["weapons"][number]["weaponClass"],
      ideal: w.ideal,
    });
  }

  // Build new depositionPoints from substrates
  const pointMap = new Map<string, { name: string; region: string; skills: Set<string> }>();
  // Keep existing first
  for (const p of existing.depositionPoints) {
    pointMap.set(p.name, {
      name: p.name,
      region: p.region,
      skills: new Set(p.skillPool),
    });
  }
  for (const s of input.substrates) {
    for (const r of s.regions) {
      for (const pname of r.points) {
        const cur = pointMap.get(pname) ?? {
          name: pname,
          region: r.region,
          skills: new Set<string>(),
        };
        cur.skills.add(s.fixedSkill);
        pointMap.set(pname, cur);
      }
    }
  }

  const depositionPoints = [...pointMap.values()].map((p) => ({
    id: p.name.replace(/[·\s]/g, "_"),
    name: p.name,
    region: p.region as DataBundle["depositionPoints"][number]["region"],
    skillPool: [...p.skills],
  }));

  const bundle: DataBundle = {
    attributes: existing.attributes,
    weapons: [...weaponById.values()],
    depositionPoints,
  };

  // Validate
  DataBundleSchema.parse(bundle);
  validateBundle(bundle);

  fs.writeFileSync(BUNDLE_PATH, JSON.stringify(bundle, null, 2) + "\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
