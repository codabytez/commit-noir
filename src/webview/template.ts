import { CommitResult, CommitIssue, OversizedFile } from "../types";
import { isHookInstalled } from "../core/hookInstaller";

function scoreBar(score: number): string {
  const filled = Math.round(score / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

function scoreColor(score: number): string {
  if (score >= 80) return "#00CC44";
  if (score >= 60) return "#FFAA00";
  return "#FF4444";
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString();
}

function issueTypeTag(type: string): string {
  const map: Record<string, { label: string; color: string }> = {
    secret: { label: "SECRET", color: "#FF4444" },
    console_log: { label: "CONSOLE", color: "#FFAA00" },
    debug_statement: { label: "CONSOLE", color: "#FFAA00" },
    todo: { label: "TODO", color: "#555555" },
    fixme: { label: "FIXME", color: "#FFAA00" },
    oversized_file: { label: "OVERSIZED", color: "#FFAA00" },
  };
  const entry = map[type] ?? { label: type.toUpperCase(), color: "#555555" };
  return `<span style="color:${entry.color};border:1px solid ${entry.color};padding:1px 6px;font-size:10px;">[${entry.label}]</span>`;
}

function severityBadge(severity: string): string {
  const color =
    severity === "critical"
      ? "#FF4444"
      : severity === "warn"
      ? "#FFAA00"
      : "#555555";
  return `<span style="color:${color};font-size:10px;">[${severity.toUpperCase()}]</span>`;
}

function issueCards(issues: CommitIssue[]): string {
  if (issues.length === 0) return "";
  return issues
    .map(
      (issue) => `
    <div class="issue-card" data-type="${issue.type}">
      <div class="issue-header">
        ${severityBadge(issue.severity)}
        ${issueTypeTag(issue.type)}
        <a class="file-link" href="#" onclick="openFile('${escapeHtml(issue.file)}', ${issue.line ?? 1}); return false;">
          ${escapeHtml(issue.file)}:${issue.line ?? "?"}
        </a>
      </div>
      <div class="issue-desc">${escapeHtml(issue.description)}</div>
      <div class="issue-match">→ ${escapeHtml(issue.match.slice(0, 80))}</div>
    </div>`
    )
    .join("\n");
}

function oversizedSection(files: OversizedFile[]): string {
  if (files.length === 0) return "";
  const rows = files
    .map(
      (f) =>
        `<div class="oversized-row">
      <span style="color:#AAAAAA;">${escapeHtml(f.file)}</span>
      <span style="color:#FFAA00;"> — ${(f.sizeKB / 1024).toFixed(1)}MB (limit: ${f.limitKB}KB)</span>
    </div>`
    )
    .join("\n");
  return `
  <div class="section">
    <div class="section-title">OVERSIZED FILES</div>
    ${rows}
  </div>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function getWebviewContent(result: CommitResult | null): string {
  const hookActive = isHookInstalled();
  const hookStatus = hookActive
    ? `<span style="color:#00CC44;">● HOOK ACTIVE</span>`
    : `<span style="color:#FF4444;">○ HOOK NOT INSTALLED</span>`;

  if (!result) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Commit Noir</title>
${commonStyles()}
</head>
<body>
  <div class="topbar">
    <span class="title">COMMIT-NOIR</span>
  </div>
  <div class="empty-state">
    ▸ NO SCAN YET — run a git commit to trigger
  </div>
  <div class="hook-status">${hookStatus}</div>
</body>
</html>`;
  }

  const { score, passed, threshold, timestamp, filesScanned, issues, oversizedFiles, breakdown, blocked } = result;

  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warnCount = issues.filter((i) => i.severity === "warn").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  const secrets = issues.filter((i) => i.type === "secret").length;
  const consoleLogs = issues.filter((i) => i.type === "console_log" || i.type === "debug_statement").length;
  const todos = issues.filter((i) => i.type === "todo" || i.type === "fixme").length;

  const color = scoreColor(score);

  const bannerStyle = blocked
    ? `background:#1A0000;color:#FF4444;`
    : `background:#001A08;color:#00CC44;`;
  const bannerText = blocked ? "✗ COMMIT BLOCKED" : "✓ COMMIT APPROVED";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Commit Noir</title>
${commonStyles()}
</head>
<body>

<div class="topbar">
  <span class="title">COMMIT-NOIR</span>
  <span class="badge" style="background:${passed ? "#00CC44" : "#FF4444"};color:#080808;">${passed ? "PASS" : "FAIL"}</span>
  <span class="ts">${formatTimestamp(timestamp)}</span>
</div>

<div class="section">
  <div class="score-bar" style="color:${color};">[${scoreBar(score)}] ${score}/100</div>
  <div class="muted">threshold: ${threshold}</div>
</div>

<div class="section">
  <div class="section-title">SCORE BREAKDOWN</div>
  <div class="breakdown">
    <div class="breakdown-row"><span>BASE</span><span>100</span></div>
    <div class="breakdown-row"><span style="color:#FF4444;">Secrets</span><span>- ${breakdown.secretsDeduction.toString().padStart(3)} &nbsp;(${secrets} found)</span></div>
    <div class="breakdown-row"><span style="color:#FFAA00;">console.log</span><span>- ${breakdown.consoleLogDeduction.toString().padStart(3)} &nbsp;(${consoleLogs} found)</span></div>
    <div class="breakdown-row"><span style="color:#555555;">TODOs</span><span>- ${breakdown.todoDeduction.toString().padStart(3)} &nbsp;(${todos} found)</span></div>
    <div class="breakdown-row"><span style="color:#FFAA00;">Oversized</span><span>- ${breakdown.oversizedDeduction.toString().padStart(3)} &nbsp;(${oversizedFiles.length} found)</span></div>
    <div class="breakdown-divider">─────────────────────────</div>
    <div class="breakdown-row"><span style="color:${color};">FINAL</span><span style="color:${color};">${score}</span></div>
  </div>
</div>

<div class="section stats-row">
  <span style="color:#FF4444;">CRITICAL: ${criticalCount}</span>
  <span class="muted">|</span>
  <span style="color:#FFAA00;">WARN: ${warnCount}</span>
  <span class="muted">|</span>
  <span style="color:#555555;">INFO: ${infoCount}</span>
  <span class="muted">|</span>
  <span style="color:#AAAAAA;">FILES: ${filesScanned}</span>
</div>

<div class="banner" style="${bannerStyle}">${bannerText}</div>

<div class="section">
  <div class="filter-tabs">
    <button class="tab active" onclick="filter('all')">ALL</button>
    <button class="tab" onclick="filter('secret')">SECRETS</button>
    <button class="tab" onclick="filter('console_log')">CONSOLE</button>
    <button class="tab" onclick="filter('todo')">TODOS</button>
    <button class="tab" onclick="filter('oversized_file')">OVERSIZED</button>
  </div>
</div>

<div class="section" id="issues-container">
  ${issueCards(issues)}
  ${issues.length === 0 ? '<div class="muted">No issues found.</div>' : ""}
</div>

${oversizedSection(oversizedFiles)}

<div class="hook-status">${hookStatus}</div>

<script>
  const vscode = acquireVsCodeApi();

  function openFile(file, line) {
    vscode.postMessage({ command: 'openFile', file, line });
  }

  function filter(type) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    const cards = document.querySelectorAll('.issue-card');
    cards.forEach(card => {
      if (type === 'all') {
        card.style.display = '';
      } else if (type === 'console_log') {
        const t = card.dataset.type;
        card.style.display = (t === 'console_log' || t === 'debug_statement') ? '' : 'none';
      } else if (type === 'todo') {
        const t = card.dataset.type;
        card.style.display = (t === 'todo' || t === 'fixme') ? '' : 'none';
      } else {
        card.style.display = card.dataset.type === type ? '' : 'none';
      }
    });
  }
</script>
</body>
</html>`;
}

function commonStyles(): string {
  return `<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #080808;
    color: #AAAAAA;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.6;
    padding-bottom: 60px;
  }

  body::after {
    content: "";
    position: fixed;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.03) 2px,
      rgba(0,0,0,0.03) 4px
    );
    pointer-events: none;
    z-index: 9999;
  }

  .topbar {
    background: #0D0D0D;
    border-bottom: 1px solid #1E1E1E;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .title {
    color: #00CC44;
    font-weight: bold;
    font-size: 14px;
    letter-spacing: 2px;
  }

  .badge {
    font-size: 10px;
    font-weight: bold;
    padding: 2px 8px;
    letter-spacing: 1px;
  }

  .ts {
    color: #555555;
    font-size: 11px;
    margin-left: auto;
  }

  .section {
    padding: 14px 16px;
    border-bottom: 1px solid #1E1E1E;
  }

  .section-title {
    color: #555555;
    font-size: 10px;
    letter-spacing: 2px;
    margin-bottom: 10px;
  }

  .score-bar {
    font-size: 18px;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }

  .muted { color: #555555; }

  .breakdown {
    background: #111111;
    border: 1px solid #1E1E1E;
    padding: 12px 16px;
  }

  .breakdown-row {
    display: flex;
    justify-content: space-between;
    padding: 2px 0;
  }

  .breakdown-divider {
    color: #1E1E1E;
    margin: 6px 0;
  }

  .stats-row {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .banner {
    padding: 14px 16px;
    font-size: 15px;
    font-weight: bold;
    letter-spacing: 2px;
    text-align: center;
    border-top: 1px solid #1E1E1E;
    border-bottom: 1px solid #1E1E1E;
  }

  .filter-tabs {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .tab {
    background: #111111;
    color: #555555;
    border: 1px solid #1E1E1E;
    padding: 4px 12px;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    cursor: pointer;
    letter-spacing: 1px;
  }

  .tab:hover { color: #AAAAAA; border-color: #555555; }

  .tab.active {
    color: #00CC44;
    border-color: #00CC44;
    background: #001A08;
  }

  .issue-card {
    background: #111111;
    border: 1px solid #1E1E1E;
    padding: 12px;
    margin-bottom: 8px;
  }

  .issue-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    flex-wrap: wrap;
  }

  .file-link {
    color: #AAAAAA;
    text-decoration: none;
    font-size: 11px;
    border-bottom: 1px solid #333333;
  }

  .file-link:hover { color: #00CC44; border-color: #00CC44; }

  .issue-desc {
    color: #555555;
    font-size: 11px;
    margin-bottom: 4px;
  }

  .issue-match {
    color: #444444;
    font-size: 11px;
    word-break: break-all;
  }

  .oversized-row {
    padding: 4px 0;
    font-size: 12px;
  }

  .empty-state {
    padding: 40px 16px;
    color: #555555;
    text-align: center;
    font-size: 14px;
    letter-spacing: 1px;
  }

  .hook-status {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #0D0D0D;
    border-top: 1px solid #1E1E1E;
    padding: 8px 16px;
    font-size: 11px;
    letter-spacing: 1px;
  }
</style>`;
}
