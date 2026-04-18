# 2026-04-17-22-34 Audit and Inbox Processing

**2026-04-17**

## CLAUDE.md Audit

Ran `/audit` on the ear-tuner project. Four CLAUDE.md files in scope:
- `~/.claude/CLAUDE.md` (52 lines, global)
- `Projects/CLAUDE.md` (72 lines, projects root)
- `fiddle/CLAUDE.md` (45 lines, fiddle umbrella)
- `ear-tuner/CLAUDE.md` (28 lines, project-level)

Total loaded at once when working in ear-tuner: **197 lines** — well within the 250-line budget. All import references verified (APPS.md, architecture.md, tune-md-format.md, _shared/design/, dev-process.md, folder-conventions.md, markdown-conventions.md, karpathy_rules.md, specs/ear-tuner-spec.md, sounds/, backlog.md). No secrets, no duplication between levels, no orphaned files. Score: **100 — HEALTHY**.

---

## Inbox Processing — 7 Files

### Files 1+2: Excalidraw research (merged)
Explicit merge — file 2 said "related to my previous message, can be merged."

Two YouTube videos about driving Excalidraw with Claude:
- **Video 1** (Jay/RoboNuggets, `Gf-yFsbxgyo`): MCP server approach; free skill at skool.com community. No chapters.
- **Video 2** (Cole Medin, `m3fqyXZ4k4I`): No-MCP approach — generates `.excalidraw` JSON directly. Uses Playwright for a visual validation loop (Claude renders the diagram to PNG, inspects it, iterates until clean). GitHub: https://github.com/coleam00/excalidraw-diagram-skill. Has full chapters.

Casey's questions answered in the output file:
- **On-demand MCP?** Not really possible per-session. But the no-MCP approach (Cole Medin) eliminates the need entirely.
- **Playwright: is it a prerequisite?** Yes — required for the visual validation loop in Cole Medin's skill.
- **Hub repo:** https://github.com/coleam00/excalidraw-diagram-skill (noted prominently as requested).
- **CmapTools / concept map idea** documented: IHMC's proposition-based model, `.cxl` format, how a skill could extract propositions from source material.

Found that `ai/research/claude_and_excalidraw.md` already exists and covers this domain — wrote a companion file rather than appending to it.

Output: `ai/research/excalidraw-diagram-workflows-videos.md`

### File 3: Inbox skill log format update
No URL — a direct instruction to update how the skill formats log.md entries. Changes made:

**Before:**
```
2026-04-14-11-56-29 -0400.txt Generated C:\Users\CaseyM\OneDrive\Projects\fiddle\research\filename.md.
```

**After:**
```
- 2026-04-14-11-56-29 -0400.txt → [Projects\fiddle\research\filename.md](file:///C:/...) — One-sentence summary.
```

Specific changes:
1. Bullet prefix (`- `)
2. `→` replaces action words ("Generated", "Fallback", etc.)
3. Output file path becomes a clickable markdown link; display text truncates `C:\Users\CaseyM\OneDrive\` 
4. One-sentence summary appended after ` — `
5. Skill Step 8b updated with new format spec and examples

Also retroactively reformatted all 55 existing log.md entries — added bullets and links to every line, converted action words to arrows. Old entries don't get summaries (per instruction).

### Files 4+5+6: Mermaid desktop tools (merged, confirmed by Casey)
Detected as obvious merge candidates (all Mermaid tooling research). Casey confirmed.

- File 4 (Google Share URL `dPqbzEg146a0DymMF`): Resolved to **mermaid.live** — the official online Mermaid playground. Casey was looking for *desktop* editors. Noted the mismatch and documented desktop alternatives.
- File 5 (GitHub: PetterTech/DemoStuff/Mermaid): Sample Mermaid diagram files, useful as syntax reference.
- File 6 (VS Code Marketplace: `bierner.markdown-mermaid`): Extension that adds Mermaid rendering to VS Code's built-in Markdown preview. Supports Mermaid 11.12.0, pan/zoom navigation.

Desktop options documented: VS Code + extension, Obsidian (native rendering, no plugin needed), `mermaid-cli` (`mmdc`), Typora. mermaid.live noted as online-only.

Output: `ai/research/mermaid-desktop-editing-tools.md`

### File 7: Ear-tuner backlog item
Message: "lower the status line so it looks more like a smile in the right place when it smiles."

Added **E1** to `ear-tuner/backlog.md`:
> Lower the smile arc status line so it appears in the correct facial position when animating

Priority P3. This addresses the smile arc from the UI polish work done earlier in the day (`e986ab0` — smile arc animation on perfect round).

---

## Subagent Note
Files 1+2 (Excalidraw research) would have been a good subagent candidate — two video fetches plus substantial generation, fully self-contained with no routing ambiguity.
