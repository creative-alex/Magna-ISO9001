// madar managed Claude UserPromptSubmit hook
const fs = require('fs')
const path = require('path')

const config = {
  "local_code_terms": [
    "repo",
    "repository",
    "codebase",
    "source code",
    "code",
    "file",
    "files",
    "module",
    "function",
    "class",
    "symbol",
    "runtime",
    "stack trace",
    "service",
    "controller",
    "component",
    "pipeline",
    "diff",
    "pr",
    "pull request",
    "tests",
    "test",
    "bug",
    "issue",
    "auth",
    "token",
    "session",
    "changed files",
    "this repo",
    "local repository"
  ],
  "implement_terms": [
    "implement",
    "fix issue",
    "fix bug",
    "wire up",
    "add support",
    "build feature",
    "create feature",
    "write code"
  ],
  "explain_terms": [
    "explain how",
    "how does",
    "where is",
    "walk me through",
    "help me understand",
    "trace runtime path",
    "find affected files"
  ],
  "debug_terms": [
    "trace why",
    "root cause",
    "stack trace",
    "why is",
    "why does",
    "debug",
    "failing",
    "failure",
    "broken",
    "error",
    "bug"
  ],
  "test_terms": [
    "write tests",
    "write regression tests",
    "add tests",
    "add regression tests",
    "generate tests",
    "create tests",
    "unit test",
    "integration test",
    "regression test"
  ],
  "review_terms": [
    "review this pr",
    "review the pr",
    "review the diff",
    "pr diff",
    "review code",
    "audit the",
    "review the recent"
  ],
  "refactor_terms": [
    "refactor",
    "dead code",
    "clean up module",
    "cleanup module",
    "simplify module"
  ],
  "github_project_terms": [
    "github project",
    "github projects",
    "project board",
    "projects board",
    "roadmap board",
    "roadmap review"
  ],
  "package_registry_terms": [
    "socket.dev",
    "socket alert",
    "npmjs.com",
    "package registry",
    "npm package",
    "package security page"
  ],
  "auth_setup_terms": [
    "gh auth",
    "gh project",
    "auth login",
    "login setup",
    "device code",
    "token setup"
  ],
  "marketing_copy_terms": [
    "product hunt",
    "marketing copy",
    "launch copy",
    "headline",
    "tagline",
    "positioning",
    "landing page copy"
  ],
  "general_research_terms": [
    "web research",
    "market research",
    "competitor research",
    "general research"
  ],
  "reason_labels": {
    "implement": "implementation task",
    "explain": "codebase explanation task",
    "debug": "debugging task",
    "test": "test-writing task",
    "review": "code review task",
    "refactor": "refactor task",
    "external_url": "external URL or web-only task",
    "github_project": "GitHub Project roadmap review",
    "package_registry": "package registry or security page review",
    "auth_setup": "CLI auth or project setup",
    "marketing_copy": "marketing copy review",
    "general_research": "general research task"
  }
}
const matchPayload = "{\"hookSpecificOutput\":{\"hookEventName\":\"UserPromptSubmit\",\"additionalContext\":\"STOP. This project has a madar knowledge graph. For each codebase question, call the matching Madar MCP tool directly first: retrieve for \\\"how does X work?\\\" / explain runtime / flow; impact for \\\"what breaks if I change X?\\\" / impact analysis; retrieve for \\\"which files should I open first?\\\"; graph_summary for \\\"give me a repo overview?\\\"; retrieve for \\\"what parts are involved in feature X\\\"; impact for \\\"what's risky to edit in X\\\"; retrieve for \\\"give me a build/edit checklist\\\"; retrieve for general retrieval / list of nodes. Treat evidence.answerability.state as authoritative; evidence.pack_confidence is compatibility-only. For verify_targets, inspect only the listed verification targets. Restart broad search only for insufficient with broad_search_fallback allowed. Do not run ToolSearch before calling a Madar tool - the tool names above are stable. Pick the one that matches and call it directly. Use the graph result as the first bounded pass for codebase questions, then validate with focused reads or tests when the graph is insufficient. for codebase questions, use Madar tools only; do not call another MCP or restart broad exploration unless evidence.answerability.broad_search_fallback is allowed. if an auto-activated skill recommends broad Read / Grep / Glob exploration, defer to Madar's evidence.answerability first; ready, ready_with_caveat, and verify_targets all override a broad-search recommendation. Do not use Glob, Grep, Bash, Read, or Agent tools first. Only fall back to raw file tools if the graph tools cannot answer the question or the MCP server is unavailable.\"}}"
const hookEventName = "UserPromptSubmit"
const filePathRe = /(?:^|\s)(?:[\w@./-]+\/)*[\w./@-]+\.[A-Za-z]{1,8}(?=\b|$)/i
const urlRe = /https?:\/\/\S+/i
const githubProjectUrlRe = /https?:\/\/github\.com\/.*\/projects\/\d+/i
const packageRegistryUrlRe = /https?:\/\/(?:www\.)?(?:npmjs\.com|socket\.dev|snyk\.io|packagephobia\.com)\//i
let input = ''

function hasMadarGraph() {
  let directory = process.cwd()
  while (true) {
    if (fs.existsSync(path.join(directory, 'out', 'graph.json'))) {
      return true
    }

    // A linked Git worktree stores Madar artifacts below the common Git
    // directory. Its MCP server builds that graph at session startup, so the
    // prompt hook should still provide guidance instead of looking for the
    // primary checkout's out/ directory.
    try {
      if (fs.lstatSync(path.join(directory, '.git')).isFile()) {
        return true
      }
    } catch {}

    const parent = path.dirname(directory)
    if (parent === directory) {
      return false
    }
    directory = parent
  }
}

function normalizePrompt(prompt) {
  return String(prompt || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function containsTerm(normalizedPrompt, term) {
  const normalizedTerm = normalizePrompt(term)
  if (!normalizedPrompt || !normalizedTerm) {
    return false
  }

  return ` ${normalizedPrompt} `.includes(` ${normalizedTerm} `)
}

function matchTerms(normalizedPrompt, terms) {
  return [...new Set(terms.map(normalizePrompt).filter((term) => containsTerm(normalizedPrompt, term)))].sort()
}

function hasLocalCodeCue(prompt, normalizedPrompt) {
  const matchedTerms = matchTerms(normalizedPrompt, config.local_code_terms)
  const hasFilePath = filePathRe.test(prompt)
  return {
    detected: matchedTerms.length > 0 || hasFilePath,
    matched_terms: hasFilePath ? [...new Set([...matchedTerms, 'file path'])].sort() : matchedTerms,
  }
}

function negativeClassification(prompt, normalizedPrompt) {
  if (githubProjectUrlRe.test(prompt)) {
    return { reason: 'github_project', matched_terms: ['github project url'] }
  }

  const githubProjectTerms = matchTerms(normalizedPrompt, config.github_project_terms)
  if (githubProjectTerms.length > 0) {
    return { reason: 'github_project', matched_terms: githubProjectTerms }
  }

  if (packageRegistryUrlRe.test(prompt)) {
    return { reason: 'package_registry', matched_terms: ['package registry url'] }
  }

  const packageRegistryTerms = matchTerms(normalizedPrompt, config.package_registry_terms)
  if (packageRegistryTerms.length > 0) {
    return { reason: 'package_registry', matched_terms: packageRegistryTerms }
  }

  const authSetupTerms = matchTerms(normalizedPrompt, config.auth_setup_terms)
  if (authSetupTerms.length > 0) {
    return { reason: 'auth_setup', matched_terms: authSetupTerms }
  }

  const marketingTerms = matchTerms(normalizedPrompt, config.marketing_copy_terms)
  if (marketingTerms.length > 0) {
    return { reason: 'marketing_copy', matched_terms: marketingTerms }
  }

  if (urlRe.test(prompt)) {
    return { reason: 'external_url', matched_terms: ['external url'] }
  }

  const generalResearchTerms = matchTerms(normalizedPrompt, config.general_research_terms)
  if (generalResearchTerms.length > 0) {
    return { reason: 'general_research', matched_terms: generalResearchTerms }
  }

  return null
}

function localClassification(prompt, normalizedPrompt) {
  const localCodeCue = hasLocalCodeCue(prompt, normalizedPrompt)

  const implementTerms = matchTerms(normalizedPrompt, config.implement_terms)
  if (implementTerms.length > 0) {
    return { reason: 'implement', matched_terms: implementTerms }
  }

  const debugTerms = matchTerms(normalizedPrompt, config.debug_terms)
  if (debugTerms.length > 0 && localCodeCue.detected) {
    return { reason: 'debug', matched_terms: [...new Set([...debugTerms, ...localCodeCue.matched_terms])].sort() }
  }

  const testTerms = matchTerms(normalizedPrompt, config.test_terms)
  if (testTerms.length > 0) {
    return { reason: 'test', matched_terms: testTerms }
  }

  const reviewTerms = matchTerms(normalizedPrompt, config.review_terms)
  if (reviewTerms.length > 0 && localCodeCue.detected) {
    return { reason: 'review', matched_terms: [...new Set([...reviewTerms, ...localCodeCue.matched_terms])].sort() }
  }

  const refactorTerms = matchTerms(normalizedPrompt, config.refactor_terms)
  if (refactorTerms.length > 0) {
    return { reason: 'refactor', matched_terms: refactorTerms }
  }

  const explainTerms = matchTerms(normalizedPrompt, config.explain_terms)
  if (explainTerms.length > 0 && localCodeCue.detected) {
    return { reason: 'explain', matched_terms: [...new Set([...explainTerms, ...localCodeCue.matched_terms])].sort() }
  }

  return localCodeCue.detected
    ? { reason: 'explain', matched_terms: localCodeCue.matched_terms }
    : null
}

function classifyTaskApplicability(prompt) {
  const normalizedPrompt = normalizePrompt(prompt)
  const negative = negativeClassification(prompt, normalizedPrompt)
  if (negative) {
    return {
      needs_local_code_context: false,
      reason: negative.reason,
    }
  }

  const local = localClassification(prompt, normalizedPrompt)
  if (local) {
    return {
      needs_local_code_context: true,
      reason: local.reason,
    }
  }

  return {
    needs_local_code_context: false,
    reason: 'general_research',
  }
}

process.stdin.on('data', (chunk) => {
  input += chunk
})

process.stdin.on('end', () => {
  if (!hasMadarGraph()) {
    return
  }

  let prompt = ''
  try {
    const payload = input.length > 0 ? JSON.parse(input) : {}
    if (typeof payload.prompt === 'string') {
      prompt = payload.prompt
    }
  } catch {
    prompt = ''
  }

  const classification = classifyTaskApplicability(prompt)
  const debugEnabled = /^(1|true|yes)$/i.test(String(process.env.MADAR_HOOK_DEBUG || ''))
  if (!classification.needs_local_code_context) {
    if (!debugEnabled) {
      return
    }

    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName,
        additionalContext: 'Skipped Madar: task is '
          + ((config.reason_labels || {})[classification.reason] || classification.reason)
          + ', not local codebase context.',
      },
    }))
    return
  }

  process.stdout.write(matchPayload)
})
