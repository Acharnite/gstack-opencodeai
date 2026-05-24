/**
 * Phase 0: ICM recall quality eval — two passes.
 *
 * Pass 1: without embeddings (keyword/scalar scoring only)
 * Pass 2: with embeddings (semantic scoring)
 *
 * Measures recall (was the right fact in top 5?) and rank (was it #1?).
 *
 * Run: bun run scripts/icm-recall-eval.ts
 * Uses a temp DB for each pass. Cleans up after itself.
 */

import { spawnSync } from "child_process";
import { mkdtempSync, existsSync, unlinkSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const ICM = process.env.ICM_BIN || "icm";
const TIMEOUT = 120_000;

// ── Seed facts ──────────────────────────────────────────────────────────────

interface SeedFact {
  id: string;
  topic: string;
  content: string;
  importance: string;
  keywords: string;
}

const SEED_FACTS: SeedFact[] = [
  {
    id: "arch-gbrain-removal",
    topic: "arch:gstack",
    content:
      "Decision: gbrain removed in favor of ICM. Reason: gbrain PGLite WASM incompatible with bun 1.3.14 on Debian 13. Mode: selective expansion, opencode-only fork.",
    importance: "high",
    keywords: "gbrain,ICM,replacement,opencode-only",
  },
  {
    id: "arch-db-separation",
    topic: "arch:gstack",
    content:
      "Decision: dedicated ICM database at ~/.gstack/icm/memories.db via GSTACK_ICM_DB env var. Personal memories stay at ~/.local/share/icm/memories.db. Isolated by design.",
    importance: "high",
    keywords: "database,separation,GSTACK_ICM_DB,isolation",
  },
  {
    id: "bug-preamble-perms",
    topic: "bug:gstack",
    content:
      "Fix: file permission errors in preamble block. Root cause: chmod not applied to generated binaries after build. Fix: added chmod +x step to build pipeline.",
    importance: "high",
    keywords: "permissions,chmod,build,preamble",
  },
  {
    id: "arch-link-vocabulary",
    topic: "arch:gstack",
    content:
      "Link types controlled vocabulary: invokes, depends-on, implements, fixes, precedes, relates-to. These cover skill invocation, architecture dependency, file ownership, causality, and temporal ordering.",
    importance: "medium",
    keywords: "links,vocabulary,memoir,concepts",
  },
  {
    id: "pattern-brain-sync",
    topic: "pattern:gstack",
    content:
      "Pattern: brain-sync-block resolves gbrain or ICM health at every skill start. Replaced gbrain detection with ICM HEALTH check that shows DB path, memoir count, and list.",
    importance: "medium",
    keywords: "sync-block,preamble,health-check,ICM_HEALTH",
  },
  {
    id: "learn-icm-resolver-file",
    topic: "learn:gstack",
    content:
      "ICM resolver functions live in scripts/resolvers/icm.ts. Two exports: generateICMContextLoad and generateICMSaveResults. Registered in scripts/resolvers/index.ts as GBRAIN_CONTEXT_LOAD and GBRAIN_SAVE_RESULTS (legacy names).",
    importance: "high",
    keywords: "resolver,icm.ts,file-location,context-load,save-results",
  },
  {
    id: "state-current-wip",
    topic: "state:gstack",
    content:
      "WIP: Phase 1 of deep ICM integration complete (DB separation, --db plumbing, preamble updates). Next: Phase 0 validation gate — measure recall quality before proceeding to extract/graph/learn. Blocked: none.",
    importance: "critical",
    keywords: "WIP,phase-1,db-separation,current-work",
  },
  {
    id: "arch-memoir-on-demand",
    topic: "arch:gstack",
    content:
      "Decision: knowledge graph (memoirs, concepts, links) is on-demand — agent chooses when to build and navigate. Extract and learn are also on-demand. Rationale: CEO review found that agents don't reliably use optional tooling without enforcement.",
    importance: "high",
    keywords: "memoir,concept,link,graph,on-demand,agent-behavior",
  },
  {
    id: "guide-test-conventions",
    topic: "guide:gstack",
    content:
      "Test conventions: use bun:test (describe/it/expect), create temp dirs with mkdtempSync, shell out to scripts via spawnSync with encoding utf-8 and 30s timeout. Tests live in test/.",
    importance: "low",
    keywords: "testing,bun,conventions,spawnSync,tempdir",
  },
  {
    id: "bug-build-plugin",
    topic: "bug:gstack",
    content:
      "Build failure: gstack-plugin-opencode/src/ directory missing. Error: 'FileNotFound opening root directory src'. Pre-existing, not caused by ICM changes.",
    importance: "low",
    keywords: "build,plugin,src-missing,gstack-plugin-opencode",
  },
];

// ── Query definitions ───────────────────────────────────────────────────────

interface QueryDef {
  id: string;
  query: string;
  expectedContent: string;
}

const QUERIES: QueryDef[] = [
  { id: "q1-gbrain-reason",    query: "why remove gbrain",                              expectedContent: "gbrain removed in favor of ICM" },
  { id: "q2-db-location",      query: "where is gstack icm database located",          expectedContent: "~/.gstack/icm/memories.db" },
  { id: "q3-resolver-file",    query: "where are icm resolver functions",              expectedContent: "scripts/resolvers/icm.ts" },
  { id: "q4-link-types",       query: "what are the link types for memoirs",           expectedContent: "invokes, depends-on" },
  { id: "q5-permissions-fix",  query: "file permission preamble fix",                   expectedContent: "chmod +x" },
  { id: "q6-current-work",     query: "what is current wip on icm integration",         expectedContent: "Phase 0 validation gate" },
  { id: "q7-brain-sync",       query: "brain sync block preamble",                      expectedContent: "ICM health" },
  { id: "q8-build-error",      query: "gstack plugin build error src missing",          expectedContent: "plugin-opencode" },
  { id: "q9-on-demand",        query: "knowledge graph on demand agent choice",         expectedContent: "on-demand" },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

interface CmdResult { stdout: string; stderr: string; exitCode: number }

function icm(args: string[], db: string, timeout = TIMEOUT): CmdResult {
  const result = spawnSync(ICM, [...args, "--db", db], {
    encoding: "utf-8", timeout, env: { ...process.env },
  });
  return {
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
    exitCode: result.status ?? 1,
  };
}

interface EvalResult {
  queries: { id: string; found: boolean; rank: number | null; topResults: string[] }[];
  found: number;
  top1: number;
  total: number;
}

function runPass(label: string, db: string, storeNoEmbed: boolean, recallNoEmbed: boolean): EvalResult {
  console.log(`\n=== Pass: ${label} ===`);

  // Seed
  const storeArgs = storeNoEmbed
    ? ["store", "--no-embeddings", "-t"]
    : ["store", "-t"];
  let seeded = 0;
  for (const fact of SEED_FACTS) {
    const r = icm([...storeArgs, fact.topic, "-c", fact.content, "-i", fact.importance, "-k", fact.keywords], db);
    if (r.exitCode === 0) seeded++;
    else console.error(`  FAIL seed ${fact.id}: ${r.stderr}`);
  }
  console.log(`  Seeded: ${seeded}/${SEED_FACTS.length}`);

  // Query
  const recallArgs = recallNoEmbed ? ["recall", "--no-embeddings"] : ["recall"];

  const results: EvalResult["queries"] = [];
  let found = 0;
  let top1 = 0;

  for (const q of QUERIES) {
    const r = icm([...recallArgs, q.query, "--limit", "5"], db);
    const entry = { id: q.id, found: false, rank: null as number | null, topResults: [] as string[] };

    if (r.exitCode === 0) {
      const lines = r.stdout.split("\n").filter((l) => l.trim());
      entry.topResults = lines;
      const matchIdx = lines.findIndex((l) =>
        l.toLowerCase().includes(q.expectedContent.toLowerCase())
      );
      if (matchIdx >= 0) {
        entry.found = true;
        entry.rank = matchIdx + 1;
        found++;
        if (entry.rank === 1) top1++;
      }
    }
    results.push(entry);

    const status = entry.found ? `FOUND (rank ${entry.rank})` : "NOT FOUND";
    console.log(`  ${q.id}: "${q.query}" → ${status}`);
  }

  console.log(`  Result: ${found}/${QUERIES.length} found, ${top1} at rank 1`);
  return { queries: results, found, top1, total: QUERIES.length };
}

// ── Main ────────────────────────────────────────────────────────────────────

function main(): void {
  console.log(`ICM binary: ${ICM}`);
  console.log(`Using ${ICM === "icm" ? "default" : "custom"} icm binary`);

  // Pass 1: no embeddings
  const db1 = join(mkdtempSync(join(tmpdir(), "icm-eval-noembed-")), "memories.db");
  const pass1 = runPass("No embeddings (keyword/scalar scoring)", db1, true, true);

  // Pass 2: with embeddings
  const db2 = join(mkdtempSync(join(tmpdir(), "icm-eval-embed-")), "memories.db");
  const pass2 = runPass("With embeddings (semantic scoring)", db2, false, false);

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n========================================`);
  console.log(`         PHASE 0: EVAL RESULTS`);
  console.log(`========================================`);

  console.log(`\n  ${"Measure".padEnd(35)} ${"No Embed".padEnd(12)} ${"With Embed".padEnd(12)}`);
  console.log(`  ${"─".repeat(35)} ${"─".repeat(12)} ${"─".repeat(12)}`);
  console.log(`  ${"Recall (found in top 5)".padEnd(35)} ${`${pass1.found}/${pass1.total}`.padEnd(12)} ${`${pass2.found}/${pass2.total}`.padEnd(12)}`);
  console.log(`  ${"Recall %".padEnd(35)} ${`${((pass1.found / pass1.total) * 100).toFixed(0)}%`.padEnd(12)} ${`${((pass2.found / pass2.total) * 100).toFixed(0)}%`.padEnd(12)}`);
  console.log(`  ${"Top-1 results".padEnd(35)} ${`${pass1.top1}/${pass1.total}`.padEnd(12)} ${`${pass2.top1}/${pass2.total}`.padEnd(12)}`);
  console.log(`  ${"Top-1 %".padEnd(35)} ${`${((pass1.top1 / pass1.total) * 100).toFixed(0)}%`.padEnd(12)} ${`${((pass2.top1 / pass2.total) * 100).toFixed(0)}%`.padEnd(12)}`);

  // ── Per-query comparison ─────────────────────────────────────────────────
  console.log(`\n  Per-query rank comparison:`);
  console.log(`  ${"Query".padEnd(30)} ${"No Embed".padEnd(12)} ${"With Embed".padEnd(12)}`);
  console.log(`  ${"─".repeat(30)} ${"─".repeat(12)} ${"─".repeat(12)}`);
  for (let i = 0; i < QUERIES.length; i++) {
    const r1 = pass1.queries[i];
    const r2 = pass2.queries[i];
    const s1 = r1.found ? `#${r1.rank}` : "—";
    const s2 = r2.found ? `#${r2.rank}` : "—";
    console.log(`  ${QUERIES[i].id.padEnd(30)} ${s1.padEnd(12)} ${s2.padEnd(12)}`);
  }

  // ── Verdict ──────────────────────────────────────────────────────────────
  console.log(`\n  --- Verdict ---`);
  const worstRecall = Math.min(pass1.found, pass2.found) / pass1.total;
  const worstTop1 = Math.min(pass1.top1, pass2.top1) / pass1.total;

  if (worstRecall >= 0.9 && worstTop1 >= 0.7) {
    console.log(`  PASS: recall quality is high in both modes.`);
    console.log(`  Recommendation: flat store/recall is sufficient.`);
    console.log(`  Knowledge graph and extract likely add marginal value.`);
  } else if (worstRecall >= 0.8) {
    console.log(`  PASS: recall is good (${(worstRecall * 100).toFixed(0)}%+), but top-1 is low (${(worstTop1 * 100).toFixed(0)}%).`);
    console.log(`  Recommendation: flat store/recall works for finding facts.`);
    console.log(`  Knowledge graph may help ranking. Proceed with caution.`);
  } else {
    console.log(`  FAIL: recall quality is below threshold.`);
    console.log(`  Recommendation: improve basic recall before adding complexity.`);
    console.log(`  Knowledge graph and extract would paper over a broken foundation.`);
  }

  console.log(`\n  Recommendation for Phases 2-4:`);
  if (worstRecall >= 0.9) {
    console.log(`  Defer indefinitely — flat store/recall is adequate.`);
  } else if (worstRecall >= 0.8) {
    console.log(`  Implement only if agents show recall gaps in practice.`);
    console.log(`  Phase 0 gate: conditional go.`);
  } else {
    console.log(`  Blocked — fix recall foundation first.`);
  }

  // Cleanup
  try { rmSync(db1.replace("/memories.db", ""), { recursive: true }); } catch {}
  try { rmSync(db2.replace("/memories.db", ""), { recursive: true }); } catch {}
  console.log(`\n  Temp DBs cleaned up.`);
}

main();
