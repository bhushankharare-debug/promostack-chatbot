import { readFile } from "node:fs/promises";
import path from "node:path";

export class DataAccessError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "DataAccessError";
  }
}

const cache = new Map<string, unknown>();

/**
 * Reads and parses one of the static POC data files from the project root.
 * This is the only place in the codebase that touches the raw JSON files —
 * everything else goes through a repository interface backed by an
 * internal API route.
 */
export async function readJsonFile<T>(filename: string): Promise<T> {
  const cached = cache.get(filename);
  if (cached) {
    return cached as T;
  }

  const filePath = path.join(/* turbopackIgnore: true */ process.cwd(), filename);

  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch (error) {
    throw new DataAccessError(`Failed to read data file: ${filename}`, error);
  }

  let parsed: T;
  try {
    parsed = JSON.parse(raw) as T;
  } catch (error) {
    throw new DataAccessError(`Failed to parse data file as JSON: ${filename}`, error);
  }

  cache.set(filename, parsed);
  return parsed;
}
