import type { Page } from "playwright";

export interface SubstrateInfo {
  /** wiki 上的 gameEntryId，用于追踪/去重 */
  gameEntryId: number;
  /** 基质名称，如 "无瑕基质·压制" */
  name: string;
  /** 该基质必出的技能属性，如 "压制" */
  fixedSkill: string;
  /** 可能出现的基础属性池 */
  basePool: string[];
  /** 可能出现的附加属性池 */
  addPool: string[];
  /** 可能出现的技能属性池（含 fixedSkill） */
  skillPool: string[];
  /** 该基质的所属区域 -> 淤积点列表 */
  regions: { region: string; points: string[] }[];
}

const TABLE_HEADER_NOISE =
  /属性名称属性词条初始数值蚀刻上限|属性名称|属性词条|初始数值|蚀刻上限/g;

const KNOWN_REGIONS = ["四号谷地", "武陵"] as const;

export async function parseSubstratePage(
  page: Page,
  gameEntryId: number,
): Promise<SubstrateInfo | null> {
  const fullText = await page.textContent("main").catch(() => null);
  if (!fullText) return null;

  const nameMatch = fullText.match(/无瑕基质·[一-龥]+/);
  if (!nameMatch) return null;
  const name = nameMatch[0];
  const fixedSkill = name.replace("无瑕基质·", "");

  const basePool = extractPoolBetween(
    fullText,
    "该基质可能出现的基础属性",
    "该基质可能出现的附加属性",
  );
  const addPool = extractPoolBetween(
    fullText,
    "该基质可能出现的附加属性",
    "该基质可能出现的技能属性",
  );
  const skillPool = extractPoolBetween(
    fullText,
    "该基质可能出现的技能属性",
    "注意：",
  );

  const regions = extractRegions(fullText);

  return {
    gameEntryId,
    name,
    fixedSkill,
    basePool,
    addPool,
    skillPool,
    regions,
  };
}

function extractPoolBetween(
  text: string,
  startMarker: string,
  endMarker: string,
): string[] {
  const start = text.indexOf(startMarker);
  if (start < 0) return [];
  const end = text.indexOf(endMarker, start + startMarker.length);
  let body = text.slice(start + startMarker.length, end > 0 ? end : undefined);
  // 把所有表头文字干掉，避免被作为名称误捕
  body = body.replace(TABLE_HEADER_NOISE, "│");
  // 行的形态: <名称>+1~+X+Y，名称只由汉字组成
  const matches = body.match(/[一-龥]{2,10}(?=\+\d+~\+)/g) ?? [];
  return [...new Set(matches)];
}

/**
 * 文本结构：
 *   "...所属区域<R1><R2>...重度能量淤积点 <R1的点1> <R1的点2> 敌人掉落
 *    注意：... 重度能量淤积点 <R2的点1> 敌人掉落 注意：..."
 *
 * 即：每个区域的点列表用 "敌人掉落" 分隔；区域顺序在 "所属区域" 之后顺次列出。
 */
function extractRegions(text: string) {
  const start = text.indexOf("所属区域");
  if (start < 0) return [];
  const tail = text.slice(start);

  // 提取区域顺序：在第一个 "重度能量淤积点" 之前出现的 region 列表
  const firstHeaderIdx = tail.indexOf("重度能量淤积点");
  const headerSection = tail.slice(0, firstHeaderIdx);
  const regionOrder = KNOWN_REGIONS.filter((r) => headerSection.includes(r));

  // 用 "敌人掉落" 分段。chunk i 对应 regionOrder[i] 的点。
  const chunks = tail.split("敌人掉落");
  const result: { region: string; points: string[] }[] = [];
  // 点名 2~6 个汉字，遇到下一个 "重度能量淤积点" / "敌人" / "注意" 即停
  const POINT_RE = /重度能量淤积点·([一-龥]+?)(?=重度能量淤积点|敌人|注意|$)/g;

  for (let i = 0; i < regionOrder.length; i++) {
    const chunk = chunks[i] ?? "";
    const points: string[] = [];
    for (const m of chunk.matchAll(POINT_RE)) {
      const name = `重度能量淤积点·${m[1]}`;
      if (!points.includes(name)) points.push(name);
    }
    if (points.length > 0) {
      result.push({ region: regionOrder[i], points });
    }
  }
  return result;
}
