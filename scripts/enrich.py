#!/usr/bin/env python3
"""Enrich Google Maps scraper leads using ScrapeGraphAI (LLM-based website extraction).

Takes a CSV from scripts/scrape.py (must have a "website" column) and, for each lead with a
website, extracts contact/qualification signals that plain regex can't reliably find: a
decision-maker's name, a direct contact email, services offered, and a business-size signal.

Usage:
    python3 scripts/enrich.py results.csv
    python3 scripts/enrich.py results.csv --out enriched.csv --limit 20 --delay 4

Requires GOOGLE_API_KEY (Gemini) in the environment or a .env file in the project root.
Costs one LLM call per website with a `website` value — use --limit to cap spend/quota on a
first run, and --delay to stay under the Gemini free-tier rate limit (default 4s between calls).
"""

import argparse, csv, os, sys, time

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from dotenv import load_dotenv
from pydantic import BaseModel, Field
from scrapegraphai.graphs import SmartScraperGraph

load_dotenv()

MODEL = os.environ.get("SCRAPEGRAPH_MODEL", "google_genai/gemini-flash-latest")


class LeadEnrichment(BaseModel):
    contact_name: str = Field(
        description="Owner/manager/decision-maker name mentioned on the site, empty string if none found"
    )
    contact_email: str = Field(
        description="A direct contact email if present and different from a generic info@ address, empty string if none found"
    )
    services: str = Field(
        description="Comma-separated main services or products offered"
    )
    business_size_signal: str = Field(
        description="Size signal: e.g. solo operator, small team, multi-location, franchise; empty string if unclear"
    )


def enrich_one(url: str, api_key: str) -> dict:
    config = {
        "llm": {"api_key": api_key, "model": MODEL},
        "verbose": False,
        "headless": True,
    }
    graph = SmartScraperGraph(
        prompt=(
            "Extract, about the business that owns this website: the name of the owner, "
            "manager, or a decision-maker if mentioned anywhere; a direct contact email if "
            "different from a generic info@/contact@ address; the main services or products "
            "offered; and any signal of business size (solo operator, small team, "
            "multi-location, franchise). Use an empty string for anything not found."
        ),
        source=url,
        config=config,
        schema=LeadEnrichment,
    )
    return graph.run()


def main():
    ap = argparse.ArgumentParser(
        description="Enrich Google Maps leads via ScrapeGraphAI."
    )
    ap.add_argument(
        "csv_in", help="CSV from scripts/scrape.py (needs a 'website' column)"
    )
    ap.add_argument(
        "--out", default=None, help="output CSV path (default: <input>-enriched.csv)"
    )
    ap.add_argument(
        "--limit",
        type=int,
        default=None,
        help="only enrich the first N leads with a website",
    )
    ap.add_argument(
        "--delay",
        type=float,
        default=4.0,
        help="seconds to wait between calls (default 4, be gentle with free-tier quota)",
    )
    a = ap.parse_args()

    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        sys.exit("✗ GOOGLE_API_KEY not set. Add it to .env (see .env.example).")

    with open(a.csv_in, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        sys.exit("✗ No rows in input CSV.")
    if "website" not in rows[0]:
        sys.exit("✗ Input CSV has no 'website' column — run scripts/scrape.py first.")

    todo = [r for r in rows if r.get("website")]
    if a.limit:
        todo = todo[: a.limit]
    print(f"▶ Enriching {len(todo)}/{len(rows)} leads with a website (model: {MODEL})")

    enrich_fields = [
        "contact_name",
        "contact_email",
        "services",
        "business_size_signal",
    ]
    for r in rows:
        for k in enrich_fields:
            r.setdefault(k, "")

    for i, r in enumerate(todo, 1):
        print(f"  [{i}/{len(todo)}] {r.get('title', '')} — {r['website']}")
        try:
            result = enrich_one(r["website"], api_key)
            r.update({k: result.get(k, "") for k in enrich_fields})
        except Exception as e:
            print(f"    (skipped: {e})", file=sys.stderr)
        if i < len(todo):
            time.sleep(a.delay)

    out = a.out or a.csv_in.rsplit(".", 1)[0] + "-enriched.csv"
    fieldnames = list(rows[0].keys())
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    found = sum(1 for r in todo if r.get("contact_name") or r.get("contact_email"))
    print(
        f"✓ Done — saved {out} ({found}/{len(todo)} leads got a contact name or email)"
    )


if __name__ == "__main__":
    main()
