import { useEffect, useMemo, useState } from "react";
import EmptyState from "./EmptyState.jsx";
import Input from "./Input.jsx";

function readValue(row, accessor) {
  if (typeof accessor === "function") return accessor(row);
  if (typeof accessor !== "string") return undefined;
  return accessor.split(".").reduce((value, part) => value?.[part], row);
}

function searchableText(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(searchableText).join(" ");
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

export default function Table({
  columns = [],
  data = [],
  rowKey = "_id",
  searchable = true,
  searchPlaceholder = "Search...",
  pageSize = 10,
  emptyMessage = "No records found.",
  loading = false,
  className = "",
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const rows = Array.isArray(data) ? data.filter(Boolean) : [];
  const safeColumns = Array.isArray(columns) ? columns.filter(Boolean) : [];
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 10;
  const normalizedSearch = search.trim().toLowerCase();

  const filteredRows = useMemo(() => {
    if (!searchable || !normalizedSearch) return rows;
    return rows.filter((row) =>
      safeColumns.some((column) => {
        if (column.searchable === false) return false;
        const accessor = column.searchValue || column.accessor || column.key;
        return searchableText(readValue(row, accessor)).toLowerCase().includes(normalizedSearch);
      })
    );
  }, [normalizedSearch, rows, safeColumns, searchable]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / safePageSize));
  const visibleRows = filteredRows.slice((page - 1) * safePageSize, page * safePageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function getRowKey(row, index) {
    const key = typeof rowKey === "function" ? rowKey(row) : readValue(row, rowKey);
    return key ?? (page - 1) * safePageSize + index;
  }

  return (
    <div className={`overflow-hidden rounded-lg border border-app-border bg-app-surface ${className}`}>
      {searchable && (
        <div className="flex border-b border-app-border p-3">
          <Input
            aria-label="Search table"
            className="max-w-sm"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            type="search"
            value={search}
          />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-[13px]">
          <thead className="sticky top-0 bg-app-subtle text-xs uppercase tracking-wide text-app-muted">
            <tr>
              {safeColumns.map((column, index) => (
                <th
                  className={`whitespace-nowrap px-4 py-2.5 font-medium ${column.className || ""}`}
                  key={column.key || column.header || index}
                  scope="col"
                >
                  {column.header ?? column.title ?? column.key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {loading ? (
              <tr>
                <td className="px-4 py-10 text-center text-app-muted" colSpan={Math.max(safeColumns.length, 1)}>
                  Loading...
                </td>
              </tr>
            ) : visibleRows.length ? (
              visibleRows.map((row, rowIndex) => (
                <tr className="h-11 text-app-text hover:bg-app-subtle" key={getRowKey(row, rowIndex)}>
                  {safeColumns.map((column, columnIndex) => {
                    const accessor = column.accessor || column.key;
                    const value = readValue(row, accessor);
                    return (
                      <td
                        className={`px-4 py-2 ${column.cellClassName || ""}`}
                        key={column.key || column.header || columnIndex}
                      >
                        {column.render ? column.render(row, (page - 1) * safePageSize + rowIndex) : value ?? "—"}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-2" colSpan={Math.max(safeColumns.length, 1)}>
                  <EmptyState message={normalizedSearch ? "No matching records found." : emptyMessage} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-app-border px-4 py-3 text-sm text-app-muted sm:flex-row sm:items-center sm:justify-between">
        <span>
          {filteredRows.length} {filteredRows.length === 1 ? "result" : "results"}
        </span>
        <div className="flex items-center gap-3">
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            className="h-9 rounded-md border border-app-border px-3 font-medium text-app-text hover:bg-app-subtle disabled:cursor-not-allowed disabled:opacity-50"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            type="button"
          >
            Previous
          </button>
          <button
            className="h-9 rounded-md border border-app-border px-3 font-medium text-app-text hover:bg-app-subtle disabled:cursor-not-allowed disabled:opacity-50"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
