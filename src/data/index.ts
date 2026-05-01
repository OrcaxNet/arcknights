import bundleJson from "./bundle.json";
import { DataBundleSchema, validateBundle, type DataBundle } from "./schema";

const bundle: DataBundle = DataBundleSchema.parse(bundleJson);
validateBundle(bundle);

export const ATTRIBUTES = bundle.attributes;
export const BASE_ATTRS = bundle.attributes.base;
export const ADD_ATTRS = bundle.attributes.add;
export const SKILL_ATTRS = bundle.attributes.skill;

export const WEAPONS = bundle.weapons;
export const WEAPON_BY_ID = new Map(WEAPONS.map((w) => [w.id, w]));

export const DEPOSITION_POINTS = bundle.depositionPoints;
export const DEPOSITION_POINT_BY_ID = new Map(
  DEPOSITION_POINTS.map((p) => [p.id, p]),
);

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
