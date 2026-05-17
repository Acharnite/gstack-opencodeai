#!/usr/bin/env bash
set -euo pipefail

export HOME="${HOME:-/home/kiffer}"
export PATH="$HOME/.bun/bin:$PATH"
export OPENAI_API_KEY=$(python3 -c "import json; print(json.load(open('$HOME/.gbrain/config.json'))['openai_api_key'])" 2>/dev/null)

WEEK_AGO=$(date -d '7 days ago' +%Y-%m-%d)
TODAY=$(date +%Y-%m-%d)
SLUG="weekly-summary-$(date +%Y%m%d)"

SUMMARY="# Weekly Summary: $WEEK_AGO to $TODAY

## gstack
$(cd /home/kiffer/gstack && git log --since="$WEEK_AGO" --format='- %s (%aN)' --no-merges 2>/dev/null || echo "(no commits)")

## gbrain
$(cd /home/kiffer/gbrain && git log --since="$WEEK_AGO" --format='- %s (%aN)' --no-merges 2>/dev/null || echo "(no commits)")

## bob
$(cd /home/kiffer/bob && git log origin/master --since="$WEEK_AGO" --format='- %s (%aN)' --no-merges 2>/dev/null || echo "(no commits)")

## Mistakes & Fixes Learned
$(gbrain search "mistake\|fix\|bug\|error\|patch" 2>/dev/null | head -10 | while IFS= read -r line; do echo "- $line"; done || echo "(no entries found)")
"

BODY="---
title: \"Weekly Summary: ${WEEK_AGO} to ${TODAY}\"
tags: [weekly-summary, report]
type: report
---

${SUMMARY}"
gbrain put "$SLUG" --content "$BODY" >/dev/null 2>&1
