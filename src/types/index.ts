export type IssueSeverity = "critical" | "warn" | "info";

export type IssueType =
  | "secret"
  | "console_log"
  | "todo"
  | "oversized_file"
  | "fixme"
  | "debug_statement";

export interface CommitIssue {
  id: string;
  severity: IssueSeverity;
  type: IssueType;
  file: string;
  line: number | null;
  match: string;
  description: string;
}

export interface OversizedFile {
  file: string;
  sizeKB: number;
  limitKB: number;
}

export interface ScoreBreakdown {
  base: 100;
  secretsDeduction: number;
  consoleLogDeduction: number;
  todoDeduction: number;
  oversizedDeduction: number;
}

export interface CommitResult {
  score: number;
  passed: boolean;
  threshold: number;
  timestamp: number;
  filesScanned: number;
  issues: CommitIssue[];
  oversizedFiles: OversizedFile[];
  breakdown: ScoreBreakdown;
  hasSecrets: boolean;
  blocked: boolean;
  commitMessage?: string;
}
