import {
  findWidgetByTitle,
  getDocument,
  getWidgetTabs,
  type ItemFull,
} from "./skland-api";
import { findFirstTable, renderDocument } from "./document-text";

export interface SubstrateInfo {
  gameEntryId: number;
  /** 基质名称，如 "无瑕基质·压制" */
  name: string;
  /** 必出技能 */
  fixedSkill: string;
  /** 可能出现的基础属性池 */
  basePool: string[];
  /** 可能出现的附加属性池 */
  addPool: string[];
  /** 可能出现的技能属性池 */
  skillPool: string[];
  /** 区域 → 该区域的淤积点 */
  regions: { region: string; points: string[] }[];
}

const PROP_CHAPTER = "基质属性";
const W_FIXED_SKILL = "该基质必定出现的技能属性";
const W_BASE = "该基质可能出现的基础属性";
const W_ADD = "该基质可能出现的附加属性";
const W_SKILL_POOL = "该基质可能出现的技能属性";

const ACQ_CHAPTER = "获取方式";
const W_REGION = "所属区域";

export function parseSubstrate(item: ItemFull): SubstrateInfo | null {
  const name = item.name.trim();
  if (!name.startsWith("无瑕基质")) return null;

  const fixedSkill = readFirstColumnNames(item, PROP_CHAPTER, W_FIXED_SKILL)[0];
  const basePool = readFirstColumnNames(item, PROP_CHAPTER, W_BASE);
  const addPool = readFirstColumnNames(item, PROP_CHAPTER, W_ADD);
  const skillPool = readSkillPoolCells(item, PROP_CHAPTER, W_SKILL_POOL);

  const regions: SubstrateInfo["regions"] = [];
  const regionWidget = findWidgetByTitle(item, ACQ_CHAPTER, W_REGION);
  if (regionWidget) {
    for (const tab of getWidgetTabs(item, regionWidget.id)) {
      const doc = getDocument(item, tab.documentId);
      if (!doc) continue;
      const text = renderDocument(doc);
      const points = [
        ...new Set(
          (text.match(/重度能量淤积点·[一-龥]+/g) ?? []).filter(
            (p) => p !== "重度能量淤积点",
          ),
        ),
      ];
      if (points.length > 0) {
        regions.push({ region: tab.title, points });
      }
    }
  }

  if (!fixedSkill) return null;

  return {
    gameEntryId: Number(item.itemId),
    name,
    fixedSkill,
    basePool,
    addPool,
    skillPool,
    regions,
  };
}

/** 从一个 widget 的 default tab 文档拿表格，剔除表头后取第一列名称 */
function readFirstColumnNames(
  item: ItemFull,
  chapterTitle: string,
  widgetTitle: string,
): string[] {
  const widget = findWidgetByTitle(item, chapterTitle, widgetTitle);
  if (!widget) return [];
  const [{ documentId } = { documentId: "" }] = getWidgetTabs(item, widget.id);
  const doc = getDocument(item, documentId);
  if (!doc) return [];
  const rows = findFirstTable(doc);
  return rows
    .slice(1) // 跳过表头
    .map((r) => r[0])
    .filter((s) => s && s.length >= 2 && !/属性|蚀刻|初始|名称/.test(s));
}

/** 技能池表格是双列布局，需要把所有列的"名称"都拼起来 */
function readSkillPoolCells(
  item: ItemFull,
  chapterTitle: string,
  widgetTitle: string,
): string[] {
  const widget = findWidgetByTitle(item, chapterTitle, widgetTitle);
  if (!widget) return [];
  const [{ documentId } = { documentId: "" }] = getWidgetTabs(item, widget.id);
  const doc = getDocument(item, documentId);
  if (!doc) return [];
  const rows = findFirstTable(doc);
  if (rows.length === 0) return [];
  // 表头那行所有看起来是"属性名称"列的索引
  const header = rows[0];
  const nameColIdxs: number[] = [];
  header.forEach((h, i) => {
    if (h.includes("属性名称")) nameColIdxs.push(i);
  });
  if (nameColIdxs.length === 0) nameColIdxs.push(0);

  const out: string[] = [];
  for (const r of rows.slice(1)) {
    for (const idx of nameColIdxs) {
      const v = r[idx];
      if (v && v.length >= 1 && !/属性|蚀刻|初始|名称/.test(v)) {
        if (!out.includes(v)) out.push(v);
      }
    }
  }
  return out;
}
