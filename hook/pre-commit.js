#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

// ── CONFIG ────────────────────────────────────────────────────────────
const CONFIG_FILE = path.join(process.cwd(), ".commit-noir.json");
let config = {
  scoreThreshold: 70,
  blockOnFail: true,
  maxFileSizeKB: 500,
  ignorePaths: ["*.lock", "dist/", "build/", "*.min.js"],
};
if (fs.existsSync(CONFIG_FILE)) {
  try {
    Object.assign(config, JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")));
  } catch (e) {
    /* use defaults */
  }
}

// ── OUTPUT DIR ────────────────────────────────────────────────────────
const OUT_DIR = path.join(os.tmpdir(), "commit-noir");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ── HELPERS ───────────────────────────────────────────────────────────
function shouldIgnore(filePath) {
  return config.ignorePaths.some((pattern) => {
    if (pattern.endsWith("/")) return filePath.startsWith(pattern);
    if (pattern.startsWith("*.")) return filePath.endsWith(pattern.slice(1));
    return filePath.includes(pattern);
  });
}

function uid() {
  return crypto.randomBytes(4).toString("hex");
}

// ── SECRET PATTERNS ───────────────────────────────────────────────────
const SECRET_PATTERNS = [
  {
    pattern:
      /['"]?[Aa][Pp][Ii][_-]?[Kk][Ee][Yy]['"]?\s*[:=]\s*['"][\w\-]{20,}['"]/g,
    label: "API Key",
  },
  {
    pattern: /['"]?[Ss][Ee][Cc][Rr][Ee][Tt]['"]?\s*[:=]\s*['"][\w\-]{16,}['"]/g,
    label: "Secret",
  },
  { pattern: /sk-[a-zA-Z0-9]{32,}/g, label: "OpenAI Key" },
  { pattern: /AIza[0-9A-Za-z\-_]{35}/g, label: "Google API Key" },
  { pattern: /ghp_[a-zA-Z0-9]{36}/g, label: "GitHub PAT" },
  { pattern: /xox[baprs]-[0-9a-zA-Z]{10,}/g, label: "Slack Token" },
  {
    pattern: /[Pp][Aa][Ss][Ss][Ww][Oo][Rr][Dd]\s*[:=]\s*['"][^'"]{6,}['"]/g,
    label: "Hardcoded Password",
  },
  {
    pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    label: "Private Key",
  },
  {
    pattern:
      /[Aa][Ww][Ss]_[Ss][Ee][Cc][Rr][Ee][Tt]_[Aa][Cc][Cc][Ee][Ss][Ss]_[Kk][Ee][Yy]\s*[:=]\s*['"][\w\/+]{40}['"]/g,
    label: "AWS Secret Key",
  },
];

// ── CONSOLE.LOG PATTERNS ──────────────────────────────────────────────
const CONSOLE_PATTERNS = [
  /console\.(log|warn|error|debug|info|trace)\s*\(/g,
  /System\.out\.println\s*\(/g,
  /print\s*\(/g,
  /debugger;/g,
];

// ── TODO PATTERNS ─────────────────────────────────────────────────────
const TODO_PATTERNS = [
  /\/\/\s*(TODO|FIXME|HACK|XXX|BUG|NOCOMMIT)(\s*:|\s+)/gi,
  /#\s*(TODO|FIXME|HACK|XXX|BUG|NOCOMMIT)(\s*:|\s+)/gi,
];

// ── SCAN ──────────────────────────────────────────────────────────────
function scanDiff() {
  let diff = "";
  try {
    diff = execSync("git diff --staged", { encoding: "utf8" });
  } catch (e) {
    process.exit(0); // No git, let commit through
  }

  if (!diff.trim()) process.exit(0); // Nothing staged

  const issues = [];
  const oversizedFiles = [];

  const fileChunks = diff.split(/^diff --git /m).filter(Boolean);

  for (const chunk of fileChunks) {
    const fileMatch = chunk.match(/^a\/(.*?) b\/(.*?)$/m);
    if (!fileMatch) continue;
    const filePath = fileMatch[2];
    if (shouldIgnore(filePath)) continue;

    // Check file size
    try {
      const fullPath = path.join(process.cwd(), filePath);
      if (fs.existsSync(fullPath)) {
        const sizeKB = fs.statSync(fullPath).size / 1024;
        if (sizeKB > config.maxFileSizeKB) {
          oversizedFiles.push({
            file: filePath,
            sizeKB: Math.round(sizeKB),
            limitKB: config.maxFileSizeKB,
          });
        }
      }
    } catch (e) {
      /* skip */
    }

    // Only scan added lines (lines starting with +, not ++)
    const addedLines = chunk
      .split("\n")
      .map((line, i) => ({ line, i }))
      .filter(({ line }) => line.startsWith("+") && !line.startsWith("+++"));

    let lineNum = 1;
    const hunkMatches = [
      ...chunk.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/gm),
    ];

    // Seed lineNum from first hunk header if present
    if (hunkMatches.length > 0) {
      lineNum = parseInt(hunkMatches[0][1], 10);
    }

    for (const { line } of addedLines) {
      const content = line.slice(1); // Strip leading '+'

      // Secrets
      for (const { pattern, label } of SECRET_PATTERNS) {
        pattern.lastIndex = 0;
        const match = pattern.exec(content);
        if (match) {
          issues.push({
            id: uid(),
            severity: "critical",
            type: "secret",
            file: filePath,
            line: lineNum,
            match: match[0].slice(0, 60),
            description: `${label} exposed in source code`,
          });
        }
      }

      // Console logs
      for (const pattern of CONSOLE_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(content)) {
          issues.push({
            id: uid(),
            severity: "warn",
            type: "console_log",
            file: filePath,
            line: lineNum,
            match: content.trim().slice(0, 60),
            description: "Debug statement left in code",
          });
          break;
        }
      }

      // TODOs
      for (const pattern of TODO_PATTERNS) {
        pattern.lastIndex = 0;
        const match = pattern.exec(content);
        if (match) {
          issues.push({
            id: uid(),
            severity: "info",
            type: "todo",
            file: filePath,
            line: lineNum,
            match: content.trim().slice(0, 60),
            description: `Unresolved ${match[1].toUpperCase()} comment`,
          });
          break;
        }
      }

      lineNum++;
    }
  }

  return { issues, oversizedFiles, filesScanned: fileChunks.length };
}

// ── SCORE ─────────────────────────────────────────────────────────────
function calculateScore(issues, oversizedFiles) {
  const secrets = issues.filter((i) => i.type === "secret").length;
  const consoleLogs = issues.filter((i) => i.type === "console_log").length;
  const todos = issues.filter((i) => i.type === "todo").length;
  const oversized = oversizedFiles.length;

  const secretsDeduction = Math.min(secrets * 20, 60);
  const consoleLogDeduction = Math.min(consoleLogs * 3, 30);
  const todoDeduction = Math.min(todos * 2, 20);
  const oversizedDeduction = Math.min(oversized * 10, 30);

  const score = Math.max(
    0,
    100 - secretsDeduction - consoleLogDeduction - todoDeduction - oversizedDeduction
  );

  return {
    score,
    breakdown: {
      base: 100,
      secretsDeduction,
      consoleLogDeduction,
      todoDeduction,
      oversizedDeduction,
    },
  };
}

// ── PRINT TERMINAL OUTPUT ──────────────────────────────────────────────
function printResult(result) {
  const { score, passed, issues, oversizedFiles } = result;
  const bar =
    "█".repeat(Math.round(score / 10)) +
    "░".repeat(10 - Math.round(score / 10));
  const scoreColor =
    score >= 80 ? "\x1b[32m" : score >= 60 ? "\x1b[33m" : "\x1b[31m";
  const reset = "\x1b[0m";

  console.log("\n\x1b[90m──────────────────────────────────\x1b[0m");
  console.log("\x1b[32m▸ COMMIT-NOIR\x1b[0m  Pre-commit scan");
  console.log(
    `\x1b[90mScore:\x1b[0m ${scoreColor}[${bar}] ${score}/100${reset}`
  );
  console.log(`\x1b[90mThreshold:\x1b[0m ${result.threshold}/100`);

  if (issues.length > 0 || oversizedFiles.length > 0) {
    console.log("\n\x1b[33mIssues:\x1b[0m");
    const secrets = issues.filter((i) => i.type === "secret");
    const logs = issues.filter((i) => i.type === "console_log");
    const todos = issues.filter(
      (i) => i.type === "todo" || i.type === "fixme"
    );

    if (secrets.length)
      console.log(`  \x1b[31m✗ ${secrets.length} secret(s) detected\x1b[0m`);
    if (logs.length)
      console.log(`  \x1b[33m✗ ${logs.length} console.log(s)\x1b[0m`);
    if (todos.length)
      console.log(`  \x1b[90m✗ ${todos.length} TODO/FIXME comment(s)\x1b[0m`);
    if (oversizedFiles.length)
      console.log(
        `  \x1b[33m✗ ${oversizedFiles.length} oversized file(s)\x1b[0m`
      );

    for (const issue of issues.slice(0, 10)) {
      const color =
        issue.severity === "critical"
          ? "\x1b[31m"
          : issue.severity === "warn"
          ? "\x1b[33m"
          : "\x1b[90m";
      console.log(
        `\n  ${color}[${issue.severity.toUpperCase()}]\x1b[0m ${issue.file}:${issue.line ?? "?"}`
      );
      console.log(`  \x1b[90m${issue.description}\x1b[0m`);
      console.log(`  \x1b[90m→ ${issue.match}\x1b[0m`);
    }
    if (issues.length > 10) {
      console.log(
        `\n  \x1b[90m... and ${issues.length - 10} more issues\x1b[0m`
      );
    }
  }

  console.log("\x1b[90m──────────────────────────────────\x1b[0m");

  if (!passed) {
    if (result.hasSecrets) {
      console.log(`\x1b[31m✗ Commit blocked. Secrets detected — remove them before committing.\x1b[0m`);
    } else {
      console.log(`\x1b[31m✗ Commit blocked. Score ${score} < threshold ${result.threshold}\x1b[0m`);
    }
    console.log(
      "\x1b[90mFix issues or run: git commit --no-verify to bypass\x1b[0m\n"
    );
  } else {
    console.log("\x1b[32m✓ Commit approved\x1b[0m\n");
  }
}

// ── MAIN ──────────────────────────────────────────────────────────────
const { issues, oversizedFiles, filesScanned } = scanDiff();
const { score, breakdown } = calculateScore(issues, oversizedFiles);
const hasSecrets = issues.some((i) => i.severity === "critical");
const passed = score >= config.scoreThreshold && !hasSecrets;

const result = {
  score,
  passed,
  threshold: config.scoreThreshold,
  timestamp: Date.now(),
  filesScanned,
  issues,
  oversizedFiles,
  breakdown,
  hasSecrets,
  blocked: !passed && config.blockOnFail,
};

fs.writeFileSync(
  path.join(OUT_DIR, "last-result.json"),
  JSON.stringify(result, null, 2),
  "utf8"
);

printResult(result);

if (!passed && config.blockOnFail) {
  process.exit(1);
}

process.exit(0);
