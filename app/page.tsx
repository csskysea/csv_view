"use client";

import { useState } from "react";
import CsvUploader, { type CsvData } from "@/components/CsvUploader";
import DataTable from "@/components/DataTable";

export default function Home() {
  const [csvData, setCsvData] = useState<CsvData | null>(null);

  const handleReset = () => {
    setCsvData(null);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-blue-50">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="absolute top-20 -right-20 h-96 w-96 rounded-full bg-blue-300/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-purple-200/30 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            CSV{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
              Viewer
            </span>
          </h1>
          <p className="mt-3 text-sm font-medium tracking-wide text-slate-500 sm:text-base">
            Load · Browse · Filter · Export
          </p>
        </header>

        {!csvData ? (
          <div className="mx-auto max-w-3xl">
            <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-2xl shadow-indigo-200/40 backdrop-blur-xl sm:p-10">
              <CsvUploader onDataLoaded={setCsvData} />
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-2xl shadow-indigo-200/40 backdrop-blur-xl sm:p-10">
            <DataTable data={csvData} onReset={handleReset} />
          </div>
        )}
      </div>
    </div>
  );
}
