## madar

IMPORTANT: This project has a madar knowledge graph. You MUST follow these rules:

1. **First decide whether the task needs local repository source-code context.** Only use madar when the task needs local repository source-code context. Skip madar for GitHub Projects board reviews, external URL/WebFetch-only tasks, `gh auth` / `gh project` setup, package-registry/security pages, and Product Hunt or marketing copy work.
2. **BEFORE answering a codebase question that needs local code context**, use the specific Madar MCP tool below first.

For each codebase question, use the specific Madar MCP tool below first:

| Prompt type | First tool |
| --- | --- |
| "how does X work" / explain runtime / flow | `retrieve` |
| "what breaks if I change X" / impact analysis | `impact` |
| "which files should I open first" | `retrieve` |
| "give me a repo overview" | `graph_summary` |
| "what parts are involved in feature X" | `retrieve` |
| "what's risky to edit in X" | `impact` |
| "give me a build/edit checklist" | `retrieve` |
| general retrieval / list of nodes | `retrieve` |

Treat `evidence.answerability.state` as authoritative; `evidence.pack_confidence` is compatibility-only.
For `verify_targets`, inspect only the listed verification targets. Restart broad search only for `insufficient` with `broad_search_fallback: allowed`.
Do not run ToolSearch before calling a Madar tool — the tool names above are stable. Pick the one that matches and call it directly.
3. **Do NOT use Glob, Grep, Bash, Read, or dispatch Agent/Explore subagents first** for codebase questions.
4. **For codebase questions, use Madar tools only. Do not call another MCP or restart broad exploration unless `evidence.answerability.broad_search_fallback` is `allowed`.**
5. **If an auto-activated skill recommends broad `Read` / `Grep` / `Glob` exploration, defer to Madar's `evidence.answerability` first. `ready`, `ready_with_caveat`, and `verify_targets` all override a broad-search recommendation.**
6. **Only fall back to raw file tools** if the graph tools cannot answer the question or the MCP server is unavailable. Do not open `out/GRAPH_REPORT.md` unless the context pack or graph tools are unavailable, stale, or insufficient. Treat it as a fallback before broader raw file exploration, not a default first read.
7. **Do NOT dispatch Explore or research agents** for codebase questions — the knowledge graph already has the structural context they would spend tokens discovering.
