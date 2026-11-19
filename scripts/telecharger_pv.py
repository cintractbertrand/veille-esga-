#!/usr/bin/env python3
"""Télécharge les PV intégraux du District de Lyon et du Rhône et en extrait le texte.

Pour chaque PDF listé sur la page « Procès-Verbaux » du District et pas encore connu :
- extrait le texte complet (pdftotext -layout) dans pv-texte/pv-<numero>.txt
- extrait les passages qui concernent le club dans pv-texte/extraits/pv-<numero>.txt
- met à jour pv-texte/index.json
"""
import json, re, subprocess, sys, tempfile, urllib.request
from pathlib import Path

LISTES = [
    "https://lyon-rhone.fff.fr/documents/?cid=39&sid=13&scid=510&sscid=-1&pid=0",
    "https://lyon-rhone.fff.fr/documents/?cid=39&sid=13&scid=510&sscid=-1&pid=1",
    "https://lyon-rhone.fff.fr/documents?cid=39",
]
MOTIF_CLUB = re.compile(r"GENAS|AZIEU|ESGA|523341", re.I)
DEPUIS = 753  # premier PV suivi (20 août 2026)
UA = {"User-Agent": "Mozilla/5.0 (veille-pv)"}

racine = Path(__file__).resolve().parent.parent
sortie = racine / "pv-texte"
(sortie / "extraits").mkdir(parents=True, exist_ok=True)
index_path = sortie / "index.json"
index = json.loads(index_path.read_text()) if index_path.exists() else {"pv": {}, "urls_vues": []}


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


liens = []
for page in LISTES:
    try:
        html = get(page).decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001
        print(f"liste inaccessible {page}: {e}", file=sys.stderr)
        continue
    for m in re.finditer(r'https?://lyon-rhone\.fff\.fr/wp-content/uploads/sites/105/bsk-pdf-manager/[0-9a-f]+\.pdf', html):
        if m.group(0) not in liens:
            liens.append(m.group(0))
liens += [u for u in sys.argv[1:] if u not in liens]
print(f"{len(liens)} PDF trouvés")

nouveaux = 0
for url in liens:
    if url in index["urls_vues"]:
        continue
    try:
        pdf = get(url)
    except Exception as e:  # noqa: BLE001
        print(f"échec {url}: {e}", file=sys.stderr)
        continue
    with tempfile.NamedTemporaryFile(suffix=".pdf") as f:
        f.write(pdf); f.flush()
        texte = subprocess.run(["pdftotext", "-layout", f.name, "-"], capture_output=True, text=True).stdout
    index["urls_vues"].append(url)
    tete = texte[:4000]
    m = re.search(r"P\.?\s*V\.?\s*N\s*°?\s*(\d{3,4})", tete, re.I)
    pages = texte.count("\f") or 1
    if not m or pages < 10:
        print(f"ignoré (pas un PV intégral) : {url}")
        continue
    num = int(m.group(1))
    if num < DEPUIS:
        continue
    cle = str(num)
    if cle in index["pv"] and index["pv"][cle]["url"] != url:
        cle = f"{num}b"  # second fichier pour un même numéro
    (sortie / f"pv-{cle}.txt").write_text(texte)
    # extraits : chaque ligne qui cite le club, avec 6 lignes de contexte et le n° de page
    lignes, ext, page = texte.split("\n"), [], 1
    num_page = []
    for l in lignes:
        num_page.append(page)
        page += l.count("\f")
    for i, l in enumerate(lignes):
        if MOTIF_CLUB.search(l):
            a, b = max(0, i - 6), min(len(lignes), i + 7)
            ext.append(f"--- page {num_page[i]} (ligne {i+1}) ---\n" + "\n".join(lignes[a:b]))
    (sortie / "extraits" / f"pv-{cle}.txt").write_text("\n\n".join(ext) or "(aucune mention du club)")
    index["pv"][cle] = {"numero": num, "url": url, "pages": pages, "mentions": len(ext)}
    nouveaux += 1
    print(f"PV {cle}: {pages} pages, {len(ext)} mentions")

index_path.write_text(json.dumps(index, ensure_ascii=False, indent=1))
print(f"{nouveaux} nouveaux PV")
