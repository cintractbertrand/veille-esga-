#!/usr/bin/env python3
"""Extrait le texte des PDF de pv-pdf/ et les passages qui citent le club.

Usage : python3 outils/lire_pv.py            -> liste les PDF : n° de PV, pages, nombre de mentions
        python3 outils/lire_pv.py <numero>   -> affiche les passages du PV qui citent le club (avec n° de page)
"""
import re, subprocess, sys
from pathlib import Path

CLUB = re.compile(r"GENAS|AZIEU|ESGA|523341", re.I)
dossier = Path(__file__).resolve().parent.parent / "pv-pdf"


def texte(pdf):
    return subprocess.run(["pdftotext", "-layout", str(pdf), "-"], capture_output=True, text=True).stdout


def numero(t):
    m = re.search(r"P\.?\s*V\.?\s*N\s*°?\s*(\d\s?\d{2,3})", t[:5000], re.I)
    return int(m.group(1).replace(" ", "")) if m else None


pvs = []
for pdf in sorted(dossier.glob("*.pdf")):
    t = texte(pdf)
    pvs.append((numero(t), t.count("\f"), pdf, t))

if len(sys.argv) == 1:
    for n, pages, pdf, t in sorted(pvs, key=lambda x: x[0] or 0):
        print(f"PV {n}\t{pages} p.\t{len([l for l in t.splitlines() if CLUB.search(l)])} mentions\t{pdf.name}")
else:
    voulu = int(sys.argv[1])
    for n, pages, pdf, t in pvs:
        if n != voulu:
            continue
        print(f"=== PV {n} ({pdf.name}, {pages} pages) ===")
        pages_txt = t.split("\f")
        for p, contenu in enumerate(pages_txt, 1):
            lignes = contenu.splitlines()
            for i, l in enumerate(lignes):
                if CLUB.search(l):
                    print(f"--- page {p} ---")
                    print("\n".join(lignes[max(0, i - 8): i + 8]))
