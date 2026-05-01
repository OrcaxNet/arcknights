export type Rarity = 4 | 5 | 6;

export type WeaponClass =
  | "单手剑"
  | "双手剑"
  | "长柄"
  | "手铳"
  | "施术单元";

export type Region = "四号谷地" | "武陵";

export interface Weapon {
  id: string;
  name: string;
  rarity: Rarity;
  weaponClass: WeaponClass;
  operator?: string;
  imageUrl?: string;
  ideal: {
    base: string;
    add: string;
    skill: string;
  };
}

export interface DepositionPoint {
  id: string;
  name: string;
  region: Region;
  skillPool: string[];
}

export interface LockPlan {
  point: DepositionPoint;
  lockedBases: string[];
  lockedAttr: { name: string; kind: "add" | "skill" };
  hits: { weaponId: string; prob: number }[];
  totalProb: number;
}
