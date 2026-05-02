import fs from "node:fs";
import https from "node:https";
import path from "node:path";

const IMG_DIR_REL = "public/img";

/**
 * 把 bbs.hycdn.cn 直链的图片下载到 public/img/，返回站内绝对路径 /img/<filename>。
 * - 文件名沿用源文件（hash 命名，已稳定，重复下载会跳过）。
 * - 已存在则直接返回路径，不重新下载，便于本地反复 scrape。
 */
export async function mirrorImage(srcUrl: string, repoRoot: string): Promise<string> {
  const u = new URL(srcUrl);
  const filename = path.basename(u.pathname);
  const destDir = path.join(repoRoot, IMG_DIR_REL);
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, filename);
  if (!fs.existsSync(dest)) {
    await downloadTo(srcUrl, dest);
  }
  return `/img/${filename}`;
}

function downloadTo(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          family: 4,
          headers: {
            "User-Agent": "Mozilla/5.0",
            Referer: "https://wiki.skland.com/",
          },
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            // follow one redirect
            downloadTo(res.headers.location, dest).then(resolve, reject);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            return;
          }
          const tmp = `${dest}.tmp`;
          const w = fs.createWriteStream(tmp);
          res.pipe(w);
          w.on("finish", () => {
            w.close();
            fs.renameSync(tmp, dest);
            resolve();
          });
          w.on("error", reject);
        },
      )
      .on("error", reject);
  });
}
