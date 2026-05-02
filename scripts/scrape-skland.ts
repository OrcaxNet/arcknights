/**
 * 通过 skland 官方 API（zonai.skland.com）拉取武器、基质，渲染 documentMap 后解析。
 * 不依赖浏览器，纯 fetch + 签名。
 *
 * 用法：
 *   pnpm scrape                # 全量拉取（catalog → 所有武器+基质）
 *   pnpm scrape --dry-run      # 只打印解析结果，不写文件
 *   pnpm scrape --limit=N      # 仅处理前 N 个 item，调试用
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DataBundleSchema, validateBundle, type DataBundle } from "../src/data/schema";
import { fetchCatalog, fetchItem } from "./lib/skland-api";
import { parseSubstrate, type SubstrateInfo } from "./lib/parse-substrate";
import { parseWeapon, type WeaponInfo } from "./lib/parse-weapon";
import { mirrorImage } from "./lib/image-mirror";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const BUNDLE_PATH = path.resolve(REPO_ROOT, "src/data/bundle.json");

interface CliArgs {
  dryRun: boolean;
  limit?: number;
  weapons: boolean;
  substrates: boolean;
}

function parseArgs(): CliArgs {
  const out: CliArgs = { dryRun: false, weapons: true, substrates: true };
  for (const a of process.argv.slice(2)) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a.startsWith("--limit=")) out.limit = Number(a.slice(8));
    else if (a === "--no-weapons") out.weapons = false;
    else if (a === "--no-substrates") out.substrates = false;
  }
  return out;
}

const SUBTYPE_WEAPON = "2";
const SUBTYPE_SUBSTRATE = "7";

async function main() {
  const args = parseArgs();
  console.log("[scrape] fetching catalog...");
  const catalog = await fetchCatalog(1);
  const main = catalog[0];
  if (!main) throw new Error("no catalog returned");

  const weaponItems =
    main.typeSub.find((t) => t.id === SUBTYPE_WEAPON)?.items ?? [];
  const substrateItems =
    main.typeSub.find((t) => t.id === SUBTYPE_SUBSTRATE)?.items ?? [];

  console.log(
    `[scrape] catalog: ${weaponItems.length} weapons, ${substrateItems.length} substrates`,
  );

  const weapons: WeaponInfo[] = [];
  if (args.weapons) {
    const list = args.limit ? weaponItems.slice(0, args.limit) : weaponItems;
    for (const item of list) {
      try {
        const detail = await fetchItem(item.itemId);
        const parsed = parseWeapon(detail, item);
        if (parsed) {
          if (parsed.imageUrl && parsed.imageUrl.startsWith("http")) {
            try {
              parsed.imageUrl = await mirrorImage(parsed.imageUrl, REPO_ROOT);
            } catch (err) {
              console.warn(`    image mirror failed for ${parsed.name}:`, (err as Error).message);
            }
          }
          weapons.push(parsed);
          console.log(`  ✓ ${item.name} (${parsed.weaponClass}) → ${parsed.ideal.base} / ${parsed.ideal.add} / ${parsed.ideal.skill}`);
        } else {
          console.log(`  - ${item.name}: skipped (not enough info)`);
        }
      } catch (err) {
        console.warn(`  ! ${item.name} (${item.itemId}) failed:`, (err as Error).message);
      }
    }
  }

  const substrates: SubstrateInfo[] = [];
  if (args.substrates) {
    // 只处理 "无瑕基质·X" 前缀的（其他品质不需要）；wiki name 偶尔带前导空格
    const list = (args.limit ? substrateItems.slice(0, args.limit) : substrateItems).filter(
      (i) => i.name.trim().startsWith("无瑕基质"),
    );
    for (const item of list) {
      try {
        const detail = await fetchItem(item.itemId);
        const parsed = parseSubstrate(detail);
        if (parsed) {
          substrates.push(parsed);
          console.log(
            `  ✓ ${item.name} → skill=${parsed.fixedSkill}, ${parsed.regions.length} regions`,
          );
        } else {
          console.log(`  - ${item.name}: skipped`);
        }
      } catch (err) {
        console.warn(`  ! ${item.name} (${item.itemId}) failed:`, (err as Error).message);
      }
    }
  }

  if (args.dryRun) {
    console.log("\n[dry-run] preview:");
    console.log(JSON.stringify({ weapons, substrates }, null, 2).slice(0, 4000));
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

  // weapons：用 g{gameEntryId} 作为稳定 ID
  const newWeapons = input.weapons.map((w) => ({
    id: `g${w.gameEntryId}`,
    name: w.name,
    rarity: w.rarity,
    weaponClass: w.weaponClass as DataBundle["weapons"][number]["weaponClass"],
    ideal: w.ideal,
    imageUrl: w.imageUrl,
  }));

  // depositionPoints：从 substrates 反推 (region, point) → 支持的 skill 集合
  const pointMap = new Map<
    string,
    { name: string; region: string; skills: Set<string> }
  >();
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

  const newPoints = [...pointMap.values()].map((p) => ({
    id: pinyinSafeId(p.name),
    name: p.name,
    region: p.region as DataBundle["depositionPoints"][number]["region"],
    skillPool: [...p.skills],
  }));

  const bundle: DataBundle = {
    attributes: existing.attributes,
    weapons: newWeapons.length > 0 ? newWeapons : existing.weapons,
    depositionPoints: newPoints.length > 0 ? newPoints : existing.depositionPoints,
  };

  DataBundleSchema.parse(bundle);
  validateBundle(bundle);

  fs.writeFileSync(BUNDLE_PATH, JSON.stringify(bundle, null, 2) + "\n");
}

function pinyinSafeId(name: string): string {
  // 用一个稳定哈希，避免命名冲突
  return name.replace(/[·\s]/g, "_").replace(/[^a-zA-Z0-9_一-龥]/g, "");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
