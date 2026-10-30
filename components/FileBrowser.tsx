"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface FileNode {
  name: string;
  path: string;
  type: "dir" | "file";
  size?: number;
  children?: FileNode[];
}

interface FileBrowserProps {
  onSelect: (path: string, fileName: string) => void;
  loading?: boolean;
}

function formatSize(bytes?: number): string {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function highlight(text: string, keyword: string) {
  if (!keyword.trim()) return text;
  const lower = text.toLowerCase();
  const k = keyword.toLowerCase();
  const idx = lower.indexOf(k);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-amber-200 px-0.5 text-gray-900">
        {text.slice(idx, idx + k.length)}
      </mark>
      {text.slice(idx + k.length)}
    </>
  );
}

function filterTree(nodes: FileNode[], keyword: string): FileNode[] {
  const k = keyword.toLowerCase().trim();
  if (!k) return nodes;

  const result: FileNode[] = [];
  for (const node of nodes) {
    if (node.type === "dir") {
      const filtered = filterTree(node.children ?? [], k);
      if (filtered.length > 0 || node.name.toLowerCase().includes(k)) {
        result.push({ ...node, children: filtered.length > 0 ? filtered : [] });
      }
    } else {
      if (node.name.toLowerCase().includes(k) || node.path.toLowerCase().includes(k)) {
        result.push(node);
      }
    }
  }
  return result;
}

function collectAllDirs(nodes: FileNode[], set: Set<string>) {
  for (const node of nodes) {
    if (node.type === "dir") {
      set.add(node.path);
      if (node.children) collectAllDirs(node.children, set);
    }
  }
}

function TreeItem({
  node,
  depth,
  selectedPath,
  onSelect,
  onDoubleClick,
  keyword,
  forceOpen,
}: {
  node: FileNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (n: FileNode) => void;
  onDoubleClick: (n: FileNode) => void;
  keyword: string;
  forceOpen: boolean;
}) {
  const [manualOpen, setManualOpen] = useState(depth < 1);
  const hasChildren = node.type === "dir" && node.children && node.children.length > 0;
  const open = forceOpen || manualOpen;

  const isSelected = node.type === "file" && selectedPath === node.path;

  return (
    <div>
      <div
        onClick={() => {
          if (node.type === "dir") setManualOpen((v) => !v);
          onSelect(node);
        }}
        onDoubleClick={() => {
          if (node.type === "file") onDoubleClick(node);
          else setManualOpen((v) => !v);
        }}
        className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
          isSelected
            ? "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-300"
            : "hover:bg-slate-100"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {node.type === "dir" ? (
          hasChildren ? (
            <svg
              className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform duration-150 ${
                open ? "rotate-90" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <span className="inline-block h-4 w-4 flex-shrink-0" />
          )
        ) : (
          <span className="inline-block h-4 w-4 flex-shrink-0" />
        )}

        {node.type === "dir" ? (
          <svg
            className={`h-4 w-4 flex-shrink-0 ${
              open ? "text-amber-500" : "text-amber-400"
            }`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            {open ? (
              <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v1H2V6zm0 3h20l-2 8a2 2 0 01-2 1.5H4A2 2 0 012 17V9z" />
            ) : (
              <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            )}
          </svg>
        ) : (
          <svg
            className="h-4 w-4 flex-shrink-0 text-indigo-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}

        <span className="flex-1 truncate">
          {keyword.trim()
            ? highlight(node.name, keyword)
            : node.name}
          {node.type === "file" && node.size !== undefined && (
            <span className="ml-2 text-xs text-slate-400">
              {formatSize(node.size)}
            </span>
          )}
        </span>
      </div>

      {node.type === "dir" && open && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onDoubleClick={onDoubleClick}
              keyword={keyword}
              forceOpen={forceOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type UploadResultItem = {
  fileName: string;
  path: string;
  size: number;
  status: "ok" | "skipped" | "error";
  reason?: string;
};

export default function FileBrowser({ onSelect, loading }: FileBrowserProps) {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [selected, setSelected] = useState<FileNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [keyword, setKeyword] = useState("");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadDest, setUploadDest] = useState("");
  const [uploadOverwrite, setUploadOverwrite] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    message: string;
    results: UploadResultItem[];
    ok: number;
    skipped: number;
    err: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    setFetching(true);
    fetch("/api/csv/list?recursive=true")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setTree(data.tree || []);
        }
      })
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setFetching(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  const filteredTree = useMemo(
    () => filterTree(tree, keyword),
    [tree, keyword]
  );

  const forcedOpenDirs = useMemo(() => {
    const set = new Set<string>();
    if (keyword.trim()) collectAllDirs(filteredTree, set);
    return set;
  }, [filteredTree, keyword]);

  const matchCount = useMemo(() => {
    let count = 0;
    const walk = (nodes: FileNode[]) => {
      for (const n of nodes) {
        if (n.type === "file") count++;
        if (n.children) walk(n.children);
      }
    };
    walk(filteredTree);
    return count;
  }, [filteredTree]);

  const dirOptions = useMemo(() => {
    const dirs: string[] = [""];
    const add = (nodes: FileNode[]) => {
      for (const n of nodes) {
        if (n.type === "dir") {
          dirs.push(n.path);
          if (n.children) add(n.children);
        }
      }
    };
    add(tree);
    return dirs;
  }, [tree]);

  const handleConfirm = () => {
    if (selected && selected.type === "file") {
      onSelect(selected.path, selected.name);
    }
  };

  const onBrowseFiles = () => {
    fileInputRef.current?.click();
  };

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list) return;
    const arr = Array.from(list).filter((f) =>
      f.name.toLowerCase().endsWith(".csv")
    );
    if (arr.length !== list.length) {
      alert("Only .csv files will be kept");
    }
    setUploadFiles(arr);
  };

  const onFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const list = e.dataTransfer.files;
    if (!list) return;
    const arr = Array.from(list).filter((f) =>
      f.name.toLowerCase().endsWith(".csv")
    );
    if (arr.length > 0) setUploadFiles(arr);
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;

    const formData = new FormData();
    for (const f of uploadFiles) formData.append("file", f);
    if (uploadDest) formData.append("destination", uploadDest);
    if (uploadOverwrite) formData.append("overwrite", "true");

    setUploading(true);
    setUploadResult(null);
    try {
      const r = await fetch("/api/csv/upload", { method: "POST", body: formData });
      const data = await r.json();
      setUploadResult({
        message: data.message ?? "",
        results: data.results ?? [],
        ok: data.summary?.ok ?? 0,
        skipped: data.summary?.skipped ?? 0,
        err: data.summary?.error ?? 0,
      });
      if (r.ok) {
        refresh();
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (e) {
      setUploadResult({
        message: "Upload failed: " + (e instanceof Error ? e.message : String(e)),
        results: [],
        ok: 0,
        skipped: 0,
        err: uploadFiles.length,
      });
    } finally {
      setUploading(false);
    }
  };

  const pickDirFromTree = () => {
    if (selected && selected.type === "dir") {
      setUploadDest(selected.path);
    } else if (selected && selected.type === "file") {
      const idx = selected.path.lastIndexOf("/");
      setUploadDest(idx >= 0 ? selected.path.slice(0, idx) : "");
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
            </div>
            <span className="ml-2 text-xs font-medium text-slate-500">
              public/data
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUploadOpen((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                uploadOpen
                  ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300"
                  : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload CSV
            </button>
            {selected && selected.type === "file" && (
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : null}
                {loading ? "Loading..." : "Open"}
              </button>
            )}
          </div>
        </div>

        {uploadOpen && (
          <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-900">
                Upload to server's public/data
              </span>
              <button
                onClick={refresh}
                className="text-xs text-indigo-600 hover:underline"
              >
                Refresh
              </button>
            </div>

            <div className="mb-2 grid gap-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Subdirectory (optional, auto-created)
                </label>
                <div className="flex gap-1">
                  <input
                    list="existing-dirs"
                    type="text"
                    value={uploadDest}
                    onChange={(e) => setUploadDest(e.target.value)}
                    placeholder="empty = root"
                    className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                  <datalist id="existing-dirs">
                    {dirOptions.map((d) => (
                      <option key={d} value={d || "(root)"} />
                    ))}
                  </datalist>
                  <button
                    onClick={pickDirFromTree}
                    title="Use selected dir from tree"
                    className="rounded-md border border-slate-300 bg-white px-2 text-xs hover:bg-slate-50"
                  >
                    Selected
                  </button>
                </div>
              </div>

              <div className="flex items-end gap-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={uploadOverwrite}
                    onChange={(e) => setUploadOverwrite(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Overwrite existing files
                </label>
              </div>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onFileDrop}
              onClick={onBrowseFiles}
              className="cursor-pointer rounded-lg border-2 border-dashed border-indigo-300 bg-white py-3 text-center transition-colors hover:border-indigo-500 hover:bg-indigo-50/30"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                multiple
                onChange={onFilesSelected}
                className="hidden"
              />
              {uploadFiles.length === 0 ? (
                <div className="flex flex-col items-center gap-1">
                  <svg className="h-5 w-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-xs text-indigo-700">
                    Click or drag CSV files here (up to 20 / 20MB)
                  </p>
                </div>
              ) : (
                <div className="text-left">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">
                      {uploadFiles.length} file{uploadFiles.length !== 1 ? "s" : ""} selected
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadFiles([]);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  <ul className="max-h-24 space-y-0.5 overflow-y-auto text-xs text-slate-600">
                    {uploadFiles.map((f) => (
                      <li key={f.name} className="truncate">
                        · {f.name}
                        <span className="text-slate-400">
                          {" "}({formatSize(f.size)})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="text-xs text-slate-500">
                {uploadDest
                  ? `Target: public/data/${uploadDest}/`
                  : "Target: public/data/"}
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading || uploadFiles.length === 0}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                {uploading ? "Uploading..." : `Upload ${uploadFiles.length} file${uploadFiles.length !== 1 ? "s" : ""}`}
              </button>
            </div>

            {uploadResult && (
              <div
                className={`mt-2 rounded-md border p-2 text-xs ${
                  uploadResult.err > 0
                    ? "border-red-200 bg-red-50 text-red-800"
                    : uploadResult.skipped > 0
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                <div className="mb-1 font-medium">{uploadResult.message}</div>
                <div className="space-y-0.5">
                  {uploadResult.results.map((r, i) => (
                    <div key={i} className="flex items-start gap-1">
                      <span className="font-mono">
                        {r.status === "ok"
                          ? "✓"
                          : r.status === "skipped"
                            ? "⊘"
                            : "✗"}
                      </span>
                      <span className="font-mono">{r.path}</span>
                      {r.reason && (
                        <span className="text-slate-500">— {r.reason}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search files or paths..."
              className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-8 text-sm shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            {keyword && (
              <button
                onClick={() => setKeyword("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Clear search"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {keyword && (
            <span className="whitespace-nowrap rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
              {matchCount} match{matchCount !== 1 ? "es" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto bg-white p-2">
        {fetching && (
          <div className="py-8 text-center text-sm text-slate-500">
            <svg className="mx-auto mb-2 h-5 w-5 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            Scanning directory...
          </div>
        )}

        {error && !fetching && (
          <div className="py-8 text-center text-sm text-red-500">{error}</div>
        )}

        {!fetching && !error && tree.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-500">public/data is empty</p>
            <p className="mt-1 text-xs text-slate-400">
              Put your CSV files (with optional subfolders) there
            </p>
          </div>
        )}

        {!fetching && !error && tree.length > 0 && filteredTree.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-500">
              No matches for "
              <span className="font-medium text-slate-700">{keyword}</span>
              "
            </p>
          </div>
        )}

        {!fetching && !error && filteredTree.length > 0 && (
          <div className="space-y-0.5">
            {filteredTree.map((node) => (
              <TreeItem
                key={node.path}
                node={node}
                depth={0}
                selectedPath={selected?.path ?? null}
                onSelect={setSelected}
                onDoubleClick={(n) => {
                  if (n.type === "file") {
                    setSelected(n);
                    onSelect(n.path, n.name);
                  }
                }}
                keyword={keyword}
                forceOpen={keyword.trim() !== ""}
              />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="border-t border-slate-200 bg-slate-50/80 px-4 py-2 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Selected:
            <span className="font-mono text-indigo-700">{selected.path}</span>
            {selected.type === "dir" && (
              <span className="ml-2 text-amber-600">(folder — pick a CSV inside)</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
