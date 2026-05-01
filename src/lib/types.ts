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

export interface LockPlan {
  point: DepositionPoint;
  lockedBases: string[];
  lockedAttr: { name: string; kind: "add" | "skill" };
  hits: { weaponId: string; prob: number }[];
  totalProb: number;
}
