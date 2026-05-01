import { z } from "zod";

export const RaritySchema = z.union([z.literal(4), z.literal(5), z.literal(6)]);
export const WeaponClassSchema = z.enum([
  "单手剑",
  "双手剑",
  "长柄",
  "手铳",
  "施术单元",
]);
export const RegionSchema = z.enum(["四号谷地", "武陵"]);

export const AttributePoolsSchema = z.object({
  base: z.array(z.string()).nonempty(),
  add: z.array(z.string()).nonempty(),
  skill: z.array(z.string()).nonempty(),
});

export const WeaponSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rarity: RaritySchema,
  weaponClass: WeaponClassSchema,
  operator: z.string().optional(),
  imageUrl: z.string().url().optional(),
  ideal: z.object({
    base: z.string(),
    add: z.string(),
    skill: z.string(),
  }),
});

export const DepositionPointSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  region: RegionSchema,
  skillPool: z.array(z.string()).nonempty(),
});

export const DataBundleSchema = z.object({
  attributes: AttributePoolsSchema,
  weapons: z.array(WeaponSchema),
  depositionPoints: z.array(DepositionPointSchema),
});

export type AttributePools = z.infer<typeof AttributePoolsSchema>;
export type Weapon = z.infer<typeof WeaponSchema>;
export type DepositionPoint = z.infer<typeof DepositionPointSchema>;
export type DataBundle = z.infer<typeof DataBundleSchema>;
export type Rarity = z.infer<typeof RaritySchema>;
export type WeaponClass = z.infer<typeof WeaponClassSchema>;
export type Region = z.infer<typeof RegionSchema>;

/**
 * 校验整体数据：保证武器与淤积点引用的词条都在 attributes 池里。
 * 这一层在静态数据载入时跑一次，scraper 写入时也跑一次。
 */
export function validateBundle(bundle: DataBundle) {
  const baseSet = new Set(bundle.attributes.base);
  const addSet = new Set(bundle.attributes.add);
  const skillSet = new Set(bundle.attributes.skill);

  const errors: string[] = [];
  for (const w of bundle.weapons) {
    if (!baseSet.has(w.ideal.base))
      errors.push(`weapon "${w.id}" has unknown base: ${w.ideal.base}`);
    if (!addSet.has(w.ideal.add))
      errors.push(`weapon "${w.id}" has unknown add: ${w.ideal.add}`);
    if (!skillSet.has(w.ideal.skill))
      errors.push(`weapon "${w.id}" has unknown skill: ${w.ideal.skill}`);
  }
  for (const p of bundle.depositionPoints) {
    for (const s of p.skillPool) {
      if (!skillSet.has(s))
        errors.push(`point "${p.id}" has unknown skill: ${s}`);
    }
  }
  if (errors.length) {
    throw new Error("Data validation failed:\n" + errors.join("\n"));
  }
}
