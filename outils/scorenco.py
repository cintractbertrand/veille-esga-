"""Calendrier, résultats et classements des équipes ESGA (et de leurs poules) depuis l'API publique Scorenco.

Écrit data/calendrier-scorenco.json. Lancé chaque semaine par .github/workflows/maj-calendrier.yml.
Le classement est recalculé à partir des résultats de la poule (3 pts victoire, 1 nul), Scorenco ne le publiant pas par équipe.
"""
import json, sys, time, urllib.request
from datetime import date, datetime
from zoneinfo import ZoneInfo

API = "https://graphql.scorenco.com/v1/graphql"
CLUB_ID = 128233
PARIS = ZoneInfo("Europe/Paris")
SORTIE = sys.argv[1] if len(sys.argv) > 1 else "data/calendrier-scorenco.json"
EVT = "id date time status teams url level_name level_in_season_id"

# Équipe Scorenco (slug) -> équipe de la console (commun/club.js)
CONSOLE = {
    "1": "Seniors-1", "2": "Seniors-2", "3": "Seniors-3", "f1": "Seniors F-1", "f2": "Seniors F-2",
    "veteran-1": "Vétérans-35", "u20-1": "U20-1", "u18-f1": "U18F-1", "2-u18-feminine": "U18F-2",
    "u17-1": "U17-1", "u17-2": "U17-2", "u15-1": "U15-1", "u15-2": "U15-2", "u15-3": "U15-3", "u15-4": "U15-4",
    "u15-f1": "U15F-2", "u13-1": "U13-1", "u13-2": "U13-2",
}


def gql(query):
    body = json.dumps({"query": query}).encode()
    for essai in range(3):
        try:
            req = urllib.request.Request(API, body, {"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=30) as r:
                d = json.loads(r.read())
            if "errors" in d:
                print("  erreur GraphQL :", d["errors"][0]["message"], file=sys.stderr)
                return None
            return d.get("data") or {}
        except Exception as e:
            print(f"  essai {essai + 1} : {e}", file=sys.stderr)
            time.sleep(2 * (essai + 1))
    return None


def evenements(team_id):
    d = gql(f"{{ teams_team_by_pk(id:{team_id}) {{ last_events {{ {EVT} }} next_events {{ {EVT} }} }} }}")
    pk = (d or {}).get("teams_team_by_pk") or {}
    time.sleep(0.15)
    return (pk.get("last_events") or []) + (pk.get("next_events") or [])


def date_heure(ev):
    t = ev.get("time")
    if not t:
        return ev.get("date"), None
    loc = datetime.fromisoformat(t).astimezone(PARIS)
    return loc.date().isoformat(), loc.strftime("%H:%M")


def est_championnat(nom):
    n = (nom or "").lower()
    return not any(k in n for k in ("coupe", "challenge", "trophée", "trophee", "tournoi", "amical"))


def main():
    auj = date.today()
    debut = date(auj.year if auj.month >= 7 else auj.year - 1, 7, 1).isoformat()

    d = gql(f"{{ teams_team(where:{{club_id:{{_eq:{CLUB_ID}}}}}) {{ id name slug gender age_category }} }}")
    equipes = (d or {}).get("teams_team") or []
    if not equipes:
        sys.exit("Aucune équipe reçue : l'ancien fichier est conservé")
    print(f"{len(equipes)} équipes ESGA")

    tous = {}
    poules_esga = {}
    for t in equipes:
        evs = [e for e in evenements(t["id"]) if (e.get("date") or "") >= debut]
        for e in evs:
            tous[e["id"]] = e
            if e.get("level_in_season_id") and est_championnat(e.get("level_name")):
                poules_esga.setdefault(e["level_in_season_id"], set()).add(t["id"])
        print(f"  {t['slug']}: {len(evs)} matchs")

    # Adversaires de championnat : leurs matchs complètent la poule (résultats et classement)
    adversaires = {}
    for e in tous.values():
        if e.get("level_in_season_id") in poules_esga:
            for x in e.get("teams") or []:
                if x.get("club_id") != CLUB_ID and x.get("team_id"):
                    adversaires[x["team_id"]] = e["level_in_season_id"]
    print(f"{len(adversaires)} adversaires dans {len(poules_esga)} poules")
    for tid in adversaires:
        for e in evenements(tid):
            if e.get("level_in_season_id") in poules_esga and (e.get("date") or "") >= debut:
                tous[e["id"]] = e

    slug_console = {t["id"]: CONSOLE.get(t["slug"]) for t in equipes}
    matchs, poules = [], {}
    for e in sorted(tous.values(), key=lambda e: e.get("time") or e.get("date") or ""):
        tt = e.get("teams") or []
        dom = next((x for x in tt if x.get("role") == "home"), {})
        ext = next((x for x in tt if x.get("role") == "away"), {})
        esga = dom if dom.get("club_id") == CLUB_ID else ext if ext.get("club_id") == CLUB_ID else None
        jour, heure = date_heure(e)
        lid = e.get("level_in_season_id")
        matchs.append({
            "id": e["id"], "date": jour, "heure": heure, "statut": e.get("status"),
            "competition": e.get("level_name"), "poule": lid if lid in poules_esga else None,
            "domicile": dom.get("name_in_competition") or "", "exterieur": ext.get("name_in_competition") or "",
            "dom_id": dom.get("team_id"), "ext_id": ext.get("team_id"),
            "score_dom": dom.get("score"), "score_ext": ext.get("score"),
            "esga_id": esga.get("team_id") if esga else None,
            "equipe": slug_console.get(esga.get("team_id")) if esga else None,
            "a_domicile": esga is dom if esga else None,
            "url": "https://scorenco.com" + e["url"] if e.get("url") else None,
        })
        if lid in poules_esga:
            p = poules.setdefault(lid, {"nom": e.get("level_name"), "lignes": {}})
            for x in (dom, ext):
                if x.get("team_id"):
                    p["lignes"].setdefault(x["team_id"], {"team_id": x["team_id"], "nom": x.get("name_in_competition") or "", "esga": x.get("club_id") == CLUB_ID,
                                                          "j": 0, "v": 0, "n": 0, "d": 0, "bp": 0, "bc": 0})
            sd, se = dom.get("score"), ext.get("score")
            if e.get("status") == "finish" and isinstance(sd, int) and isinstance(se, int) and dom.get("team_id") and ext.get("team_id"):
                for x, pour, contre in ((dom, sd, se), (ext, se, sd)):
                    l = p["lignes"][x["team_id"]]
                    l["j"] += 1; l["bp"] += pour; l["bc"] += contre
                    l["v" if pour > contre else "n" if pour == contre else "d"] += 1

    sortie_poules = {}
    for lid, p in poules.items():
        lignes = list(p["lignes"].values())
        if len(lignes) < 4:
            continue
        for l in lignes:
            l["diff"] = l["bp"] - l["bc"]
            l["pts"] = 3 * l["v"] + l["n"]
        lignes.sort(key=lambda l: (-l["pts"], -l["diff"], -l["bp"], l["nom"]))
        for i, l in enumerate(lignes):
            l["rang"] = i + 1
        sortie_poules[str(lid)] = {"nom": p["nom"], "classement": lignes}

    out = {
        "source": "scorenco", "club_id": CLUB_ID, "saison_debut": debut,
        "maj": datetime.now(PARIS).isoformat(timespec="minutes"),
        "equipes": [{"id": t["id"], "slug": t["slug"], "nom": t["name"], "categorie": t.get("age_category"), "genre": t.get("gender"),
                     "equipe": CONSOLE.get(t["slug"]), "poules": sorted(str(l) for l, ids in poules_esga.items() if t["id"] in ids and str(l) in sortie_poules)} for t in equipes],
        "poules": sortie_poules,
        "matchs": matchs,
    }
    with open(SORTIE, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(matchs)} matchs, {len(sortie_poules)} poules -> {SORTIE}")


if __name__ == "__main__":
    main()
