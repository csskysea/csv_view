import { NextRequest, NextResponse } from "next/server";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.resolve(process.cwd(), "public", "data");

export interface DirEntry {
  name: string;
  path: string;
  type: "dir" | "file";
  size?: number;
  children?: DirEntry[];
}

async function buildTree(current: string, base: string): Promise<DirEntry[]> {
  const entries = await readdir(current);
  const result: DirEntry[] = [];

  for (const name of entries) {
    const fullPath = path.join(current, name);
    let info;
    try {
      info = await stat(fullPath);
    } catch {
      continue;
    }

    const relPath = path.relative(base, fullPath);

    if (info.isDirectory()) {
      result.push({
        name,
        path: relPath,
        type: "dir",
        children: await buildTree(fullPath, base),
      });
    } else if (info.isFile() && name.toLowerCase().endsWith(".csv")) {
      result.push({
        name,
        path: relPath,
        type: "file",
        size: info.size,
      });
    }
  }

  result.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return result;
}

export async function GET(request: NextRequest) {
  const recursive =
    request.nextUrl.searchParams.get("recursive") !== "false";

  try {
    if (recursive) {
      const tree = await buildTree(DATA_DIR, DATA_DIR);
      return NextResponse.json({ tree, base: "public/data" });
    }

    const entries = await readdir(DATA_DIR);
    const flat: DirEntry[] = [];
    for (const name of entries) {
      const full = path.join(DATA_DIR, name);
      let info;
      try {
        info = await stat(full);
      } catch {
        continue;
      }
      if (info.isDirectory()) {
        flat.push({ name, path: name, type: "dir" });
      } else if (info.isFile() && name.toLowerCase().endsWith(".csv")) {
        flat.push({ name, path: name, type: "file", size: info.size });
      }
    }
    flat.sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return NextResponse.json({ entries: flat, base: "public/data" });
  } catch (err) {
    return NextResponse.json(
      {
        error: `Failed to read directory: ${err instanceof Error ? err.message : "unknown error"}`,
      },
      { status: 500 }
    );
  }
}
