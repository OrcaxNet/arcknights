import type { Page } from "playwright";
import bundle from "../../src/data/bundle.json";

export interface WeaponInfo {
  gameEntryId: number;
  name: string;
  rarity: 4 | 5 | 6;
  weaponClass: string;
  operator?: string;
  ideal: { base: string; add: string; skill: string };
}

const BASE_NAMES = bundle.attributes.base;
const ADD_NAMES = bundle.attributes.add;
const WEAPON_CLASSES = ["施术单元", "单手剑", "双手剑", "长柄", "手铳"] as const;

export async function parseWeaponPage(
  page: Page,
  gameEntryId: number,
): Promise<WeaponInfo | null> {
  const fullText = await page.textContent("main").catch(() => null);
  if (!fullText) return null;

  // 1) 武器名：从 document.title 提取
  const title = await page.title();
  const name = title.replace(/\s*-\s*《.*$/, "").trim();
  if (!name) return null;

  // 2) 武器类型
  const weaponClass = WEAPON_CLASSES.find((c) => fullText.includes(c));
  if (!weaponClass) return null;

  // 3) 推荐基质 → 技能名
  const skillMatch = fullText.match(/武器基质推荐\s*无瑕基质·([一-龥]+?)(?=武器|属性|$)/);
  const idealSkill = skillMatch?.[1];
  if (!idealSkill) return null;

  // 4) 基础属性：在 5 个已知基础属性里找"<X>·大|·小|·中"形式
  let base: string | undefined;
  for (const candidate of BASE_NAMES) {
    if (new RegExp(`${candidate}·(?:大|小|中)`).test(fullText)) {
      base = candidate;
      break;
    }
  }
  if (!base) return null;

  // 5) 附加属性：在已知附加列表里找一个"<X>·大|·小|·中"，且 != base
  const add = ADD_NAMES.find(
    (c) => c !== base && new RegExp(`${c}·(?:大|小|中)`).test(fullText),
  );
  if (!add) return null;

  // 6) 稀有度：从 6 颗星形结构推断；通过页面里 "★" 数量在 [1,6] 之间的小簇
  const stars = (fullText.match(/★/g) ?? []).length;
  let rarity: 4 | 5 | 6 = 6;
  if (stars >= 6) rarity = 6;
  else if (stars === 5) rarity = 5;
  else if (stars >= 4) rarity = 4;

  return {
    gameEntryId,
    name,
    rarity,
    weaponClass,
    ideal: { base, add, skill: idealSkill },
  };
}
