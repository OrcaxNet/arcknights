import type { AnyBlock, DocumentBlock } from "./skland-api";

/**
 * 把一个 document block 渲染成纯文本。
 * 表格行用 \t 连接 cell，行间用 \n。
 */
export function renderDocument(doc: DocumentBlock): string {
  return doc.blockIds.map((id) => renderBlock(doc.blockMap, id)).join("\n");
}

function renderBlock(map: Record<string, AnyBlock>, id: string): string {
  const block = map[id];
  if (!block) return "";
  switch (block.kind) {
    case "text":
      return renderInline(block.text);
    case "list":
      if (!block.list) return "";
      return block.list.itemIds
        .map((itemId) => {
          const item = block.list!.itemMap[itemId];
          if (!item) return "";
          return item.childIds.map((cid) => renderBlock(map, cid)).join("\n");
        })
        .join("\n");
    case "table":
      if (!block.table) return "";
      return renderTable(map, block).map((row) => row.join("\t")).join("\n");
    default:
      return "";
  }
}

/** 把 table 渲染成二维 string[][]，便于后续提取列 */
export function renderTable(
  map: Record<string, AnyBlock>,
  block: AnyBlock,
): string[][] {
  if (!block.table) return [];
  const { rowIds, columnIds, cellMap } = block.table;
  const rows: string[][] = [];
  for (const r of rowIds) {
    const cells: string[] = [];
    for (const c of columnIds) {
      const cell = cellMap[`${r}_${c}`];
      if (!cell) {
        cells.push("");
        continue;
      }
      const text = cell.childIds.map((cid) => renderBlock(map, cid)).join("");
      cells.push(text);
    }
    rows.push(cells);
  }
  return rows;
}

/** 在 document 里找第一个 table block 并返回 string[][] */
export function findFirstTable(doc: DocumentBlock): string[][] {
  for (const id of doc.blockIds) {
    const b = doc.blockMap[id];
    if (b?.kind === "table") {
      return renderTable(doc.blockMap, b);
    }
  }
  return [];
}

function renderInline(text?: { inlineElements?: { text?: { text: string } }[] }): string {
  if (!text || !text.inlineElements) return "";
  return text.inlineElements.map((e) => e.text?.text ?? "").join("");
}
