import type { Page } from "playwright";

export const SKLAND_BASE = "https://wiki.skland.com/endfield";

/**
 * mainTypeId=1 是 "终末地百科"；subTypeId 对应不同分类：
 *   2 = 武器
 *   7 = 武器基质
 *   3 = 装备
 *   ... 其他可在 wiki 主页观察
 */
export const SUB_TYPE = {
  weapon: 2,
  substrate: 7,
} as const;

export type SubType = keyof typeof SUB_TYPE;

export function catalogUrl(sub: SubType) {
  return `${SKLAND_BASE}/catalog?typeMainId=1&typeSubId=${SUB_TYPE[sub]}`;
}

export function detailUrl(sub: SubType, gameEntryId: number | string) {
  return `${SKLAND_BASE}/detail?mainTypeId=1&subTypeId=${SUB_TYPE[sub]}&gameEntryId=${gameEntryId}`;
}

/** 等到 SPA 渲染完成，主要内容出现 */
export async function waitForRender(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 30_000 });
  await page.waitForFunction(
    () => {
      const root = document.getElementById("root");
      return root && root.textContent && root.textContent.length > 200;
    },
    { timeout: 30_000 },
  );
}

/** 拿到分类页面下所有 entry 卡片对应的 gameEntryId（通过 click 后的 URL 解析） */
export async function listEntries(
  page: Page,
  sub: SubType,
): Promise<{ id: number; name: string }[]> {
  await page.goto(catalogUrl(sub));
  await waitForRender(page);

  // 卡片是按钮，没有 href；只能通过把每个 card 视为可点击元素，
  // 逐个 click → 读 URL → goBack。耗时但可靠。
  // 实际上，我们更倾向于通过 SPA 里 React state 暴露 list。这里简化版：
  // 用 textContent 抓所有显眼的物品名（其格式稳定）+ 等待我们另外维护 ID 表。
  const names = await page.$$eval('button[role="button"], button', (btns) =>
    btns
      .map((b) => b.textContent?.trim() ?? "")
      .filter((t) => t.length > 0 && t.length < 30),
  );
  return names.map((name, i) => ({ id: i, name }));
}
