/**
 * ICM resolver — ICM-first lookup and save-to-memory for thinking skills.
 *
 * ICM (Infinite Context Memory) replaces gbrain as the persistent memory layer.
 * These resolvers generate agent instructions for loading context before a skill
 * and saving results after finishing.
 *
 * Compatible with ICM >= v0.10.50.
 */
import type { TemplateContext } from './types';

export function generateICMContextLoad(ctx: TemplateContext): string {
  let base = `## ICM Context Load

Before starting this skill, search ICM for relevant context:

1. Extract 2-4 keywords from the user's request (nouns, error names, file paths, technical terms).
   Search ICM: \`icm --db "$GSTACK_ICM_DB" recall "keyword1 keyword2"\`
   Example: for "the login page is broken after deploy", search \`icm --db "$GSTACK_ICM_DB" recall "login broken deploy"\`
2. If few results, broaden to the single most specific keyword and search again.
3. Also run \`icm --db "$GSTACK_ICM_DB" wake-up --project "$(basename "$(git rev-parse --show-toplevel 2>/dev/null || echo "unknown")")\` to get a compact critical-facts pack for this project.
4. Use this context to inform your analysis.

If ICM is not available or returns no results, proceed without context.
Any non-zero exit code from \`icm\` should be treated as a transient failure.`;

  if (ctx.skillName === 'investigate') {
    base += `\n\nIf the user's request is about tracking, extracting, or researching structured data (e.g., "track this data", "extract from emails", "build a tracker"), focus on finding related bug patterns and previous investigations via \`icm --db "$GSTACK_ICM_DB" recall -t bug:<project>\`.`;
  }

  return base;
}

export function generateICMSaveResults(ctx: TemplateContext): string {
  const skillSaveMap: Record<string, string> = {
    'office-hours': 'Save the design document to ICM:\n```bash\nicm --db "$GSTACK_ICM_DB" store -t "context:$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")" \\\n  -c "Office Hours: <project name> — <brief summary>" \\\n  -i high \\\n  -k "design-doc,office-hours,<project-slug>"\n```',
    'investigate': 'Save the root cause analysis to ICM:\n```bash\nicm --db "$GSTACK_ICM_DB" store -t "bug:$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")" \\\n  -c "Investigation: <issue summary> — root cause: <cause>" \\\n  -i critical \\\n  -k "investigation,<affected-files>"\n```',
    'plan-ceo-review': 'Save the CEO review decisions to ICM:\n```bash\nicm --db "$GSTACK_ICM_DB" store -t "arch:$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")" \\\n  -c "CEO Plan: <feature name> — decision: <key decision>" \\\n  -i high \\\n  -k "ceo-plan,<feature-slug>"\n```',
    'retro': 'Save the retrospective to ICM:\n```bash\nicm --db "$GSTACK_ICM_DB" store -t "context:$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")" \\\n  -c "Retro: <date range> — <key takeaway>" \\\n  -i medium \\\n  -k "retro,<date>"\n```',
    'plan-eng-review': 'Save the architecture decisions to ICM:\n```bash\nicm --db "$GSTACK_ICM_DB" store -t "arch:$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")" \\\n  -c "Eng Review: <feature name> — decision: <key decision>" \\\n  -i high \\\n  -k "eng-review,<feature-slug>"\n```',
    'ship': 'Save the release to ICM:\n```bash\nicm --db "$GSTACK_ICM_DB" store -t "context:$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")" \\\n  -c "Release: <version> — <changelog summary>" \\\n  -i high \\\n  -k "release,<version>"\n```',
    'cso': 'Save the security audit to ICM:\n```bash\nicm --db "$GSTACK_ICM_DB" store -t "context:$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")" \\\n  -c "Security Audit: <date> — <key finding>" \\\n  -i critical \\\n  -k "security-audit,<date>"\n```',
    'design-consultation': 'Save the design system decisions to ICM:\n```bash\nicm --db "$GSTACK_ICM_DB" store -t "arch:$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")" \\\n  -c "Design System: <project name> — <key decision>" \\\n  -i high \\\n  -k "design-system,<project-slug>"\n```',
  };

  const fallback = `Save the skill output to ICM if the results are worth preserving:

\`\`\`bash
icm --db "$GSTACK_ICM_DB" store -t "learn:$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")" \\\\
  -c "<descriptive title> - <key finding>" \\\\
  -i medium \\\\
  -k "<relevant, tags>"
\`\`\`

For longer content with quotes or newlines, write the content to a temp file and pipe:

\`\`\`bash
_PROJ=$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
cat <<'ICMEOF' | icm --db "$GSTACK_ICM_DB" store -t "learn:$_PROJ" -i medium -k "<tags>" -c "$(cat)"
<long content here>
ICMEOF
\`\`\``;
  const saveInstruction = skillSaveMap[ctx.skillName] || fallback;

  return `## Save Results to ICM

After completing this skill, persist the results to ICM for future reference:

${saveInstruction}

After saving the key finding, also consider extracting person/company names mentioned in the output and saving them as separate entries with \`-k "entity,person"\`. Skip product names, section headings, technical terms, and file paths.

If \`icm\` returns a non-zero exit code, treat it as a transient failure and move on.

Note in your completion output: how many ICM memories were written. This helps the user see memory utilization over time.`;
}
