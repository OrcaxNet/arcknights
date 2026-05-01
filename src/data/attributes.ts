export const BASE_ATTRS = [
  "主能力提升",
  "敏捷提升",
  "智识提升",
  "意志提升",
  "力量提升",
] as const;

export const ADD_ATTRS = [
  "攻击提升",
  "生命提升",
  "物理伤害提升",
  "法术伤害提升",
  "电磁伤害提升",
  "灼热伤害提升",
  "寒冷伤害提升",
  "暴击率提升",
] as const;

export const SKILL_ATTRS = [
  "压制",
  "追袭",
  "昂扬",
  "巧技",
  "夜幕",
  "流转",
  "附术",
  "效益",
] as const;

export type BaseAttr = (typeof BASE_ATTRS)[number];
export type AddAttr = (typeof ADD_ATTRS)[number];
export type SkillAttr = (typeof SKILL_ATTRS)[number];

export const BASE_LOCK_COUNT = 3;
export const ADD_OR_SKILL_POOL_SIZE = ADD_ATTRS.length + SKILL_ATTRS.length;
