import crypto from "node:crypto";
import https from "node:https";

const HOST = "zonai.skland.com";
const COMMON_HEADERS = {
  Origin: "https://wiki.skland.com",
  Referer: "https://wiki.skland.com/",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
};

interface RawResponse<T> {
  code: number;
  message: string;
  timestamp: string;
  data: T;
}

let cachedToken: string | null = null;
async function getToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  const res = await rawRequest<{ token: string }>("/web/v1/auth/refresh");
  cachedToken = res.data.token;
  return cachedToken;
}

function rawRequest<T>(
  path: string,
  extraHeaders: Record<string, string> = {},
): Promise<RawResponse<T>> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: HOST,
        path,
        method: "GET",
        family: 4,
        headers: { ...COMMON_HEADERS, "Content-Type": "application/json", ...extraHeaders },
      },
      (res) => {
        let buf = "";
        res.on("data", (c) => (buf += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(buf));
          } catch (e) {
            reject(new Error(`bad JSON from ${path}: ${buf.slice(0, 200)}`));
          }
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

function buildSign(
  token: string,
  pathOnly: string,
  query: string,
  timestamp: string,
  dId = "",
): string {
  const headersForSign = { platform: "3", timestamp, dId, vName: "1.0.0" };
  const s = pathOnly + query + timestamp + JSON.stringify(headersForSign);
  const hmac = crypto.createHmac("sha256", token).update(s).digest("hex");
  return crypto.createHash("md5").update(hmac).digest("hex");
}

export async function signedGet<T>(path: string, query: Record<string, string | number> = {}): Promise<T> {
  const token = await getToken();
  const queryString = new URLSearchParams(
    Object.entries(query).map(([k, v]) => [k, String(v)]),
  ).toString();
  const fullPath = queryString ? `${path}?${queryString}` : path;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const sign = buildSign(token, path, queryString, timestamp);

  const res = await rawRequest<T>(fullPath, {
    timestamp,
    sign,
    platform: "3",
    vName: "1.0.0",
    dId: "",
  });
  if (res.code !== 0) {
    throw new Error(`skland API ${path} error: code=${res.code} msg=${res.message}`);
  }
  return res.data;
}

// ==================== API types ====================

export interface CatalogItem {
  itemId: string;
  name: string;
  brief?: { cover?: string; name?: string };
  tagIds?: string[];
}

export interface CatalogTypeSub {
  id: string;
  name: string;
  fatherTypeId: string;
  items: CatalogItem[];
}

export interface CatalogMain {
  id: string;
  name: string;
  typeSub: CatalogTypeSub[];
}

interface BlockText {
  inlineElements?: { text?: { text: string }; bold?: boolean; color?: string }[];
}

export interface AnyBlock {
  id: string;
  kind: "text" | "list" | "table" | string;
  parentId?: string;
  text?: BlockText;
  list?: {
    itemIds: string[];
    itemMap: Record<string, { childIds: string[] }>;
  };
  table?: {
    rowIds: string[];
    columnIds: string[];
    cellMap: Record<string, { childIds: string[]; rowSpan?: string; colSpan?: string }>;
  };
}

export interface DocumentBlock {
  id: string;
  blockIds: string[];
  blockMap: Record<string, AnyBlock>;
}

export interface ChapterWidget {
  id: string;
  title: string;
  size?: number;
}

export interface Chapter {
  title: string;
  widgets: ChapterWidget[];
}

export interface WidgetTab {
  tabId: string;
  title: string;
  icon?: string;
}

export interface WidgetCommon {
  type: string;
  tableList: unknown[];
  tabList: WidgetTab[];
  tabDataMap: Record<string, { content: string; intro: unknown; audioList: unknown[] }>;
}

export interface ItemDocument {
  documentMap: Record<string, DocumentBlock>;
  chapterGroup: Chapter[];
  widgetCommonMap: Record<string, WidgetCommon>;
}

export interface ItemFull {
  itemId: string;
  name: string;
  document: ItemDocument;
  brief?: { cover?: string };
  tagIds?: string[];
  subType?: { filterTagTree?: unknown[] };
}

export async function fetchCatalog(typeMainId: 1 = 1): Promise<CatalogMain[]> {
  const res = await signedGet<{ catalog: CatalogMain[] }>("/web/v1/wiki/item/catalog", {
    typeMainId,
  });
  return res.catalog;
}

export async function fetchItem(id: string | number): Promise<ItemFull> {
  const res = await signedGet<{ item: ItemFull }>("/web/v1/wiki/item/info", { id });
  return res.item;
}

// ==================== widget helpers ====================

export function findWidgetByTitle(item: ItemFull, chapterTitle: string, widgetTitle?: string): ChapterWidget | undefined {
  const chapter = item.document.chapterGroup.find((c) => c.title === chapterTitle);
  if (!chapter) return undefined;
  if (!widgetTitle) return chapter.widgets[0];
  return chapter.widgets.find((w) => w.title === widgetTitle);
}

/** 获取一个 widget 的 tab 列表（无 tab 时返回 [{ tabId: "default", title, content }]） */
export function getWidgetTabs(item: ItemFull, widgetId: string): {
  tabId: string;
  title: string;
  documentId: string;
}[] {
  const w = item.document.widgetCommonMap[widgetId];
  if (!w) return [];
  if (w.tabList && w.tabList.length > 0) {
    return w.tabList.map((tab) => ({
      tabId: tab.tabId,
      title: tab.title,
      documentId: w.tabDataMap[tab.tabId]?.content ?? "",
    }));
  }
  const def = w.tabDataMap.default;
  if (!def) return [];
  return [{ tabId: "default", title: "", documentId: def.content }];
}

export function getDocument(item: ItemFull, documentId: string): DocumentBlock | null {
  return item.document.documentMap[documentId] ?? null;
}
