"use client";

import { useRef, useState, useCallback, type ReactNode } from "react";
import Papa from "papaparse";
import FileBrowser from "./FileBrowser";

export interface CsvData {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
}

interface CsvUploaderProps {
  onDataLoaded: (data: CsvData) => void;
}

type Tab = "upload" | "local";

const TABS: { key: Tab; label: string; icon: ReactNode }[] = [
  {
    key: "upload",
    label: "Local File",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    key: "local",
    label: "Server File",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
      </svg>
    ),
  },
];

function parseCsvText(text: string, fileName: string): CsvData {
  const results = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (results.data.length === 0) {
    throw new Error("CSV is empty or could not be parsed");
  }

  if (results.errors.length > 0) {
    console.warn("CSV parse warnings:", results.errors);
  }

  const headers = Object.keys(results.data[0]);
  return { headers, rows: results.data, fileName };
}

export default function CsvUploader({ onDataLoaded }: CsvUploaderProps) {
  const [tab, setTab] = useState<Tab>("upload");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setError("Please upload a .csv file");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = parseCsvText(String(reader.result ?? ""), file.name);
          onDataLoaded(data);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to parse file");
        }
      };
      reader.onerror = () => setError("Failed to read file");
      reader.readAsText(file, "utf-8");
    },
    [onDataLoaded]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const loadLocalFile = useCallback(
    async (filePath: string, fileName: string) => {
      setError(null);
      setLoading(true);
      try {
        const res = await fetch(
          `/api/csv/local?file=${encodeURIComponent(filePath)}`
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Request failed (${res.status})`);
        }
        const { content } = await res.json();
        const data = parseCsvText(content, fileName);
        onDataLoaded(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load file");
      } finally {
        setLoading(false);
      }
    },
    [onDataLoaded]
  );

  return (
    <div className="w-full">
      <div className="mb-6 inline-flex w-full gap-1 rounded-xl border border-slate-200/70 bg-white/80 p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold tracking-wide transition-all ${
              tab === t.key
                ? "bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-md shadow-indigo-200"
                : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "upload" && (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
            isDragging
              ? "scale-[1.02] border-indigo-500 bg-indigo-50/80 shadow-lg shadow-indigo-200/50"
              : "border-slate-300 bg-gradient-to-br from-slate-50 to-indigo-50/30 hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-100/50"
          }`}
        >
          <div className="flex flex-col items-center gap-4">
            <div
              className={`flex h-20 w-20 items-center justify-center rounded-2xl transition-all ${
                isDragging
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-300"
                  : "bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-500 text-white shadow-lg shadow-indigo-200"
              }`}
            >
              <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-base font-bold tracking-tight text-slate-800 sm:text-lg">
                {isDragging ? "Drop to upload" : "Click or drop a CSV file"}
              </p>
              <p className="mt-1 text-xs font-medium tracking-wide text-slate-500 sm:text-sm">
                .csv format · UTF-8 encoded
              </p>
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {tab === "local" && (
        <FileBrowser onSelect={loadLocalFile} loading={loading} />
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
