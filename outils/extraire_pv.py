#!/usr/bin/env python3
"""Extrait automatiquement des PDF de pv-pdf/ les données structurées du club :

- data/matchs.json   : les matchs du club repérés dans les annexes « Désignations par poule »
- data/dossiers.json : les dossiers du club dans « Dossiers par club » (amendes, sanctions…)
- data/extraits.json : pour chaque PV, tous les passages qui citent le club, dans l'ordre des pages

Usage : python3 outils/extraire_pv.py
Le script fusionne avec les fichiers existants (un match = son numéro, un dossier = son numéro).
"""
import json, re, subprocess
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
CLUB_NUM = "523341"
CLUB = re.compile(r"\bgenas\b", re.I)
JOURS = "Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche"


def texte(pdf):
    return subprocess.run(["pdftotext", "-layout", str(pdf), "-"], capture_output=True, text=True).stdout


def numero_pv(t):
    m = re.search(r"P\.?\s*V\.?\s*N?\s*°?\s*(\d\s?\d\s?\d)\s+DU\s+JEUDI", t[:6000], re.I)
    return int(m.group(1).replace(" ", "")) if m else None


def categorie(comp):
    c = comp.lower()
    fem = any(k in c for k in ("fém", "fem", "féminines", "feminines")) or re.search(r"u\d\dF\b", comp)
    m = re.search(r"u\s?(\d{2})", c)
    if "gambardella" in c:
        return "U18"
    if "vet" in c or "vét" in c:
        return "Vétérans"
    if "futsal" in c:
        return "Futsal"
    if "loisir" in c:
        return "Foot loisir"
    if m:
        return f"U{m.group(1)}" + ("F" if fem else "")
    if "senior" in c or "regional" in c or "régional" in c or re.search(r"\bd\d\b", c):
        return "Seniors F" if fem else "Seniors"
    return comp.split("/")[0].strip()


def iso(d):
    j, m, a = d.split("/")
    return f"{a}-{m}-{j}"


def separer(txt):
    """Coupe « Domicile - Extérieur » au tiret qui sépare Genas de son adversaire."""
    g = CLUB.search(txt)
    cands = [m for m in re.finditer(r"\s?-\s+(?=\S)", txt)]
    cands = [c for c in cands if c.end() <= g.start() or c.start() >= g.end()]
    if not cands:
        return None
    c = min(cands, key=lambda c: min(abs(c.end() - g.start()), abs(c.start() - g.end())))
    return [txt[:c.start()], txt[c.end():]]


def matchs(t, pv):
    res, comp, poule, date, heure = [], None, None, None, None
    for l in t.splitlines():
        h = re.match(r"^(\S.*?)\s*/\s*(Phase [^\s].*?|Unique|Régionale|Departementale|Départementale)\s{2,}(.*?)\s{2,}\d+\s*$", l)
        if h:
            comp, poule = h.group(1).strip(), h.group(3).strip() or None
            continue
        d = re.match(rf"^\s*({JOURS})\s+(\d\d/\d\d/\d{{4}})\s+(\d{{1,2}}H\d{{0,2}})", l)
        if d:
            date, heure = iso(d.group(2)), d.group(3).replace("H", ":").ljust(5, "0") if d.group(3).endswith("H") else d.group(3).replace("H", ":")
            continue
        m = re.match(r"^\s*(?:[A-Z]\s+)?(\d{8})\s+[\d.]+\s+(.+?)(?:\s{2,}(.+?))?\s*$", l)
        if m and comp and date and CLUB.search(m.group(2)) and "non affect" not in m.group(2).lower():
            equipes = separer(m.group(2).strip())
            if not equipes:
                continue
            dom, ext = (e.strip() for e in equipes)
            nous_brut = dom if CLUB.search(dom) else ext
            niveau = re.search(r"\(([^)]*)\)?\s*$", nous_brut) if nous_brut is ext else re.match(r"^\(([^)]*)\)", m.group(2).strip())
            tag = re.search(r"\(([A-Z0-9 ]+)\)?\s*$", nous_brut)
            nettoie = lambda x: re.sub(r"\s*\([^)]*\)?\s*$", "", re.sub(r"^\([^)]*\)\s*", "", x)).strip()
            dom, ext = nettoie(dom), nettoie(ext)
            nous = dom if CLUB.search(dom) else ext
            cat = categorie(comp)
            if comp.lower().startswith("coupe") and cat == comp.split("/")[0].strip():
                f = "fém" in comp.lower() or "fem" in comp.lower()
                cat = "Seniors F" if f else "Seniors"
            num_eq = re.search(r"Azieu\s+(\d+)", nous, re.I)
            res.append({
                "numero": m.group(1), "date": date, "heure": heure,
                "competition": comp, "poule": poule, "categorie": cat,
                "equipe": int(num_eq.group(1)) if num_eq else None,
                "niveau": niveau.group(1).strip() if niveau else None,
                "domicile": dom, "exterieur": ext, "a_domicile": bool(CLUB.search(dom)),
                "lieu": (m.group(3) or "").strip(), "pv": pv,
            })
    return res


def dossiers(t, pv):
    res, club, cur = [], None, None
    for l in t.splitlines():
        if l.startswith("Généré le") or "Dossiers par club" in l or not l.strip():
            continue
        c = re.match(r"^Club :\s+(\d+)\s+(.*)$", l)
        if c:
            club = c.group(1)
            continue
        if club != CLUB_NUM:
            continue
        d = re.match(r"^Dossier :\s+(\d+)\s+du (\d\d/\d\d/\d{4})\s*(.*)$", l)
        if d:
            reste = d.group(3)
            mm = re.search(r"(\d{8})\s+(\d\d/\d\d/\d{4})\s*$", reste)
            comp = re.split(r"\s{2,}", reste.strip())
            cur = {"dossier": d.group(1), "date": iso(d.group(2)),
                   "competition": comp[0].replace("/ Phase Unique", "").replace("/ Phase 1", "").strip() if comp and comp[0] else None,
                   "poule": comp[1] if len(comp) > 2 else None,
                   "match": mm.group(1) if mm else None, "match_date": iso(mm.group(2)) if mm else None, "pv": pv}
            cur["categorie"] = categorie(cur["competition"]) if cur["competition"] else "Club"
            res.append(cur)
            continue
        if not cur:
            continue
        p = re.match(r"^Personne :\s+(.*)$", l)
        if p:
            cur["personne"] = re.sub(r"\s{2,}", " · ", p.group(1).strip())
            continue
        mo = re.match(r"^Motif :\s+\d+\s+(.*?)(?:\s{2,}Date d'effet.*)?$", l)
        if mo:
            cur["motif"] = mo.group(1).strip()
            continue
        de = re.match(r"^Décision :\s+\d+\s+(.*?)\s{2,}(\d\d/\d\d/\d{4})?\s*(\d\d/\d\d/\d{4})?\s*(\d\d/\d\d/\d{4})?\s*([\d\s.,]+€)?\s*$", l)
        if de:
            cur["decision"] = de.group(1).strip()
            if de.group(2): cur["effet"] = iso(de.group(2))
            if de.group(3): cur["fin"] = iso(de.group(3))
            if de.group(5): cur["montant"] = float(de.group(5).replace("€", "").replace(" ", "").replace(",", "."))
    return res


ANNEXE = re.compile(r"D[ée]signations par poule|Dossiers par club|G[ée]n[ée]r[ée] le", re.I)
TITRE = re.compile(r"^\s*([A-ZÉÈÀÂÊÎÔÛÇ0-9][A-ZÉÈÀÂÊÎÔÛÇ0-9 '’./&()-]{5,})\s*$")


def extraits(t, pv):
    """Passages du PV qui citent le club, avec la page et le titre de section le plus proche."""
    res, section = [], None
    for num, page in enumerate(t.split("\f"), 1):
        L = page.splitlines()
        annexe = bool(ANNEXE.search(page[:600]))
        blocs, titres = [], {}
        for i, l in enumerate(L):
            ti = TITRE.match(l)
            if ti and not re.match(r"^\s*P\.?\s*V", l) and not CLUB.search(l) and not re.search(r"\d{5}", l) \
                    and re.search(r"COMMISSION|COUPE|FEUILLE|DEMANDE|TIRAGE|CHAMPIONNAT|PLATEAU|FESTI|RAPPORT|MODIFICATION|R[EÉ]SULTAT|D[EÉ]L[EÉ]GATION|R[EÈ]GLEMENT|DISCIPLINE|FUTSAL|F[EÉ]MININ|ARBITR|TR[EÉ]SOR|SECR[EÉ]TARIAT|INFORMATION|BUREAU|COMIT[EÉ]|GROUPEMENT", l):
                section = re.sub(r"\s{2,}", " ", ti.group(1)).strip()
            titres[i] = section
            if not (CLUB.search(l) or CLUB_NUM in l):
                continue
            if annexe:
                a, b = i, i
            else:
                a = i
                while a > 0 and i - a < 4 and L[a - 1].strip() and not TITRE.match(L[a - 1]):
                    a -= 1
                b = i
                while b + 1 < len(L) and b - i < 3 and L[b + 1].strip() and not TITRE.match(L[b + 1]):
                    b += 1
            if blocs and a <= blocs[-1][1] + 1:
                blocs[-1][1] = max(blocs[-1][1], b)
            else:
                blocs.append([a, b])
        for a, b in blocs:
            txt = "\n".join(re.sub(r"\s{3,}", "   ", x.strip()) for x in L[a:b + 1] if x.strip())
            if txt:
                res.append({"pv": pv, "page": num, "section": "Annexes" if annexe else titres.get(a), "texte": txt})
    return res


def main():
    mpath, dpath = RACINE / "data/matchs.json", RACINE / "data/dossiers.json"
    tous_m = {m["numero"]: m for m in (json.loads(mpath.read_text()) if mpath.exists() else [])}
    epath = RACINE / "data/extraits.json"
    tous_e = {}
    tous_d = {d["dossier"]: d for d in (json.loads(dpath.read_text()) if dpath.exists() else [])}
    for pdf in sorted((RACINE / "pv-pdf").glob("*.pdf")):
        t = texte(pdf)
        pv = numero_pv(t)
        if not pv:
            continue
        for m in matchs(t, pv):
            if m["numero"] not in tous_m or tous_m[m["numero"]]["pv"] <= pv:
                tous_m[m["numero"]] = m
        tous_e[pv] = extraits(t, pv)
        for d in dossiers(t, pv):
            tous_d[d["dossier"]] = d
    # équipe sans numéro (coupes) : retrouvée grâce au niveau indiqué, ex. « (SE D3) » -> équipe Seniors qui joue en D3
    def div(txt):
        txt = (txt or "").upper().replace("REGIONAL ", "R").replace("REG", "R")
        mm = re.search(r"\b(D\d|R\d)\b", txt)
        return mm.group(1) if mm else None
    niveaux = {}
    for x in tous_m.values():
        if x["equipe"] and not x["competition"].lower().startswith("coupe"):
            niveaux.setdefault((x["categorie"], div(x["competition"])), x["equipe"])
    for x in tous_m.values():
        if x["equipe"] is None:
            x["equipe"] = niveaux.get((x["categorie"], div(x.get("niveau")))) or 1
        x.pop("niveau", None)
    m = sorted(tous_m.values(), key=lambda x: (x["date"], x["heure"] or ""))
    d = sorted(tous_d.values(), key=lambda x: x["date"])
    mpath.write_text(json.dumps(m, ensure_ascii=False, indent=1))
    dpath.write_text(json.dumps(d, ensure_ascii=False, indent=1))
    epath.write_text(json.dumps([{"pv": k, "extraits": v} for k, v in sorted(tous_e.items(), reverse=True)], ensure_ascii=False, indent=1))
    print(f"{len(m)} matchs, {len(d)} dossiers, {sum(len(v) for v in tous_e.values())} extraits")


if __name__ == "__main__":
    main()
