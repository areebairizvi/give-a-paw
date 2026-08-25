"""Site-wide reference check: local assets, page links, and dead placeholders."""
import re
import pathlib
from collections import defaultdict

ROOT = pathlib.Path(__file__).resolve().parent.parent

ATTR = re.compile(r'(?:src|href|data-model|environment-image|poster)\s*=\s*"([^"]+)"')
JS_ASSET = re.compile(r"'([\w./-]+\.(?:glb|png|jpg|jpeg|mp4|svg))'")

missing = defaultdict(set)
placeholders = defaultdict(int)
existing = {p.name for p in ROOT.iterdir() if p.is_file()}

targets = sorted(ROOT.glob("*.html")) + [ROOT / "script.js", ROOT / "human-quiz.js"]

for path in targets:
    if not path.exists():
        continue
    text = path.read_text(encoding="utf-8", errors="replace")
    refs = set(ATTR.findall(text))
    if path.suffix == ".js":
        refs |= set(JS_ASSET.findall(text))
    for ref in refs:
        if ref == "#":
            placeholders[path.name] += 1
            continue
        if ref.startswith(("http", "//", "mailto:", "#", "data:", "javascript:")):
            continue
        clean = ref.split("?")[0].split("#")[0]
        if not clean:
            continue
        if clean not in existing:
            missing[path.name].add(clean)

print("=== MISSING LOCAL REFERENCES ===")
if not missing:
    print("  none")
for page in sorted(missing):
    for ref in sorted(missing[page]):
        print("  %-28s -> %s" % (page, ref))

print()
print('=== DEAD PLACEHOLDER LINKS (href="#") ===')
if not placeholders:
    print("  none")
for page in sorted(placeholders):
    print("  %-28s %d" % (page, placeholders[page]))

print()
print("=== PLACEHOLDER IMAGES IN USE ===")
for path in sorted(ROOT.glob("*.html")):
    text = path.read_text(encoding="utf-8", errors="replace")
    n = text.count("person-placeholder.jpg")
    if n:
        print("  %-28s %d headshots still placeholder" % (path.name, n))
