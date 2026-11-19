import EmptyState from "./EmptyState.jsx";

const skeletonRows = [0, 1, 2, 3, 4];

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = "No records found.",
}) {
  const safeColumns = Array.isArray(columns) ? columns.filter(Boolean) : [];
  const safeData = Array.isArray(data) ? data.filter(Boolean) : [];

  return (
    <div className="overflow-x-auto rounded-lg border border-app-border bg-app-surface">
      <table className="w-full min-w-[760px] text-left text-[13px]">
        <thead className="sticky top-0 bg-app-subtle text-xs uppercase tracking-wide text-app-muted">
          <tr>
            {safeColumns.map((column) => (
              <th className="whitespace-nowrap px-4 py-2.5 font-medium" key={column.key} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-app-border">
          {loading ? (
            skeletonRows.map((row) => (
              <tr key={`skeleton-${row}`}>
                {safeColumns.map((column) => (
                  <td className="px-4 py-3" key={`${row}-${column.key}`}>
                  <span className="block h-4 w-3/4 animate-pulse rounded bg-app-subtle" />
                  </td>
                ))}
              </tr>
            ))
          ) : safeData.length ? (
            safeData.map((row, rowIndex) => (
              <tr className="text-app-text transition-colors duration-150 hover:bg-app-subtle" key={row?._id ?? row?.id ?? rowIndex}>
                {safeColumns.map((column) => (
                  <td className="h-11 px-4 py-2" key={column.key}>
                    {typeof column.render === "function"
                      ? column.render(row, rowIndex)
                      : row?.[column.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-2" colSpan={Math.max(safeColumns.length, 1)}>
                <EmptyState message={emptyMessage} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
