import bundleJson from "./bundle.json";
import { DataBundleSchema, validateBundle, type DataBundle } from "./schema";

const baked: DataBundle = DataBundleSchema.parse(bundleJson);
validateBundle(baked);

/**
 * 编译期内置 bundle，作为 SSG 渲染的兜底/初始值。
 * 运行时会被 /api/bundle 的 KV 数据覆盖（如果有）。
 */
export const BUNDLED: DataBundle = baked;

// 词条池：稳定不变，无需运行时刷新
export const ATTRIBUTES = baked.attributes;
export const BASE_ATTRS = baked.attributes.base;
export const ADD_ATTRS = baked.attributes.add;
export const SKILL_ATTRS = baked.attributes.skill;
export const BASE_LOCK_COUNT = 3;

export type {
  AttributePools,
  Weapon,
  DepositionPoint,
  Rarity,
  WeaponClass,
  Region,
  DataBundle,
} from "./schema";
