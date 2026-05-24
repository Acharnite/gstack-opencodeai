/**
 * artifacts-sync preamble block (renamed from gbrain-sync in v1.27.0.0).
 *
 * Emits bash that runs at every skill invocation:
 *   0. Live gbrain-availability hint (per /plan-eng-review): when gbrain is
 *      configured, emit one of two variants (steady-state vs empty-corpus
 *      emergency). Zero context cost when gbrain is not configured.
 *   1. If ~/.gstack-artifacts-remote.txt (or legacy ~/.gstack-brain-remote.txt
 *      during the v1.27.0.0 migration window) exists AND ~/.gstack/.git is
 *      missing, surface a restore-available hint (does NOT auto-run restore).
 *   2. If sync is on, run `gstack-brain-sync --once` (drain + push). The
 *      script keeps its old name; only the config-key + state-file names flip.
 *   3. On first skill of the day (24h cache via .brain-last-pull):
 *      `git fetch` + ff-only merge (JSONL merge driver handles conflicts).
 *   4. Emit an `ARTIFACTS_SYNC:` status line so every skill surfaces health.
 *      In remote-MCP mode, the line reads `ARTIFACTS_SYNC: remote-mode
 *      (managed by brain server <host>)` since this machine doesn't sync
 *      anything locally — the brain admin's server pulls from GitHub/GitLab.
 *
 * Also emits prose instructions for the host LLM to fire a one-time privacy
 * stop-gate via AskUserQuestion when artifacts_sync_mode is unset and gbrain
 * is available on the host.
 *
 * Block emitted across all tiers. Internal bash short-circuits when feature
 * is disabled; cost is <5ms.
 *
 * Skill-end sync is handled by the completion-status generator via a call
 * to `gstack-brain-sync --discover-new` + `--once`.
 */
import type { TemplateContext } from '../types';

export function generateBrainSyncBlock(ctx: TemplateContext): string {
  const isBrainHost = ctx.host === 'gbrain' || ctx.host === 'hermes';
  return `## Artifacts Sync (skill start)

\`\`\`bash
_GSTACK_HOME="\${GSTACK_HOME:-$HOME/.gstack}"
# Prefer the v1.27.0.0 artifacts file; fall back to brain file for users
# upgrading mid-stream before the migration script runs.
if [ -f "$HOME/.gstack-artifacts-remote.txt" ]; then
  _BRAIN_REMOTE_FILE="$HOME/.gstack-artifacts-remote.txt"
else
  _BRAIN_REMOTE_FILE="$HOME/.gstack-brain-remote.txt"
fi
_BRAIN_SYNC_BIN="${ctx.paths.binDir}/gstack-brain-sync"
_BRAIN_CONFIG_BIN="${ctx.paths.binDir}/gstack-config"

# ICM health check: show memory count and memoir list if the gstack DB exists.
# This replaces the earlier gbrain detection block.
if [ -n "$GSTACK_ICM_DB" ] && [ -f "$GSTACK_ICM_DB" ] && command -v icm >/dev/null 2>&1; then
  echo "ICM_HEALTH: database found at $GSTACK_ICM_DB"
  _ICM_MEMOIR_COUNT=$(icm --db "$GSTACK_ICM_DB" memoir list 2>/dev/null | grep -c '^\[' || echo 0)
  if [ "$_ICM_MEMOIR_COUNT" -gt 0 ] 2>/dev/null; then
    echo "ICM_MEMOIRS: $_ICM_MEMOIR_COUNT available"
    icm --db "$GSTACK_ICM_DB" memoir list 2>/dev/null | head -5
  fi
else
  : # No ICM DB yet — first run, proceed silently
fi

_BRAIN_SYNC_MODE=$("$_BRAIN_CONFIG_BIN" get artifacts_sync_mode 2>/dev/null || echo off)

# Detect remote-MCP mode (Path 4 of /setup-gbrain). Local artifacts sync is
# a no-op in remote mode; the brain server pulls from GitHub/GitLab on its
# own cadence.
# Check opencode config (project-level opencode.json or global opencode.jsonc)
_GBRAIN_MCP_MODE="none"
if command -v jq >/dev/null 2>&1; then
  # Check opencode config first (current host)
  for _OC in "\${_REPO_TOP:-\$(pwd)}/opencode.json" "$HOME/.config/opencode/opencode.jsonc"; do
    [ -f "$_OC" ] || continue
    _GBRAIN_MCP_TYPE=$(jq -r '.mcp.gbrain.type // empty' "$_OC" 2>/dev/null)
    case "$_GBRAIN_MCP_TYPE" in
      local) _GBRAIN_MCP_MODE="local-stdio"; break ;;
      remote|http) _GBRAIN_MCP_MODE="remote-http"; break ;;
    esac
  done
  # No Claude Code fallback — opencode only
fi

if [ -f "$_BRAIN_REMOTE_FILE" ] && [ ! -d "$_GSTACK_HOME/.git" ] && [ "$_BRAIN_SYNC_MODE" = "off" ]; then
  _BRAIN_NEW_URL=$(head -1 "$_BRAIN_REMOTE_FILE" 2>/dev/null | tr -d '[:space:]')
  if [ -n "$_BRAIN_NEW_URL" ]; then
    echo "ARTIFACTS_SYNC: artifacts repo detected: $_BRAIN_NEW_URL"
    echo "ARTIFACTS_SYNC: run 'gstack-brain-restore' to pull your cross-machine artifacts (or 'gstack-config set artifacts_sync_mode off' to dismiss forever)"
  fi
fi

if [ -d "$_GSTACK_HOME/.git" ] && [ "$_BRAIN_SYNC_MODE" != "off" ]; then
  _BRAIN_LAST_PULL_FILE="$_GSTACK_HOME/.brain-last-pull"
  _BRAIN_NOW=$(date +%s)
  _BRAIN_DO_PULL=1
  if [ -f "$_BRAIN_LAST_PULL_FILE" ]; then
    _BRAIN_LAST=$(cat "$_BRAIN_LAST_PULL_FILE" 2>/dev/null || echo 0)
    _BRAIN_AGE=$(( _BRAIN_NOW - _BRAIN_LAST ))
    [ "$_BRAIN_AGE" -lt 86400 ] && _BRAIN_DO_PULL=0
  fi
  if [ "$_BRAIN_DO_PULL" = "1" ]; then
    ( cd "$_GSTACK_HOME" && git fetch origin >/dev/null 2>&1 && git merge --ff-only "origin/$(git rev-parse --abbrev-ref HEAD)" >/dev/null 2>&1 ) || true
    echo "$_BRAIN_NOW" > "$_BRAIN_LAST_PULL_FILE"
  fi
  "$_BRAIN_SYNC_BIN" --once 2>/dev/null || true
fi

if [ "$_GBRAIN_MCP_MODE" = "remote-http" ]; then
  # Remote-MCP mode: local artifacts sync is a no-op (brain admin's server
  # pulls from GitHub/GitLab). Show the user this is by design, not broken.
  _GBRAIN_HOST=$(jq -r '.mcp.gbrain.url // empty' "\${_REPO_TOP:-\$(pwd)}/opencode.json" 2>/dev/null || echo "" | sed -E 's|^https?://([^/:]+).*|\\1|')
  echo "ARTIFACTS_SYNC: remote-mode (managed by brain server \${_GBRAIN_HOST:-remote})"
elif [ -d "$_GSTACK_HOME/.git" ] && [ "$_BRAIN_SYNC_MODE" != "off" ]; then
  _BRAIN_QUEUE_DEPTH=0
  [ -f "$_GSTACK_HOME/.brain-queue.jsonl" ] && _BRAIN_QUEUE_DEPTH=$(wc -l < "$_GSTACK_HOME/.brain-queue.jsonl" | tr -d ' ')
  _BRAIN_LAST_PUSH="never"
  [ -f "$_GSTACK_HOME/.brain-last-push" ] && _BRAIN_LAST_PUSH=$(cat "$_GSTACK_HOME/.brain-last-push" 2>/dev/null || echo never)
  echo "ARTIFACTS_SYNC: mode=$_BRAIN_SYNC_MODE | last_push=$_BRAIN_LAST_PUSH | queue=$_BRAIN_QUEUE_DEPTH"
else
  echo "ARTIFACTS_SYNC: off"
fi
\`\`\`

${isBrainHost ? `If output shows \`ARTIFACTS_SYNC: artifacts repo detected\`, offer \`gstack-brain-restore\` via AskUserQuestion; otherwise continue.` : ''}

Privacy stop-gate: if output shows \`ARTIFACTS_SYNC: off\`, \`artifacts_sync_mode_prompted\` is \`false\`, and gbrain is on PATH or \`gbrain doctor --fast --json\` works, ask once:

> gstack can publish your artifacts (CEO plans, designs, reports) to a private GitHub repo that GBrain indexes across machines. How much should sync?

Options:
- A) Everything allowlisted (recommended)
- B) Only artifacts
- C) Decline, keep everything local

After answer:

\`\`\`bash
# Chosen mode: full | artifacts-only | off
"$_BRAIN_CONFIG_BIN" set artifacts_sync_mode <choice>
"$_BRAIN_CONFIG_BIN" set artifacts_sync_mode_prompted true
\`\`\`

If A/B and \`~/.gstack/.git\` is missing, ask whether to run \`gstack-artifacts-init\`. Do not block the skill.

At skill END before telemetry:

\`\`\`bash
"${ctx.paths.binDir}/gstack-brain-sync" --discover-new 2>/dev/null || true
"${ctx.paths.binDir}/gstack-brain-sync" --once 2>/dev/null || true
\`\`\`
`;
}
