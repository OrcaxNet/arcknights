import { fetchCatalog, fetchItem, findWidgetByTitle, getWidgetTabs } from "./lib/skland-api";

async function main() {
  const target = process.argv[2] ?? "遗忘";
  const cat = await fetchCatalog(1);
  const main = cat[0];
  const weapons = main.typeSub.find((t) => t.id === "2")?.items ?? [];
  const item = weapons.find((w) => w.name.trim() === target);
  if (!item) {
    console.log("not found in weapons. try by id:", target);
    return;
  }
  console.log("itemId:", item.itemId, "name:", item.name);
  console.log("brief.subTypeList:", JSON.stringify((item.brief as any)?.subTypeList));

  const detail = await fetchItem(item.itemId);
  console.log("\nchapters:", detail.document.chapterGroup.map((c) => c.title));
  for (const ch of detail.document.chapterGroup) {
    console.log(`  [${ch.title}]`);
    for (const w of ch.widgets) {
      console.log(`    widget id=${w.id} title="${w.title}"`);
      const tabs = getWidgetTabs(detail, w.id);
      for (const t of tabs) {
        console.log(`      tab="${t.title}" doc=${t.documentId}`);
      }
    }
  }
}

main().catch(console.error);
