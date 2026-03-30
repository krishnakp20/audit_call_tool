import { ReactNode, useMemo, useState } from "react";

interface DataTableProps {
  headers: string[];
  rows: ReactNode[][];
}

export function DataTable({ headers, rows }: DataTableProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.some((cell) => String(cell).toLowerCase().includes(q)));
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-amber-200 p-3">
        <input
          placeholder="Filter..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-slate-700"
        />
        <div className="flex items-center gap-2 text-xs text-slate-700">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded bg-amber-100 px-2 py-1 disabled:opacity-40">
            Prev
          </button>
          <span>
            {page}/{totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded bg-amber-100 px-2 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-amber-100 text-slate-700">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pagedRows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-amber-100 text-slate-700">
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`} className="px-4 py-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
