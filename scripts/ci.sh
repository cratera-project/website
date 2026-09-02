#!/usr/bin/env bash
# Cratera Website CI Verification: JavaScript, JSON, XML, Asset Links, and JSON-LD syntax.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> [1/5] Checking JavaScript syntax (node --check)..."
node --check app.js
echo "    ✓ app.js syntax valid"

echo "==> [2/5] Validating JSON Web Manifest (site.webmanifest)..."
python3 -c '
import json
with open("site.webmanifest", "r", encoding="utf-8") as f:
    data = json.load(f)
assert data.get("name"), "Missing manifest name"
icons = data.get("icons", [])
assert len(icons) > 0, "Missing manifest icons"
count = len(icons)
print(f"    ✓ site.webmanifest is valid JSON ({count} icons configured)")
'

echo "==> [3/5] Validating XML Sitemap (sitemap.xml)..."
python3 -c '
import xml.etree.ElementTree as ET
tree = ET.parse("sitemap.xml")
root = tree.getroot()
urls = root.findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url")
assert len(urls) > 0, "Sitemap contains no URLs"
count = len(urls)
print(f"    ✓ sitemap.xml is valid XML ({count} URLs indexed)")
'

echo "==> [4/5] Validating embedded JSON-LD schema in index.html..."
python3 -c '
import json, re
with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

scripts = re.findall(r"<script type=\"application/ld\+json\">(.*?)</script>", content, re.DOTALL)
assert len(scripts) > 0, "No JSON-LD script found in index.html"
for i, s in enumerate(scripts):
    parsed = json.loads(s.strip())
    ctx = parsed.get("@context", "unknown")
    print(f"    ✓ JSON-LD block {i+1} valid (schema: {ctx})")
'

echo "==> [5/5] Verifying local assets and media links exist on disk..."
python3 -c '
import os, re
with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

asset_patterns = [
    r"<link[^>]+href=[\x22\x27]([^\x22\x27#:]+)[\x22\x27]",
    r"<script[^>]+src=[\x22\x27]([^\x22\x27#:]+)[\x22\x27]",
    r"<img[^>]+src=[\x22\x27]([^\x22\x27#:]+)[\x22\x27]",
]
missing = []
checked = 0
for pat in asset_patterns:
    for path in re.findall(pat, html):
        if path.startswith("http") or path.startswith("data:") or path.startswith("//") or path.startswith("mailto:"):
            continue
        clean_path = path.lstrip("/").split("?", 1)[0]
        if not os.path.exists(clean_path):
            missing.append(clean_path)
        checked += 1

if missing:
    raise SystemExit(f"Missing referenced assets: {missing}")
print(f"    ✓ All {checked} local asset references verified on disk")
'

echo "==> All website CI checks passed successfully!"
