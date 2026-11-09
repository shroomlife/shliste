"""Prepare a generation brief, locate visible subjects, then review the actual WebP."""
import argparse
import base64
import hashlib
import json
import math
import re
from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def asset(url):
    if not re.fullmatch(r"/images/editorial/[a-z0-9-]+/v[1-9][0-9]*/(hero|step-[1-9][0-9]*)\.webp", url):
        raise ValueError("Ungültiger Bildpfad")
    return ROOT / "public" / url.lstrip("/")


def subjects_for(scene, recipe):
    ingredients = {item["id"]: item["name"] for item in recipe["ingredients"]}
    subjects = {}
    for item in scene["subjects"]:
        key = item["id"]
        if key in subjects or not re.fullmatch(r"[a-z0-9-]+", key):
            raise ValueError(f"Ungültige oder doppelte Motiv-ID: {key}")
        if bool(item.get("dish")) != (key == "dish"):
            raise ValueError("Das angerichtete Gericht hat die reservierte Motiv-ID dish.")
        if item.get("dish"):
            label = recipe["title"]
            names = []
        else:
            names = [ingredients[key] for key in item["ingredients"]]
            if not names:
                raise ValueError("Zutatenmotiv ohne Rezeptzutat")
            label = item.get("label") or ", ".join(names)
        subjects[key] = {"label": label, "ingredients": names, "position": item["position"]}
    return subjects


def points_from(report, identity, subjects):
    if any(report.get(key) != value for key, value in identity.items()):
        raise ValueError("Die Bildprüfung gehört zu einem anderen Bild, Schritt oder Briefing.")
    points = report["points"]
    if not isinstance(points, dict) or points.keys() != subjects.keys():
        raise ValueError("Für jedes erwartete Motiv einen Punkt oder null angeben.")
    markers = []
    for key, info in subjects.items():
        point = points[key]
        if point is None:
            continue
        if not isinstance(point, list) or len(point) != 2 or not all(type(n) in (int, float) and math.isfinite(n) and 0 <= n <= 100 for n in point):
            raise ValueError(f"Ungültiger Bildpunkt für {key}")
        markers.append({"subject": key, "label": info["label"], "x": point[0], "y": point[1]})
    return markers


def check_series(recipe, plan):
    steps = {s["id"] for s in recipe["steps"]}
    if len(steps) != len(recipe["steps"]) or steps != set(plan["steps"]):
        raise ValueError("Rezept und Bildbriefing brauchen dieselben eindeutigen Schritt-IDs.")
    for picture in [recipe["hero"], *(s["illustration"] for s in recipe["steps"])]:
        full = asset(picture["src"])
        for path in (full, full.with_stem(full.stem + "-small")):
            with path.open("rb") as image:
                header = image.read(12)
            if header[:4] != b"RIFF" or header[8:] != b"WEBP":
                raise ValueError(f"Ungültiger WebP-Export: {path}")
            with Image.open(path) as cover:
                if picture is recipe["hero"]:
                    if cover.width != 2 * cover.height:
                        raise ValueError(f"Titelbilder brauchen das einheitliche 2:1-Format: {path}")
                elif cover.width * 2 != cover.height * 3:
                    raise ValueError(f"Schrittbilder brauchen das einheitliche 3:2-Format: {path}")
    for step in recipe["steps"]:
        scene = plan["steps"][step["id"]]
        if not asset(plan["scenes"][scene["scene"]]["reference"]).is_file():
            raise ValueError(f"Fehlende Küchenreferenz: {step['id']}")
        subjects = subjects_for(scene, recipe)
        seen = set()
        for marker in step["illustration"].get("markers", []):
            key = marker.get("subject")
            if key not in subjects or key in seen or marker.get("label") != subjects[key]["label"]:
                raise ValueError(f"Unpassender Zutatenpunkt: {step['id']} / {key}")
            if not all(type(n) in (int, float) and 0 <= n <= 100 for n in (marker.get("x"), marker.get("y"))):
                raise ValueError(f"Zutatenpunkt außerhalb des Bildes: {step['id']} / {key}")
            seen.add(key)
    print(f'{recipe["title"]}: Titelbild, {len(steps)} Schrittbilder, kleine Exporte, Referenzen und Bildpunkte geprüft.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["brief", "locate", "review", "apply", "check"])
    parser.add_argument("recipe", type=Path, help="Katalogdatei <name>.v1.json")
    parser.add_argument("step", nargs="?", help="Stabile Schritt-ID (außer bei check)")
    parser.add_argument("--report", type=Path, help="Vorschlag zum Prüfen oder bestätigtes Ergebnis")
    parser.add_argument("--out", type=Path, help="Ziel für das lokale Prüfblatt")
    args = parser.parse_args()
    recipe = read(args.recipe)
    plan = read(args.recipe.with_suffix(".scenes.json"))
    if args.mode == "check":
        check_series(recipe, plan)
        return
    if not args.step:
        parser.error(f"{args.mode} benötigt eine Schritt-ID")
    step = next(s for s in recipe["steps"] if s["id"] == args.step)
    scene = plan["steps"][args.step]
    camera = plan["scenes"][scene["scene"]]
    subjects = subjects_for(scene, recipe)
    picture = step["illustration"]
    if args.mode == "brief":
        print(f'{recipe["title"]} · {step["title"]}\n{step["instruction"]}\n')
        print("Bildreferenzen anhängen:", asset(camera["reference"]))
        if any(item.get("dish") for item in scene["subjects"]):
            print("Verbindliche Serviervorlage:", asset(recipe["hero"]["src"]))
            print("Geschirr, Portionierung, Nudel- oder Schnittform und Garnitur aus dem Titelbild übernehmen.")
        print(camera["framing"])
        print("Küchengeometrie, Ausschnitt und malerischen App-Stil der Referenz erhalten. Nur den aktuellen Kochzustand zeigen. Vollflächiges 3:2-Bild bis zum Rand. Keine Schrift, Zahlen oder Markierungen einzeichnen. Nur pflanzliche Zutaten und nötiges Werkzeug. Keine Gesichter oder Spiegelungen. Unterschiedliche Hauttöne über die Serie verteilen. Bei Sonnenlicht einen kleinen Regenbogenreflex erhalten.")
        for info in subjects.values():
            print(f'- {info["label"]} ({", ".join(info["ingredients"]) or recipe["title"]}) sichtbar platzieren: {info["position"]}.')
        return

    pixels = asset(picture["src"]).read_bytes()
    identity = {
        "recipe": recipe["catalogId"], "step": args.step, "image": picture["src"],
        "sha256": hashlib.sha256(pixels).hexdigest(),
        "subjectsHash": hashlib.sha256(json.dumps(subjects, sort_keys=True).encode()).hexdigest(),
    }
    template = {**identity, "points": dict.fromkeys(subjects)}
    if args.mode == "locate":
        print(f'Öffne dieses fertige Bild als Bildinput: {asset(picture["src"])}')
        print("Identifiziere nur eindeutig sichtbare Motive. Setze den Punkt ins Innere der sichtbaren Zutat. Bei Verdeckung, Unsicherheit oder einer bereits vermischten Zutat bleibt der Wert null. Ermittle die Position im tatsächlichen Bild ohne Kenntnis der geplanten Lage.")
        for key, info in subjects.items():
            print(f'- {key}: {info["label"]} ({", ".join(info["ingredients"]) or recipe["title"]})')
        print("Gib dieses JSON mit [x,y] in Prozent ab der linken oberen Ecke oder null je Motiv zurück.")
        print(json.dumps(template, indent=2, ensure_ascii=False))
        return

    if args.mode == "apply" and not args.report:
        parser.error("apply benötigt --report aus dem bestätigten Prüfblatt")
    report = read(args.report) if args.report else template
    markers = points_from(report, identity, subjects)
    if args.mode == "apply":
        if report.get("reviewed") is not True:
            raise ValueError("Bildpunkte zuerst im Prüfblatt bestätigen.")
        picture["markers"] = markers
        # Keep the original intact if writing is interrupted.
        temporary = args.recipe.with_suffix(".json.tmp")
        temporary.write_text(json.dumps(recipe, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        temporary.replace(args.recipe)
        return

    if not args.out:
        parser.error("review benötigt --out <Prüfblatt.html>")
    data = {"title": recipe["title"], "stepTitle": step["title"], "subjects": subjects, "report": report,
            "image": "data:image/webp;base64," + base64.b64encode(pixels).decode("ascii")}
    html = Path(__file__).with_name("recipe-scene-review.html").read_text(encoding="utf-8")
    args.out.write_text(html.replace("/*MODEL*/null", json.dumps(data, ensure_ascii=False).replace("<", "\\u003c")), encoding="utf-8")


if __name__ == "__main__":
    main()
