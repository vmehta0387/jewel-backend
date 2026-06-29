import TableLoadingRow from './TableLoadingRow';

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

interface TableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  compact?: boolean;
  wrapperClassName?: string;
  tableClassName?: string;
  loading?: boolean;
  loadingLabel?: string;
  emptyLabel?: string;
}

export default function Table({
  columns,
  data,
  onRowClick,
  compact = false,
  wrapperClassName = '',
  tableClassName = '',
  loading = false,
  loadingLabel,
  emptyLabel,
}: TableProps) {
  const tableDensityClass = compact ? 'app-table app-table-compact' : 'app-table';

  return (
    <div className={`app-table-shell ${wrapperClassName}`.trim()}>
      <div className="app-table-scroll scrollbar-top">
        <table className={`${tableDensityClass} ${tableClassName}`.trim()}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`app-table-head-cell ${col.headerClassName || ''}`.trim()}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableLoadingRow colSpan={columns.length} label={loadingLabel} />
            ) : data.length === 0 && emptyLabel ? (
              <tr>
                <td className="app-table-empty" colSpan={columns.length}>{emptyLabel}</td>
              </tr>
            ) : data.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'app-table-row cursor-pointer' : 'app-table-row'}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`app-table-cell ${col.cellClassName || ''}`.trim()}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
