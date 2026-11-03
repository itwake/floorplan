"""Read the six comparison workbooks without modifying them; generate the budget catalog."""
import argparse
import datetime as dt
import hashlib
import json
import pathlib
import posixpath
import re
import xml.etree.ElementTree as ET
import zipfile

NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
RID = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"


def read_book(file):
    with zipfile.ZipFile(file) as z:
        if z.testzip():
            raise ValueError(f"Damaged workbook: {file.name}")
        strings = []
        if "xl/sharedStrings.xml" in z.namelist():
            strings = ["".join(t.text or "" for t in si.findall(".//s:t", NS))
                       for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("s:si", NS)]
        rels = {r.attrib["Id"]: r.attrib["Target"]
                for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
        sheets = {}
        for sh in ET.fromstring(z.read("xl/workbook.xml")).findall("s:sheets/s:sheet", NS):
            target = rels[sh.attrib[RID]]
            target = target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join("xl", target))
            rows = {}
            for c in ET.fromstring(z.read(target)).findall(".//s:sheetData/s:row/s:c", NS):
                addr = c.attrib["r"]
                value = c.findtext("s:v", default="", namespaces=NS)
                if c.attrib.get("t") == "s":
                    value = strings[int(value)] if value else ""
                elif c.attrib.get("t") == "inlineStr":
                    value = "".join(t.text or "" for t in c.findall(".//s:t", NS))
                rows.setdefault(int(re.search(r"\d+", addr).group()), {})[re.sub(r"\d", "", addr)] = {
                    "value": value, "formula": c.findtext("s:f", default="", namespaces=NS)}
            sheets[sh.attrib["name"]] = rows
        return sheets


def number(value):
    return round(float(value), 2) if re.fullmatch(r"\d+(?:\.\d+)?", value or "") else None


def date(value):
    if re.fullmatch(r"\d{5}(?:\.0+)?", value or ""):
        return (dt.datetime(1899, 12, 30) + dt.timedelta(days=float(value))).strftime("%Y-%m-%d")
    return value.replace("T00:00:00.000Z", "")


def url(cell):
    found = re.search(r'HYPERLINK\("(https?://[^" ]+)"', cell.get("formula", ""), re.I)
    candidate = found.group(1) if found else cell.get("value", "")
    return candidate if re.match(r"^https?://", candidate) else ""


def main():
    args = argparse.ArgumentParser()
    args.add_argument("source", type=pathlib.Path)
    args.add_argument("--output", type=pathlib.Path, default=pathlib.Path(__file__).resolve().parents[1] / "data/purchase-catalog.js")
    opt = args.parse_args()
    configs = [
        ("广州厨房凉霸选购对比_2026-11-02.xlsx", "凉霸推荐与价格", "cooler", 7, 12, "B", "C", "E", "G", None, "H", "L"),
        ("广州空调选购对比_20261031.xlsx", "推荐与价格", "ac", 8, 17, "B", "C", "I", "K", "J", "L", "P"),
        ("广州烟机燃气灶选购对比_2026-10-31.xlsx", "油烟机对比", "hood", 7, 17, "C", "D", "F", "H", "G", "J", "AB"),
        ("广州烟机燃气灶选购对比_2026-10-31.xlsx", "燃气灶对比", "stove", 7, 13, "C", "D", "F", "H", "G", "J", "AD"),
        ("广州一厨两卫_燃气热水器对比_2026-10-31.xlsx", "推荐与价格", "heater", 8, 18, None, "C", "H", "J", "I", "K", "R"),
        ("广州蒸烤箱选购对比_20261031.xlsx", "京东报价", "oven", 9, 26, "B", "C", "F", "J", "H", "D", "K"),
        ("扫地机器人选购对比_广州_20261031.xlsx", "京东报价", "robot", 7, 37, "B", "C", "H", "K", "J", "F", "O"),
    ]
    books = {}; products = []; sources = []
    for filename, sheet, category, start, end, brand, model, price, note, day, link, evidence in configs:
        file = opt.source / filename
        if filename not in books:
            books[filename] = read_book(file)
            sources.append({"file": filename, "sha256": hashlib.sha256(file.read_bytes()).hexdigest()})
        for r in range(start, end + 1):
            row = books[filename][sheet][r]
            get = lambda col: row.get(col, {}).get("value", "") if col else ""
            title = " ".join(filter(None, [get(brand), get(model)])).replace("\n", " · ")
            if not title:
                raise ValueError(f"Missing model: {filename} {sheet}!{r}")
            if category == "robot":
                title += " · " + get("D")
            products.append({
                "id": f"{category}-{r}", "category": category, "name": title,
                "price": number(get(price)), "priceKind": "历史/公开条件参考",
                "date": date(get(day)), "note": get(note),
                "url": url(row.get(link, {})), "evidenceUrl": url(row.get(evidence, {})),
                "sourceFile": filename, "sourceSheet": sheet, "sourceCell": f"{price}{r}",
            })
    categories = [
        {"id": "furniture", "name": "家具 / 自定义"}, {"id": "ac", "name": "空调"},
        {"id": "hood", "name": "油烟机"}, {"id": "stove", "name": "燃气灶"},
        {"id": "heater", "name": "燃气热水器"}, {"id": "oven", "name": "蒸烤箱"},
        {"id": "cooler", "name": "厨房凉霸"}, {"id": "robot", "name": "扫地机器人"},
    ]
    catalog = {"version": 1, "asOf": "2026-11-02", "categories": categories, "sources": sources, "products": products}
    opt.output.parent.mkdir(parents=True, exist_ok=True)
    opt.output.write_text("// Generated from the original comparison workbooks. Do not treat these as current quotes.\nwindow.PURCHASE_CATALOG = " + json.dumps(catalog, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
    print(json.dumps({"products": len(products), "withPrice": sum(p["price"] is not None for p in products), "categories": {c["name"]: sum(p["category"] == c["id"] for p in products) for c in categories}}, ensure_ascii=False))


if __name__ == "__main__":
    main()
