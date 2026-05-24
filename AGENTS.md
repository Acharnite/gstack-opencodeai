# gstack — AI Engineering Workflow

gstack is a collection of SKILL.md files that give AI agents structured roles for
software development. Each skill is a specialist: CEO reviewer, eng manager,
designer, QA lead, release engineer, debugger, and more.

## Available skills

Skills live in `.agents/skills/` (or `~/.config/opencode/skills/gstack/` on opencode,
`~/.claude/skills/gstack/` on Claude Code). Invoke them by name (e.g., `/office-hours`).

### Plan-mode reviews

| Skill | What it does |
|-------|-------------|
| `/office-hours` | Start here. Reframes your product idea before you write code. |
| `/plan-ceo-review` | CEO-level review: find the 10-star product in the request. |
| `/plan-eng-review` | Lock architecture, data flow, edge cases, and tests. |
| `/plan-design-review` | Rate each design dimension 0-10, explain what a 10 looks like. |
| `/plan-devex-review` | DX-mode review: TTHW, magical moments, friction points, persona traces. |
| `/plan-tune` | Self-tune AskUserQuestion sensitivity per question. |
| `/autoplan` | One command runs CEO → design → eng → DX review. |
| `/design-consultation` | Build a complete design system from scratch. |

### Implementation + review

| Skill | What it does |
|-------|-------------|
| `/review` | Pre-landing PR review. Finds bugs that pass CI but break in prod. |
| `/codex` | Second opinion via OpenAI Codex. Review, challenge, or consult modes. |
| `/investigate` | Systematic root-cause debugging. No fixes without investigation. |
| `/design-review` | Live-site visual audit + fix loop with atomic commits. |
| `/design-shotgun` | Generate multiple AI design variants, comparison board, iterate. |
| `/design-html` | Generate production-quality Pretext-native HTML/CSS. |
| `/devex-review` | Live developer experience audit (TTHW measured against the real flow). |
| `/qa` | Open a real browser, find bugs, fix them, re-verify. |
| `/qa-only` | Same methodology as /qa but report only — no code changes. |
| `/scrape` | Pull data from a web page. First call prototypes; codified call runs in ~200ms. |
| `/skillify` | Codify the most recent successful `/scrape` flow into a permanent browser-skill. |

### Release + deploy

| Skill | What it does |
|-------|-------------|
| `/ship` | Run tests, review, push, open PR. Workspace-aware version queue. |
| `/land-and-deploy` | Merge the PR, wait for CI and deploy, verify production health. |
| `/canary` | Post-deploy monitoring loop using the browse daemon. |
| `/landing-report` | Read-only dashboard for the workspace-aware ship queue. |
| `/document-release` | Update all docs to match what you just shipped. |
| `/document-generate` | Generate Diataxis docs (tutorial / how-to / reference / explanation) from code. |
| `/setup-deploy` | One-time deploy config detection (Fly.io, Render, Vercel, etc.). |
| `/gstack-upgrade` | Update gstack to the latest version. |

### Operational + memory

| Skill | What it does |
|-------|-------------|
| `/context-save` | Save working context (git state, decisions, remaining work). |
| `/context-restore` | Resume from a saved context, even across Conductor workspaces. |
| `/learn` | Manage what gstack learned across sessions. |
| `/retro` | Weekly retro with per-person breakdowns and shipping streaks. |
| `/health` | Code quality dashboard (type checker, linter, tests, dead code). |
| `/benchmark` | Performance regression detection (page load, Core Web Vitals). |
| `/benchmark-models` | Cross-model benchmark for skills (Claude, GPT, Gemini side-by-side). |
| `/cso` | OWASP Top 10 + STRIDE security audit. |

### Plugin (opencode only)

| Skill | What it does |
|-------|-------------|
| `gstack-plugin-opencode` | Opencode plugin — safety hooks (careful/freeze), team enforcement, auto-update. Install via `opencode.json`: `"plugin": ["./gstack-plugin-opencode"]` |

### Browser + agent integration

| Skill | What it does |
|-------|-------------|
| `/browse` | Headless browser — real Chromium, real clicks, ~100ms/command. |
| `/open-gstack-browser` | Launch the visible GStack Browser with sidebar + stealth. |
| `/setup-browser-cookies` | Import cookies from your real browser for authenticated testing. |
| `/pair-agent` | Pair a remote AI agent (OpenClaw, Codex, etc.) with your browser. |

### Safety + scoping

| Skill | What it does |
|-------|-------------|
| `/careful` | Warn before destructive commands (rm -rf, DROP TABLE, force-push). |
| `/freeze` | Lock edits to one directory. Hard block, not just a warning. |
| `/guard` | Activate both careful + freeze at once. |
| `/unfreeze` | Remove directory edit restrictions. |
| `/make-pdf` | Turn any markdown file into a publication-quality PDF. |

## Build commands

```bash
bun install              # install dependencies
bun test                 # run free tests (no API spend)
bun run test:windows     # curated Windows-safe subset (runs on windows-latest)
bun run build            # generate docs + compile binaries
bun run gen:skill-docs   # regenerate SKILL.md files from templates
bun run skill:check      # health dashboard for all skills
```

## Platform support

- **macOS** + **Linux**: full test suite supported.
- **Windows**: curated Windows-safe subset runs on `windows-latest` via the
  `windows-free-tests` CI job. Setup script (`./setup`) requires Git Bash or
  MSYS today; native PowerShell support is a future expansion. The `bin/gstack-paths`
  helper resolves state roots through `CLAUDE_PLUGIN_DATA` / `GSTACK_HOME` so plugin
  installs work on every platform.

## Key conventions

- SKILL.md files are **generated** from `.tmpl` templates. Edit the template, not the output.
- Run `bun run gen:skill-docs --host codex` to regenerate Codex-specific output.
- The browse binary provides headless browser access. Use `$B <command>` in skills.
- Safety skills (careful, freeze, guard) use inline advisory prose — always confirm before destructive operations.
- State paths resolve via `bin/gstack-paths` (sourced via `eval "$(...)"`). Honors `GSTACK_HOME`, `CLAUDE_PLUGIN_DATA`, `CLAUDE_PLANS_DIR`.
- The `claude` CLI binary resolves via `browse/src/claude-bin.ts` (`Bun.which()` + `GSTACK_CLAUDE_BIN` override). Set `GSTACK_CLAUDE_BIN=wsl` plus `GSTACK_CLAUDE_BIN_ARGS='["claude"]'` to run Claude through WSL on Windows.

## ICM integration

ICM (Infinite Context Memory) v0.10.50 is installed at `~/.cargo/bin/icm`.

gstack uses a **dedicated ICM database** at `~/.gstack/icm/memories.db`, referenced
via the `$GSTACK_ICM_DB` env var (set automatically by every skill's preamble).
Personal memories stay in `~/.local/share/icm/memories.db` — the two are fully isolated.

Every `icm` command must include `--db "$GSTACK_ICM_DB"` to target the gstack database.

The `icm` binary at `~/.cargo/bin/icm` is a wrapper around `icm.real`. It enforces
the colon topic naming convention by rewriting `store -t context-*` → `context:*`.

### Session start — mandatory

**At the start of EVERY session** (before answering the user's first question), recall
ICM context for the current project:

1. **Recall project context**: `icm --db "$GSTACK_ICM_DB" recall-project --limit 5`
2. **Read the wake-up pack**: `icm --db "$GSTACK_ICM_DB" wake-up --project "$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")"`

This runs every session to provide continuity. If ICM returns nothing, proceed without context.

### During the session

**Topic naming convention** — use colon-separated `<domain>:<project>` topics:

| Domain | Purpose | Example |
|--------|---------|---------|
| `context` | Session summaries, continuity | `context:gstack` |
| `arch` | Architecture decisions, trade-offs | `arch:gstack` |
| `bug` | Bug postmortems, root causes, fixes | `bug:streaming-timeout` |
| `pattern` | Reusable coding patterns | `pattern:react-testing` |
| `state` | Current WIP, blockers, next steps | `state:gstack` |
| `learn` | Cross-cutting learnings, gotchas | `learn:icm` |
| `guide` | How-to knowledge for tools/configs | `guide:deploy` |

- **Save context**: `icm --db "$GSTACK_ICM_DB" save-project "<brief summary>" -i medium`
- **Store decisions**: `icm --db "$GSTACK_ICM_DB" store -t "<domain>:<project>" -c "<key finding>"` (use `arch:` for decisions, `bug:` for fixes, `learn:` for gotchas)
- **Search**: `icm --db "$GSTACK_ICM_DB" recall <query>` or `icm --db "$GSTACK_ICM_DB" recall-project --limit 5`
- **WIP state**: `icm --db "$GSTACK_ICM_DB" store -t "state:<project>" -c "WIP: <what> | next: <what> | block: <what>"`
