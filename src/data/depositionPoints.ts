import type { DepositionPoint } from "@/lib/types";

// 数据基于森空岛官方 wiki 抓取，部分点位的 skillPool 未完整覆盖，
// 当玩家发现 wiki 已更新时可手动追加。
// 假设：每个重度能量淤积点掉落的基质，附加属性池为全 8 项，
// 仅 skillPool（技能池）按点位区分。
export const DEPOSITION_POINTS: DepositionPoint[] = [
  {
    id: "shuniu",
    name: "重度能量淤积点·枢纽区",
    region: "四号谷地",
    skillPool: ["压制"],
  },
  {
    id: "yuanshi",
    name: "重度能量淤积点·源石研究园",
    region: "四号谷地",
    skillPool: ["压制", "医疗"],
  },
  {
    id: "kuangmai",
    name: "重度能量淤积点·矿脉源区",
    region: "四号谷地",
    skillPool: ["压制", "追袭"],
  },
  {
    id: "gongneng",
    name: "重度能量淤积点·供能高地",
    region: "四号谷地",
    skillPool: ["医疗", "效益"],
  },
  {
    id: "wulingcheng",
    name: "重度能量淤积点·武陵城",
    region: "武陵",
    skillPool: ["医疗", "巧技", "附术"],
  },
  {
    id: "qingbo",
    name: "重度能量淤积点·清波寨",
    region: "武陵",
    skillPool: ["压制", "医疗", "夜幕", "流转"],
  },
];

export const DEPOSITION_POINT_BY_ID = new Map(
  DEPOSITION_POINTS.map((p) => [p.id, p]),
);
