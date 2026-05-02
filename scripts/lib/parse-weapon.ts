import bundle from "../../src/data/bundle.json";
import {
  findWidgetByTitle,
  getWidgetTabs,
  type ItemFull,
  type CatalogItem,
} from "./skland-api";

export interface WeaponInfo {
  gameEntryId: number;
  name: string;
  rarity: 4 | 5 | 6;
  weaponClass: string;
  ideal: { base: string; add: string; skill: string };
  imageUrl?: string;
}

const BASE_NAMES = bundle.attributes.base;
const ADD_NAMES = bundle.attributes.add;

const SKILL_CHAPTER = "武器技能和基质";
const SKILL_WIDGET = "技能详情";

const WEAPON_CLASS_TAG_ID = "10223";

/**
 * 武器面板的属性显示名 ↔ 基质池规范名的映射。
 * 同一个底层属性在两边的 wiki UI 用了不同字眼，统一到基质池命名。
 */
const ATTR_ALIASES: Record<string, string> = {
  法术提升: "法术伤害提升",
  源石技艺强度提升: "源石技艺提升",
  终结技充能效率提升: "终结技效率提升",
};

function canonicalize(name: string): string {
  const trimmed = name.trim();
  return ATTR_ALIASES[trimmed] ?? trimmed;
}

/**
 * 武器的三件套词条直接来自 widget "技能详情" 的 3 个 tab title：
 *   tab[0].title = "<base>·大"
 *   tab[1].title = "<add>·大"
 *   tab[2].title = "<skill>・<效果名>"
 *
 * weaponClass 从 item.subType.filterTagTree 的 "10223 武器" 节点解析，
 * 配合 item.brief.subTypeList 里 subTypeId=10223 的 value 拿到 className。
 */
export function parseWeapon(
  item: ItemFull,
  catalogItem: CatalogItem,
): WeaponInfo | null {
  const name = item.name.trim();
  const widget = findWidgetByTitle(item, SKILL_CHAPTER, SKILL_WIDGET);
  if (!widget) return null;
  const tabs = getWidgetTabs(item, widget.id);
  if (tabs.length < 3) return null;

  const stripSuffix = (t: string) => t.trim().replace(/·(?:大|中|小)\s*$/, "");
  const baseRaw = canonicalize(stripSuffix(tabs[0].title));
  const addRaw = canonicalize(stripSuffix(tabs[1].title));
  const skillRaw = canonicalize(tabs[2].title.split(/[・·]/)[0]);

  if (!BASE_NAMES.includes(baseRaw)) {
    console.warn(`  ! ${name}: unknown base "${baseRaw}"`);
    return null;
  }
  if (!ADD_NAMES.includes(addRaw)) {
    console.warn(`  ! ${name}: unknown add "${addRaw}"`);
    return null;
  }
  if (!skillRaw) return null;

  const weaponClass = resolveWeaponClass(item, catalogItem);
  if (!weaponClass) return null;

  const rarity = rarityFromCatalogItem(catalogItem);

  return {
    gameEntryId: Number(item.itemId),
    name,
    rarity,
    weaponClass,
    ideal: { base: baseRaw, add: addRaw, skill: skillRaw },
    imageUrl: item.brief?.cover ?? catalogItem.brief?.cover,
  };
}

function resolveWeaponClass(
  item: ItemFull,
  catalogItem: CatalogItem,
): string | null {
  const tree = (item.subType as { filterTagTree?: TreeNode[] })?.filterTagTree;
  if (!tree) return null;
  const node = tree.find((n) => n.id === WEAPON_CLASS_TAG_ID);
  if (!node) return null;
  // catalogItem.brief.subTypeList[] 中 subTypeId=10223 的 value 即 className 的 id
  const sub = catalogItem.brief as
    | { subTypeList?: { subTypeId: string; value: string }[] }
    | undefined;
  const valueId = sub?.subTypeList?.find((s) => s.subTypeId === WEAPON_CLASS_TAG_ID)?.value;
  if (!valueId) return null;
  const child = node.children?.find((c) => c.id === valueId);
  if (!child?.name) return null;
  // wiki 用 "长柄武器"，我们 schema 沿用 "长柄"
  return child.name.replace(/武器$/, "");
}

interface TreeNode {
  id: string;
  name?: string;
  children?: TreeNode[];
}

/** 从 catalog item 的 brief.subTypeList[subTypeId="10000"] 推断稀有度 */
export function rarityFromCatalogItem(item: CatalogItem): 4 | 5 | 6 {
  const sub = item.brief as
    | { subTypeList?: { subTypeId: string; value: string }[] }
    | undefined;
  const v = sub?.subTypeList?.find((s) => s.subTypeId === "10000")?.value;
  if (v === "10006") return 6;
  if (v === "10005") return 5;
  if (v === "10004") return 4;
  return 6;
}
