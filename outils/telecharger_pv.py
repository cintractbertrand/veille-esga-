#!/usr/bin/env python3
"""Télécharge le dernier PV du District depuis lyon-rhone.fff.fr.

Usage :
  python3 outils/telecharger_pv.py           → télécharge si nouveau, affiche le chemin
  python3 outils/telecharger_pv.py --check   → affiche seulement l'URL du dernier PV, sans télécharger

Retourne sur stdout une ligne JSON :
  {"action": "nouveau"|"deja_present"|"erreur", "url": "...", "hash": "...", "chemin": "..."}
"""
import hashlib, json, re, sys
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit('requests manquant : pip install requests')

RACINE = Path(__file__).resolve().parent.parent
DOSSIER = RACINE / "pv-pdf"
PAGE_PV = "https://lyon-rhone.fff.fr/documents?cid=39"

HEADERS = {
    "User-Agent": "python-requests/2.31.0",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def derniere_url():
    """Trouve l'URL du dernier PV intégral sur la page du District."""
    r = requests.get(PAGE_PV, headers=HEADERS, timeout=30, allow_redirects=True)
    r.raise_for_status()
    # Les PDF sont servis via bsk-pdf-manager
    urls = re.findall(
        r'https://lyon-rhone\.fff\.fr/wp-content/uploads/[^\s"\'<>]+bsk-pdf-manager[^\s"\'<>]+\.pdf',
        r.text,
    )
    if not urls:
        raise ValueError("Aucune URL de PV trouvée sur la page du District")
    return urls[0]


def telecharger(url: str) -> dict:
    r = requests.get(url, headers=HEADERS, timeout=120, stream=True)
    r.raise_for_status()
    contenu = r.content
    h = hashlib.md5(contenu).hexdigest()
    chemin = DOSSIER / f"{h}.pdf"
    if chemin.exists():
        return {"action": "deja_present", "url": url, "hash": h, "chemin": str(chemin)}
    DOSSIER.mkdir(exist_ok=True)
    chemin.write_bytes(contenu)
    return {"action": "nouveau", "url": url, "hash": h, "chemin": str(chemin)}


def main():
    check_only = "--check" in sys.argv
    try:
        url = derniere_url()
        if check_only:
            print(json.dumps({"action": "check", "url": url}))
            return
        res = telecharger(url)
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"action": "erreur", "message": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
