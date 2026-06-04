# Commit Noir — Git Commit Quality Guard

> Terminal Noir pre-commit scanner with VS Code UI. Catch secrets, debug logs, and TODOs before they hit your repo.

![Version](https://img.shields.io/badge/version-1.0.0-green) ![VS Code](https://img.shields.io/badge/vscode-%5E1.85.0-blue) ![License](https://img.shields.io/badge/license-MIT-gray)

---

## What it does

Commit Noir is a two-part system:

1. **A Git pre-commit hook** — scans your staged diff before every `git commit`, scores the commit quality (0–100), and blocks commits that don't meet the threshold.
2. **A VS Code panel** — displays the last scan result in a Terminal Noir UI that auto-refreshes the moment a commit scan completes.

```text
git commit
    ↓
pre-commit hook scans staged diff
    ↓
scores the commit (0–100)
    ↓
blocks if score < threshold OR secrets found
    ↓
VS Code panel updates automatically
```

---

## Getting Started

### 1. Install the extension

Install from the `.vsix` file:

```text
Extensions → ⋯ → Install from VSIX
```

### 2. Install the hook

Open any git repo in VS Code. You'll see a prompt:

> _"Commit Noir: No pre-commit hook detected. Install it now?"_

Click **Install Hook** — or run it manually via the Command Palette:

```text
Cmd+Shift+P → Commit Noir: Install Git Hook
```

### 3. Commit as normal

```bash
git add .
git commit -m "your message"
```

The hook runs automatically. If issues are found, the commit is blocked with a clear explanation.

### 4. View the panel

```text
Cmd+Shift+P → Commit Noir: Show Last Commit Score
```

The panel opens beside your editor and auto-refreshes after every commit scan.

---

## Scoring

| Issue                      | Deduction | Cap |
| -------------------------- | --------- | --- |
| Secret / API key           | -20 each  | -60 |
| `console.log` / `debugger` | -3 each   | -30 |
| TODO / FIXME / HACK        | -2 each   | -20 |
| Oversized file             | -10 each  | -30 |

**Secrets always block** — a commit with an exposed API key is rejected regardless of overall score.

Default threshold: **70/100**

---

## What gets detected

### Secrets

- API keys (`apiKey = "..."`)
- OpenAI keys (`sk-...`)
- Google API keys (`AIza...`)
- GitHub PATs (`ghp_...`)
- Slack tokens (`xox...`)
- Hardcoded passwords
- Private keys (`-----BEGIN ... PRIVATE KEY-----`)
- AWS secret access keys

### Debug statements

- `console.log/warn/error/debug/info/trace`
- `debugger;`
- `System.out.println` (Java)

### TODO comments

- `// TODO`, `// FIXME`, `// HACK`, `// XXX`, `// BUG`, `// NOCOMMIT`

### Oversized files

- Any staged file exceeding the configured size limit (default: 500KB)

---

## Configuration

Settings are available under `Commit Noir` in VS Code settings, or via a `.commit-noir.json` file at your project root:

```json
{
  "scoreThreshold": 70,
  "blockOnFail": true,
  "maxFileSizeKB": 500,
  "ignorePaths": [
    "*.lock",
    "dist/",
    "build/",
    "*.min.js",
    "pnpm-lock.yaml",
    "package-lock.json"
  ]
}
```

| Option           | Default   | Description                             |
| ---------------- | --------- | --------------------------------------- |
| `scoreThreshold` | `70`      | Minimum score to allow a commit         |
| `blockOnFail`    | `true`    | Set to `false` to warn without blocking |
| `maxFileSizeKB`  | `500`     | Files larger than this are flagged      |
| `ignorePaths`    | see above | Glob patterns excluded from scanning    |

---

## Commands

| Command                               | Description                                    |
| ------------------------------------- | ---------------------------------------------- |
| `Commit Noir: Show Last Commit Score` | Open the Terminal Noir results panel           |
| `Commit Noir: Install Git Hook`       | Install the pre-commit hook into `.git/hooks/` |
| `Commit Noir: Uninstall Git Hook`     | Remove the hook                                |

---

## Bypass

To skip the hook for a single commit:

```bash
git commit --no-verify -m "your message"
```

---

## Terminal Output Example

```text
──────────────────────────────────
▸ COMMIT-NOIR  Pre-commit scan
Score: [████████░░] 75/100
Threshold: 70/100

Issues:
  ✗ 1 secret(s) detected
  ✗ 2 console.log(s)
  ✗ 1 TODO/FIXME comment(s)

  [CRITICAL] src/config.ts:14
  API Key exposed in source code
  → apiKey = "sk-abc123..."

──────────────────────────────────
✗ Commit blocked. Secrets detected — remove them before committing.
Fix issues or run: git commit --no-verify to bypass
```

---

## License

MIT — [codabytez](https://github.com/codabytez)
