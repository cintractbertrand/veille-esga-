#!/usr/bin/env python3
"""Analyse un PDF de PV District avec pdftotext + API Claude, met à jour data/pv.json.

Usage :
  python3 outils/analyser_pv.py <chemin_pdf> <url_pdf>

Nécessite la variable d'environnement ANTHROPIC_API_KEY.
pdftotext doit être installé (paquet poppler-utils).
"""
import json, os, re, subprocess, sys
from pathlib import Path

try:
    import anthropic
except ImportError:
    sys.exit("anthropic manquant : pip install anthropic")

RACINE = Path(__file__).resolve().parent.parent
DATA_PV = RACINE / "data" / "pv.json"

CLUB = re.compile(r"GENAS|AZIEU|ESGA|523341", re.I)
CHAMPS_REQUIS = ["numero", "date", "url", "pages", "resume", "items"]

PROMPT_SYSTEME = """Tu es un assistant spécialisé dans la lecture des PV du District de Football de Lyon et du Rhône.
Tu dois extraire toutes les informations concernant le club ES Genas Azieu (ESGA), numéro de club 523341.
Réponds UNIQUEMENT avec un objet JSON valide, sans explication ni texte autour.
"""

PROMPT_UTILISATEUR = """Voici le texte complet du PV (extrait par pdftotext) :

---
{texte}
---

Génère un objet JSON avec exactement ces champs :
- "numero" : numéro entier du PV (ex : 767)
- "date" : date ISO du PV (ex : "2026-11-26")
- "url" : l'URL du PDF fournie
- "pages" : nombre de pages
- "resume" : 2 ou 3 phrases simples sur ce qui concerne ESGA, le plus important d'abord
- "items" : tableau de fiches, une par décision qui concerne le club (voir schéma)

Schéma d'une fiche :
{{
  "id": "<numero_pv>-<n>",
  "categorie": "Club" | "Seniors" | "Seniors F" | "U19" | "U17" | "U15" | "U15F" | "U13" | "U11" | "U9" | "U7" | "Futsal" | "Vétérans",
  "commission": "Discipline" | "Règlements" | "Appel" | "Trésorerie" | "Compétitions" | "Coupes" | "Arbitrage" | "PSEM" | "Secrétariat",
  "type": "discipline" | "sanction" | "reglement" | "tresorerie" | "match" | "homologation" | "observation" | "inscription" | "info",
  "gravite": "urgent" | "attention" | "info",
  "titre": "phrase courte",
  "detail": "texte complet avec noms, licences, montants, durées",
  "match": {{"numero": "...", "date": "AAAA-MM-JJ", "competition": "...", "domicile": "...", "exterieur": "..."}},
  "echeances": [{{"date": "AAAA-MM-JJ", "heure": "HH:MM", "libelle": "..."}}],
  "page": <numéro de page>
}}
(match et echeances sont optionnels)

Règles :
- Inclure les plateaux U7-U13 accueillis par Genas, les inscriptions aux coupes, les amendes, suspensions, convocations, matchs à rejouer, homologations, etc.
- gravite "urgent" : action requise sous 7 jours ou sanction lourde
- gravite "attention" : amende, suspension, délai
- URL du PDF : {url}
"""


def lire_pdf(chemin: Path) -> tuple[str, int]:
    """Extrait le texte complet et compte les pages."""
    res = subprocess.run(
        ["pdftotext", "-layout", str(chemin), "-"],
        capture_output=True, text=True, check=True
    )
    texte = res.stdout
    pages = texte.count("\f") + 1
    return texte, pages


def appeler_claude(texte: str, url: str, pages: int) -> dict:
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    # Tronquer à ~180 000 caractères pour rester dans les limites de tokens
    texte_tronque = texte[:180_000]
    message = client.messages.create(
        model="claude-haiku-5-5",
        max_tokens=8192,
        system=PROMPT_SYSTEME,
        messages=[{
            "role": "user",
            "content": PROMPT_UTILISATEUR.format(texte=texte_tronque, url=url)
        }]
    )
    contenu = message.content[0].text.strip()
    # Nettoyer les balises markdown si présentes
    contenu = re.sub(r"^```json\s*", "", contenu)
    contenu = re.sub(r"\s*```$", "", contenu)
    entree = json.loads(contenu)
    # S'assurer que les champs de base sont présents
    if "url" not in entree or not entree["url"]:
        entree["url"] = url
    if "pages" not in entree or not entree["pages"]:
        entree["pages"] = pages
    return entree


def mettre_a_jour_pv_json(entree: dict):
    """Insère l'entrée en tête de pvs (ou remplace si même numéro)."""
    if DATA_PV.exists():
        d = json.loads(DATA_PV.read_text(encoding="utf-8"))
    else:
        d = {"pvs": [], "mis_a_jour": ""}
    # Supprimer l'entrée existante si même numéro
    d["pvs"] = [p for p in d["pvs"] if p.get("numero") != entree["numero"]]
    d["pvs"].insert(0, entree)
    from datetime import datetime, timezone
    d["mis_a_jour"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    DATA_PV.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ data/pv.json mis à jour (PV n°{entree['numero']}, {len(entree['items'])} fiches)")


def main():
    if len(sys.argv) < 3:
        sys.exit("Usage : python3 outils/analyser_pv.py <chemin_pdf> <url_pdf>")
    chemin = Path(sys.argv[1])
    url = sys.argv[2]
    if not chemin.exists():
        sys.exit(f"Fichier introuvable : {chemin}")
    if "ANTHROPIC_API_KEY" not in os.environ:
        sys.exit("Variable ANTHROPIC_API_KEY manquante")

    print(f"Lecture de {chemin.name} ({chemin.stat().st_size // 1024} Ko)…")
    texte, pages = lire_pdf(chemin)
    print(f"  → {pages} pages, {len(texte)} caractères")

    print("Appel à l'API Claude (analyse du PV)…")
    entree = appeler_claude(texte, url, pages)
    numero = entree.get("numero", "?")
    print(f"  → PV n°{numero}, {len(entree.get('items', []))} fiches extraites")

    mettre_a_jour_pv_json(entree)


if __name__ == "__main__":
    main()
