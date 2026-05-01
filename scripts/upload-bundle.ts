/**
 * 把当前的 src/data/bundle.json 上传到 Cloudflare KV。
 *
 * 用法：
 *   pnpm run kv:upload                # 写入 production KV
 *   pnpm run kv:upload -- --local     # 写入 wrangler dev 的本地 KV (--local)
 *   pnpm run kv:upload -- --preview   # 写入 preview KV (如果配了 preview_id)
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DataBundleSchema, validateBundle } from "../src/data/schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLE_PATH = path.resolve(__dirname, "../src/data/bundle.json");

function main() {
  const args = process.argv.slice(2);
  const local = args.includes("--local");
  const preview = args.includes("--preview");

  const raw = fs.readFileSync(BUNDLE_PATH, "utf-8");
  const parsed = DataBundleSchema.parse(JSON.parse(raw));
  validateBundle(parsed);
  console.log(
    `[upload] validated: ${parsed.weapons.length} weapons, ${parsed.depositionPoints.length} points`,
  );

  // 用 stdin 传递避免命令行长度问题
  const cmd = "wrangler";
  const wargs = [
    "kv",
    "key",
    "put",
    "--binding",
    "DATA",
    "bundle",
    raw,
  ];
  if (local) wargs.push("--local");
  if (preview) wargs.push("--preview");
  if (!local && !preview) wargs.push("--remote");

  console.log(`[upload] ${cmd} ${wargs.slice(0, 6).join(" ")} <bundle.json> ${wargs.slice(7).join(" ")}`);
  execFileSync(cmd, wargs, { stdio: "inherit" });
  console.log("[upload] done.");
}

main();
