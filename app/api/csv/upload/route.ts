import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.resolve(process.cwd(), "public", "data");
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_FILES = 20;

function safeResolve(rel: string): string | null {
  const normalized = path.normalize(rel).replace(/^[\\/]+/, "");
  const joined = path.resolve(DATA_DIR, normalized);
  if (!joined.startsWith(DATA_DIR)) return null;
  return joined;
}

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Cannot parse form — make sure to use multipart/form-data" },
      { status: 400 }
    );
  }

  const destination = (formData.get("destination") as string) ?? "";
  const overwrite = formData.get("overwrite") === "true";
  const files = formData.getAll("file") as File[];

  if (!files || files.length === 0) {
    return NextResponse.json(
      { error: "No files received" },
      { status: 400 }
    );
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Max ${MAX_FILES} files per upload` },
      { status: 400 }
    );
  }

  const destDir = destination.trim() ? safeResolve(destination.trim()) : DATA_DIR;
  if (!destDir) {
    return NextResponse.json({ error: "Invalid destination path" }, { status: 400 });
  }

  const results: { fileName: string; path: string; size: number; status: "ok" | "skipped" | "error"; reason?: string }[] = [];

  let dirReady = false;

  for (const file of files) {
    const fileName = file.name;

    if (!fileName.toLowerCase().endsWith(".csv")) {
      results.push({
        fileName,
        path: path.relative(DATA_DIR, destDir)
          ? `${path.relative(DATA_DIR, destDir)}/${fileName}`
          : fileName,
        size: file.size,
        status: "error",
        reason: "Only .csv files are supported",
      });
      continue;
    }

    if (file.size > MAX_FILE_SIZE) {
      results.push({
        fileName,
        path: fileName,
        size: file.size,
        status: "error",
        reason: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
      });
      continue;
    }

    const targetPath = path.join(destDir, fileName);

    let exists = false;
    try {
      await stat(targetPath);
      exists = true;
    } catch {
      exists = false;
    }

    if (exists && !overwrite) {
      results.push({
        fileName,
        path: path.relative(DATA_DIR, targetPath),
        size: file.size,
        status: "skipped",
        reason: "File exists — send overwrite=true to replace",
      });
      continue;
    }

    try {
      if (!dirReady) {
        await mkdir(destDir, { recursive: true });
        dirReady = true;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(targetPath, buffer, "utf-8");

      results.push({
        fileName,
        path: path.relative(DATA_DIR, targetPath),
        size: file.size,
        status: "ok",
      });
    } catch (err) {
      results.push({
        fileName,
        path: path.relative(DATA_DIR, targetPath),
        size: file.size,
        status: "error",
        reason: err instanceof Error ? err.message : "Write failed",
      });
    }
  }

  const summary = {
    total: files.length,
    ok: results.filter((r) => r.status === "ok").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    error: results.filter((r) => r.status === "error").length,
  };

  const hasAnyOk = summary.ok > 0;
  const hasOnlyErrors = summary.ok === 0 && summary.skipped === 0;

  return NextResponse.json(
    {
      message: hasAnyOk
        ? `Uploaded ${summary.ok} file${summary.ok !== 1 ? "s" : ""} successfully`
        : "No files were uploaded",
      results,
      summary,
    },
    { status: hasOnlyErrors ? 400 : 200 }
  );
}
