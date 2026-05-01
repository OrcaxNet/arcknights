import type { Weapon } from "@/lib/types";

const HYCDN = "https://bbs.hycdn.cn/image/common";

export const WEAPONS: Weapon[] = [
  {
    id: "wuzhongweiguang",
    name: "雾中微光",
    rarity: 6,
    weaponClass: "施术单元",
    operator: "庄方宜",
    ideal: {
      base: "意志提升",
      add: "电磁伤害提升",
      skill: "效益",
    },
  },
  {
    id: "guzhou",
    name: "孤舟",
    rarity: 6,
    weaponClass: "施术单元",
    ideal: {
      base: "意志提升",
      add: "电磁伤害提升",
      skill: "效益",
    },
  },
  {
    id: "langzhifei",
    name: "狼之绯",
    rarity: 6,
    weaponClass: "双手剑",
    ideal: {
      base: "力量提升",
      add: "物理伤害提升",
      skill: "压制",
    },
  },
  {
    id: "luocao",
    name: "落草",
    rarity: 6,
    weaponClass: "长柄",
    ideal: {
      base: "敏捷提升",
      add: "物理伤害提升",
      skill: "追袭",
    },
  },
  {
    id: "wangxiang",
    name: "望乡",
    rarity: 6,
    weaponClass: "手铳",
    ideal: {
      base: "敏捷提升",
      add: "物理伤害提升",
      skill: "追袭",
    },
  },
  {
    id: "guangrongjiyi",
    name: "光荣记忆",
    rarity: 6,
    weaponClass: "单手剑",
    ideal: {
      base: "智识提升",
      add: "法术伤害提升",
      skill: "附术",
    },
  },
  {
    id: "yishubaojun",
    name: "艺术暴君",
    rarity: 6,
    weaponClass: "施术单元",
    ideal: {
      base: "智识提升",
      add: "法术伤害提升",
      skill: "巧技",
    },
  },
  {
    id: "rongzhuhuoyan",
    name: "熔铸火焰",
    rarity: 5,
    weaponClass: "长柄",
    ideal: {
      base: "力量提升",
      add: "灼热伤害提升",
      skill: "压制",
    },
  },
  {
    id: "qishijingshen",
    name: "骑士精神",
    rarity: 5,
    weaponClass: "单手剑",
    ideal: {
      base: "力量提升",
      add: "物理伤害提升",
      skill: "昂扬",
    },
  },
  {
    id: "yiwang",
    name: "遗忘",
    rarity: 5,
    weaponClass: "双手剑",
    ideal: {
      base: "力量提升",
      add: "寒冷伤害提升",
      skill: "夜幕",
    },
  },
  {
    id: "linghangzhe",
    name: "领航者",
    rarity: 5,
    weaponClass: "手铳",
    ideal: {
      base: "敏捷提升",
      add: "暴击率提升",
      skill: "流转",
    },
  },
  {
    id: "baopodanyuan",
    name: "爆破单元",
    rarity: 5,
    weaponClass: "施术单元",
    ideal: {
      base: "意志提升",
      add: "法术伤害提升",
      skill: "效益",
    },
  },
];

export const WEAPON_BY_ID = new Map(WEAPONS.map((w) => [w.id, w]));

export const _HYCDN = HYCDN;
