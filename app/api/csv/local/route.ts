import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.resolve(process.cwd(), "public", "data");

function safeResolve(rel: string): string | null {
  const normalized = path.normalize(rel).replace(/^[\\/]+/, "");
  const joined = path.resolve(DATA_DIR, normalized);
  if (!joined.startsWith(DATA_DIR)) return null;
  return joined;
}

export async function GET(request: NextRequest) {
  const file = request.nextUrl.searchParams.get("file");

  if (!file) {
    return NextResponse.json(
      {
        error: "Missing file parameter. Usage: /api/csv/local?file=<path_relative_to_public/data>",
      },
      { status: 400 }
    );
  }

  if (!file.toLowerCase().endsWith(".csv")) {
    return NextResponse.json({ error: "Only .csv files are supported" }, { status: 400 });
  }

  const filePath = safeResolve(file);
  if (!filePath) {
    return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
  }

  try {
    const content = await readFile(filePath, "utf-8");
    return NextResponse.json({
      fileName: path.basename(file),
      content,
      source: `local:${path.relative(DATA_DIR, filePath)}`,
    });
  } catch {
    return NextResponse.json(
      { error: `File not found: ${file}` },
      { status: 404 }
    );
  }
}
