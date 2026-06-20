# Changelog

## [1.0.0] - 2026-06-20

### Added
- Git pre-commit hook that scans staged diffs and scores commit quality (0–100)
- Blocks commits with exposed secrets regardless of score
- Detects API keys, OpenAI/GitHub/Slack tokens, AWS credentials, and private keys
- Detects debug statements (`console.log`, `debugger`, `System.out.println`)
- Detects TODO/FIXME/HACK/NOCOMMIT comments
- Flags oversized staged files (configurable, default 500KB)
- VS Code panel with Terminal Noir UI showing last scan result
- Auto-refreshes panel after every commit scan
- `Commit Noir: Install Git Hook` command
- `Commit Noir: Uninstall Git Hook` command
- `Commit Noir: Show Last Commit Score` command
- Configurable via VS Code settings or `.commit-noir.json` at project root
