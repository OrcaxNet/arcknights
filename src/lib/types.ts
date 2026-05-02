export type {
  Weapon,
  DepositionPoint,
  Rarity,
  WeaponClass,
  Region,
  AttributePools,
  DataBundle,
} from "@/data/schema";

import type { DepositionPoint } from "@/data/schema";

export interface LockOption {
  lockedBases: string[];
  lockedAttr: { name: string; kind: "add" | "skill" };
}

/**
 * 一个推荐方案 = (淤积点, 覆盖武器集合)。
 * 同一组内可以有多个等价的锁词条选择（lockOptions），UI 上以"其他锁定方案"折叠展示。
 */
export interface PlanGroup {
  point: DepositionPoint;
  hits: { weaponId: string; prob: number }[];
  totalProb: number;
  lockOptions: LockOption[];
}

/** @deprecated kept for tests; new code uses PlanGroup */
export interface LockPlan {
  point: DepositionPoint;
  lockedBases: string[];
  lockedAttr: { name: string; kind: "add" | "skill" };
  hits: { weaponId: string; prob: number }[];
  totalProb: number;
}
