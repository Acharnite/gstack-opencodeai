# gstack-opencodeai

gstack-opencodeai turns AI coding agents into a virtual engineering team — a CEO who rethinks the product, an eng manager who locks architecture, a designer who catches AI slop, a reviewer who finds production bugs, a QA lead who opens a real browser, and more.

**Who this is for:**
- **opencode users** — run gstack skills without Claude Code
- **Anyone who wants structured AI workflows** — not a blank prompt, but a full engineering sprint

## Quick start

1. Install gstack-opencodeai (30 seconds — see below)
2. Run `/office-hours` — describe what you're building
3. Run `/plan-ceo-review` on any feature idea
4. Run `/review` on any branch with changes
5. Run `/qa` on your staging URL
6. Stop there. You'll know if this is for you.

## Install — 30 seconds

**Requirements:** [opencode](https://opencode.ai), [Git](https://git-scm.com/), [Bun](https://bun.sh/) v1.0+, [Node.js](https://nodejs.org/) (Windows only)

```bash
git clone --single-branch --depth 1 https://github.com/Acharnite/gstack-opencodeai.git ~/.config/opencode/skills/gstack && cd ~/.config/opencode/skills/gstack && ./setup --host opencode
```

Copy `opencode.json.example` to `opencode.json` and adjust paths:

```bash
cp opencode.json.example opencode.json
```

### Team mode — auto-update for shared repos (recommended)

```bash
(cd ~/.config/opencode/skills/gstack && ./setup --team --host opencode) && ~/.config/opencode/skills/gstack/bin/gstack-team-init optional && git add .claude/ CLAUDE.md && git commit -m "require gstack for AI-assisted work"
```

Swap `optional` for `required` to block teammates without gstack from working in the repo.

### Other AI Agents

gstack-opencodeai works on 10 AI coding agents. Target a specific agent with `./setup --host <name>`:

| Agent | Flag | Skills install to |
|-------|------|-------------------|
| OpenAI Codex CLI | `--host codex` | `~/.codex/skills/gstack-*/` |
| OpenCode | `--host opencode` | `~/.config/opencode/skills/gstack-*/` |
| Cursor | `--host cursor` | `~/.cursor/skills/gstack-*/` |
| Factory Droid | `--host factory` | `~/.factory/skills/gstack-*/` |
| Slate | `--host slate` | `~/.slate/skills/gstack-*/` |
| Kiro | `--host kiro` | `~/.kiro/skills/gstack-*/` |
| Hermes | `--host hermes` | `~/.hermes/skills/gstack-*/` |
| OpenClaw | `--host openclaw` | `~/.openclaw/skills/gstack-*/` |
| GBrain (mod) | `--host gbrain` | `~/.gbrain/skills/gstack-*/` |

**Want to add support for another agent?** See [docs/ADDING_A_HOST.md](docs/ADDING_A_HOST.md).
It's one TypeScript config file, zero code changes.

## The sprint

gstack-opencodeai is a process, not a collection of tools. The skills run in the order a sprint runs:

**Think → Plan → Build → Review → Test → Ship → Reflect**

Each skill feeds into the next. `/office-hours` writes a design doc that `/plan-ceo-review` reads. `/plan-eng-review` writes a test plan that `/qa` picks up. `/review` catches bugs that `/ship` verifies are fixed.

| Skill | Your specialist | What they do |
|-------|----------------|--------------|
| `/office-hours` | **YC Office Hours** | Start here. Six forcing questions that reframe your product before you write code. Pushes back on your framing, challenges premises, generates implementation alternatives. Design doc feeds into every downstream skill. |
| `/plan-ceo-review` | **CEO / Founder** | Rethink the problem. Find the 10-star product hiding inside the request. Four modes: Expansion, Selective Expansion, Hold Scope, Reduction. |
| `/plan-eng-review` | **Eng Manager** | Lock in architecture, data flow, diagrams, edge cases, and tests. Forces hidden assumptions into the open. |
| `/plan-design-review` | **Senior Designer** | Rates each design dimension 0-10, explains what a 10 looks like, then edits the plan to get there. AI Slop detection. Interactive — one AskUserQuestion per design choice. |
| `/plan-devex-review` | **Developer Experience Lead** | Interactive DX review: explores developer personas, benchmarks against competitors' TTHW, designs your magical moment, traces friction points step by step. Three modes: DX EXPANSION, DX POLISH, DX TRIAGE. 20-45 forcing questions. |
| `/design-consultation` | **Design Partner** | Build a complete design system from scratch. Researches the landscape, proposes creative risks, generates realistic product mockups. |
| `/review` | **Staff Engineer** | Find the bugs that pass CI but blow up in production. Auto-fixes the obvious ones. Flags completeness gaps. |
| `/investigate` | **Debugger** | Systematic root-cause debugging. Iron Law: no fixes without investigation. Traces data flow, tests hypotheses, stops after 3 failed fixes. |
| `/design-review` | **Designer Who Codes** | Same audit as /plan-design-review, then fixes what it finds. Atomic commits, before/after screenshots. |
| `/devex-review` | **DX Tester** | Live developer experience audit. Actually tests your onboarding: navigates docs, tries the getting started flow, times TTHW, screenshots errors. Compares against `/plan-devex-review` scores — the boomerang that shows if your plan matched reality. |
| `/design-shotgun` | **Design Explorer** | "Show me options." Generates 4-6 AI mockup variants, opens a comparison board in your browser, collects your feedback, and iterates. Taste memory learns what you like. Repeat until you love something, then hand it to `/design-html`. |
| `/design-html` | **Design Engineer** | Turn a mockup into production HTML that actually works. Pretext computed layout: text reflows, heights adjust, layouts are dynamic. 30KB, zero deps. Detects React/Svelte/Vue. Smart API routing per design type (landing page vs dashboard vs form). The output is shippable, not a demo. |
| `/qa` | **QA Lead** | Test your app, find bugs, fix them with atomic commits, re-verify. Auto-generates regression tests for every fix. |
| `/qa-only` | **QA Reporter** | Same methodology as /qa but report only. Pure bug report without code changes. |
| `/pair-agent` | **Multi-Agent Coordinator** | Share your browser with any AI agent. One command, one paste, connected. Works with OpenClaw, Hermes, Codex, Cursor, or anything that can curl. Each agent gets its own tab. Auto-launches headed mode so you watch everything. Auto-starts ngrok tunnel for remote agents. Scoped tokens, tab isolation, rate limiting, activity attribution. |
| `/cso` | **Chief Security Officer** | OWASP Top 10 + STRIDE threat model. Zero-noise: 17 false positive exclusions, 8/10+ confidence gate, independent finding verification. Each finding includes a concrete exploit scenario. |
| `/ship` | **Release Engineer** | Sync main, run tests, audit coverage, push, open PR. Bootstraps test frameworks if you don't have one. |
| `/land-and-deploy` | **Release Engineer** | Merge the PR, wait for CI and deploy, verify production health. One command from "approved" to "verified in production." |
| `/canary` | **SRE** | Post-deploy monitoring loop. Watches for console errors, performance regressions, and page failures. |
| `/benchmark` | **Performance Engineer** | Baseline page load times, Core Web Vitals, and resource sizes. Compare before/after on every PR. |
| `/document-release` | **Technical Writer** | Update all project docs to match what you just shipped. Catches stale READMEs automatically. Builds a Diataxis coverage map (reference / how-to / tutorial / explanation) so gaps are visible in the PR body. |
| `/document-generate` | **Documentation Author** | Generate missing docs from scratch using the Diataxis framework. Researches the codebase first, then writes reference / how-to / tutorial / explanation docs that actually match the code. Invokable standalone or chained from `/document-release` when the coverage map finds gaps. |
| `/retro` | **Eng Manager** | Team-aware weekly retro. Per-person breakdowns, shipping streaks, test health trends, growth opportunities. `/retro global` runs across all your projects and AI tools (Claude Code, Codex, Gemini). |
| `/browse` | **QA Engineer** | Give the agent eyes. Real Chromium browser, real clicks, real screenshots. ~100ms per command. `/open-gstack-browser` launches GStack Browser with sidebar, anti-bot stealth, and auto model routing. |
| `/setup-browser-cookies` | **Session Manager** | Import cookies from your real browser (Chrome, Arc, Brave, Edge) into the headless session. Test authenticated pages. |
| `/autoplan` | **Review Pipeline** | One command, fully reviewed plan. Runs CEO → design → eng review automatically with encoded decision principles. Surfaces only taste decisions for your approval. |
| `/learn` | **Memory** | Manage what gstack learned across sessions. Review, search, prune, and export project-specific patterns, pitfalls, and preferences. Learnings compound across sessions so gstack gets smarter on your codebase over time. |

### Opencode plugin

| Plugin | What it does |
|--------|-------------|
| `gstack-plugin-opencode` | Safety hooks (careful/freeze replacement), team enforcement, auto-update. Install via `opencode.json`: `"plugin": ["./gstack-plugin-opencode"]` |

### Power tools

| Skill | What it does |
|-------|-------------|
| `/codex` | **Second Opinion** — independent code review from OpenAI Codex CLI. |
| `/careful` | **Safety Guardrails** — warns before destructive commands. |
| `/freeze` | **Edit Lock** — restrict file edits to one directory. |
| `/guard` | **Full Safety** — `/careful` + `/freeze` in one command. |
| `/unfreeze` | **Unlock** — remove the `/freeze` boundary. |
| `/open-gstack-browser` | **GStack Browser** — launch GStack Browser with sidebar. |
| `/learn` | **Memory** — manage what gstack learned across sessions. |

### Merging upstream changes

gstack-opencodeai is based on [garrytan/gstack](https://github.com/garrytan/gstack). To merge upstream changes:

```bash
git remote add upstream https://github.com/garrytan/gstack.git
git fetch upstream
git merge upstream/main
# resolve conflicts in .tmpl templates, NOT generated SKILL.md
bun run gen:skill-docs
bun test
git push
```

## Uninstall

```bash
~/.config/opencode/skills/gstack/bin/gstack-uninstall
```

This handles skills, symlinks, global state (`~/.gstack/`), project-local state, browse daemons, and temp files. Use `--keep-state` to preserve config and analytics. Use `--force` to skip confirmation.

### Manual removal

```bash
# Stop browse daemons
pkill -f "gstack.*browse" 2>/dev/null || true

# Remove gstack installations
rm -rf ~/.config/opencode/skills/gstack
rm -rf ~/.codex/skills/gstack*
rm -rf ~/.factory/skills/gstack*
rm -rf ~/.cursor/skills/gstack*
rm -rf ~/.kiro/skills/gstack*
rm -rf ~/.openclaw/skills/gstack*

# Remove global state
rm -rf ~/.gstack

# Remove temp files
rm -f /tmp/gstack-* 2>/dev/null

# Per-project cleanup (run from each project root)
rm -rf .gstack .gstack-worktrees .opencode/skills/gstack 2>/dev/null
rm -rf .agents/skills/gstack* .factory/skills/gstack* 2>/dev/null

# Clean up AGENTS.md
```

The uninstall script does not edit AGENTS.md. In each project where gstack was added, remove the `## gstack` and `## Skill routing` sections.

### Playwright

`~/Library/Caches/ms-playwright/` (macOS) / `~/.cache/ms-playwright/` (Linux) is left in place because other tools may share it. Remove it if nothing else needs it.

## License

MIT. Free forever. Go build something.
