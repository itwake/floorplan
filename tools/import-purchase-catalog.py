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


def enrich(product, sheets, r, price_row):
    category = product['category']
    config = {
        'ac': ('参数对比', 7, list('DEFGHIJKLMNQRTX') + ['AA'], 'Y'),
        'cooler': ('参数与安装', 6, list('DEFGHIJKLM'), 'N'),
        'heater': ('参数对比', 7, list('CDEFGHIJKLMN'), 'O'),
        'oven': ('参数明细', 8, list('DEFIJKLMNOPQRV'), 'U'),
        'robot': ('型号对比', 6, list('LMNOPQRSTUVX'), 'Y'),
        'hood': ('油烟机对比', 6, list('MNOPQRSTUVWX'), 'AA'),
        'stove': ('燃气灶对比', 6, list('MNOPQRSTUVWXYZA'), 'AC'),
    }[category]
    sheet, head, columns, source_col = config
    sr = r
    if category == 'robot':
        priority = price_row.get('A', {}).get('value')
        matches = [n for n, row in sheets[sheet].items() if n > head and row.get('A', {}).get('value') == priority]
        if not matches:
            raise ValueError(f'Robot parameters missing: {product["id"]}')
        sr = matches[0]
    row = sheets[sheet][sr]
    get = lambda c: row.get(c, {}).get('value', '')
    columns = list(dict.fromkeys(columns))
    product['specs'] = [{'label': sheets[sheet][head].get(c, {}).get('value', c).replace('\n', ' '),
                         'value': get(c).replace('\n', ' '), 'cell': f'{c}{sr}'}
                        for c in columns if get(c) and c != 'A']
    if category == 'stove':
        for spec in product['specs']:
            if spec['cell'] == f'O{sr}' and number(get('O')) is not None:
                spec['value'] = f"{float(get('O')) * 100:g}%"
    product['specSheet'] = sheet
    product['specUrl'] = url(row.get(source_col, {}))
    product['dimensions'] = None
    def triple(text):
        m = re.match(r'^\s*(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)', text)
        return [float(n) for n in m.groups()] if m else None
    if category == 'ac':
        product['acForm'] = 'floor' if '立式' in get('D') else 'wall' if '壁挂' in get('D') else None
        match = re.search(r'(\d+(?:\.\d+)?)\s*[–—~～-]\s*(\d+(?:\.\d+)?)', get('F'))
        product['areaRange'] = [float(v) for v in match.groups()] if match else None
        dims = triple(get('Q'))
        if dims: product['dimensions'] = dict(zip(['width', 'height', 'depth'], dims))
    elif category in ['hood', 'stove']:
        cols = ['T', 'U', 'V'] if category == 'hood' else ['U', 'V', 'W']
        values = [number(get(c)) for c in cols]
        if all(v is not None for v in values): product['dimensions'] = dict(zip(['width', 'depth', 'height'], values))
    elif category == 'heater':
        dims = triple(get('I'))
        if dims: product['dimensions'] = dict(zip(['height', 'width', 'depth'], dims))
    elif category == 'oven' and '宽×深×高' in get('P'):
        dims = triple(get('P'))
        if dims: product['dimensions'] = dict(zip(['width', 'depth', 'height'], dims))


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
            product = {
                "id": f"{category}-{r}", "category": category, "name": title,
                "price": number(get(price)), "priceKind": "历史/公开条件参考",
                "date": date(get(day)), "note": get(note),
                "url": url(row.get(link, {})), "evidenceUrl": url(row.get(evidence, {})),
                "sourceFile": filename, "sourceSheet": sheet, "sourceCell": f"{price}{r}",
            }
            enrich(product, books[filename], r, row)
            products.append(product)
    categories = [
        {"id": "furniture", "name": "家具 / 其他设备"}, {"id": "ac", "name": "空调"},
        {"id": "hood", "name": "油烟机"}, {"id": "stove", "name": "燃气灶"},
        {"id": "heater", "name": "燃气热水器"}, {"id": "oven", "name": "蒸烤箱"},
        {"id": "cooler", "name": "厨房凉霸"}, {"id": "robot", "name": "扫地机器人"},
    ]
    catalog = {"version": 1, "asOf": "2026-11-02", "categories": categories, "sources": sources, "products": products}
    photos = pathlib.Path(__file__).resolve().parents[1] / 'data/purchase-photos.json'
    if photos.exists():
        supplements = json.loads(photos.read_text(encoding='utf-8'))
        for product in products: product.update(supplements.get(product['id'], {}))
    opt.output.parent.mkdir(parents=True, exist_ok=True)
    opt.output.write_text("// Generated from the original comparison workbooks. Do not treat these as current quotes.\nwindow.PURCHASE_CATALOG = " + json.dumps(catalog, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
    print(json.dumps({"products": len(products), "withPrice": sum(p["price"] is not None for p in products), "categories": {c["name"]: sum(p["category"] == c["id"] for p in products) for c in categories}}, ensure_ascii=False))


if __name__ == "__main__":
    main()
