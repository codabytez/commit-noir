import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { CommitResult } from "../types";

const RESULT_FILE = path.join(os.tmpdir(), "commit-noir", "last-result.json");

export function readLastResult(): CommitResult | null {
  if (!fs.existsSync(RESULT_FILE)) return null;
  try {
    const raw = fs.readFileSync(RESULT_FILE, "utf8");
    return JSON.parse(raw) as CommitResult;
  } catch {
    return null;
  }
}

export function watchResult(
  callback: (result: CommitResult) => void
): fs.FSWatcher {
  const dir = path.dirname(RESULT_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return fs.watch(dir, (event, filename) => {
    if (filename === "last-result.json") {
      const result = readLastResult();
      if (result) callback(result);
    }
  });
}
