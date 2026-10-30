"use client";

import { useMemo, useState } from "react";
import type { CsvData } from "./CsvUploader";

interface DataTableProps {
  data: CsvData;
  onReset: () => void;
}

type SortDirection = "asc" | "desc" | null;

interface ColumnFilter {
  column: string;
  value: string;
}

const PAGE_SIZE = 20;

export default function DataTable({ data, onReset }: DataTableProps) {
  const [globalSearch, setGlobalSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFilter[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredRows = useMemo(() => {
    let result = data.rows;

    if (globalSearch.trim()) {
      const search = globalSearch.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(search)
        )
      );
    }

    for (const filter of columnFilters) {
      if (filter.value.trim()) {
        const filterValue = filter.value.toLowerCase();
        result = result.filter((row) =>
          String(row[filter.column] ?? "")
            .toLowerCase()
            .includes(filterValue)
        );
      }
    }

    if (sortColumn && sortDirection) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortColumn] ?? "";
        const bVal = b[sortColumn] ?? "";

        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);
        const isNumeric = !isNaN(aNum) && !isNaN(bNum);

        let comparison: number;
        if (isNumeric) {
          comparison = aNum - bNum;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [data.rows, globalSearch, columnFilters, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, safeCurrentPage]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleColumnFilter = (column: string, value: string) => {
    setColumnFilters((prev) => {
      const existing = prev.find((f) => f.column === column);
      if (existing) {
        if (!value.trim()) {
          return prev.filter((f) => f.column !== column);
        }
        return prev.map((f) =>
          f.column === column ? { ...f, value } : f
        );
      }
      if (!value.trim()) return prev;
      return [...prev, { column, value }];
    });
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setGlobalSearch("");
    setColumnFilters([]);
    setSortColumn(null);
    setSortDirection(null);
    setCurrentPage(1);
  };

  const exportCsv = () => {
    const headers = data.headers.join(",");
    const rows = filteredRows.map((row) =>
      data.headers
        .map((h) => {
          const val = row[h] ?? "";
          if (val.includes(",") || val.includes('"') || val.includes("\n")) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(",")
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `filtered_${data.fileName}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-500 text-white shadow-lg shadow-indigo-200">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a4 4 0 014-4h4m0 0l-3-3m3 3l-3 3M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {data.fileName}
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                Total {data.rows.length}
              </span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-medium text-indigo-700">
                Showing {filteredRows.length}
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                {data.headers.length} columns
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            disabled={filteredRows.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm transition-all hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Change File
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/40 p-4">
        <div className="flex-1 min-w-[220px]">
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Global Search
          </label>
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => {
                setGlobalSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search across all columns..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>
        <button
          onClick={clearAllFilters}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear All
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-gradient-to-b from-slate-50 to-slate-100">
              <tr>
                {data.headers.map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left"
                  >
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => handleSort(header)}
                        className="group flex w-full items-center justify-between gap-1 text-xs font-semibold uppercase tracking-wider text-slate-700 transition-colors hover:text-indigo-700"
                      >
                        <span>{header}</span>
                        <span className="flex items-center gap-0.5 text-slate-400 group-hover:text-indigo-500">
                          {sortColumn === header ? (
                            <span className="text-indigo-600">
                              {sortDirection === "asc" ? "▲" : "▼"}
                            </span>
                          ) : (
                            <>
                              <svg className="h-2 w-2" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 3l5 7H5l5-7z" />
                              </svg>
                              <svg className="h-2 w-2" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 17l5-7H5l5 7z" />
                              </svg>
                            </>
                          )}
                        </span>
                      </button>
                      <input
                        type="text"
                        placeholder="Filter..."
                        onChange={(e) =>
                          handleColumnFilter(header, e.target.value)
                        }
                        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-normal normal-case placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                      />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={data.headers.length}
                    className="px-4 py-12 text-center"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <svg className="h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-slate-500">No matching rows</p>
                      <button
                        onClick={clearAllFilters}
                        className="text-xs font-medium text-indigo-600 hover:underline"
                      >
                        Clear all filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="transition-colors hover:bg-indigo-50/40"
                  >
                    {data.headers.map((header) => (
                      <td
                        key={header}
                        className="whitespace-nowrap px-4 py-2.5 text-sm text-slate-700"
                      >
                        {row[header] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/60 px-4 py-3">
            <p className="text-sm text-slate-600">
              Page <span className="font-semibold text-indigo-700">{safeCurrentPage}</span> of {totalPages}
              <span className="ml-2 text-slate-400">
                · {PAGE_SIZE * (safeCurrentPage - 1) + 1}–{Math.min(PAGE_SIZE * safeCurrentPage, filteredRows.length)} of {filteredRows.length}
              </span>
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Prev
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={safeCurrentPage === totalPages}
                className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
