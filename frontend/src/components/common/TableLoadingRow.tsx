interface TableLoadingRowProps {
  colSpan: number;
  label?: string;
}

export default function TableLoadingRow({ colSpan, label = 'Loading records...' }: TableLoadingRowProps) {
  return (
    <tr>
      <td className="app-table-empty" colSpan={colSpan}>
        <div className="flex min-h-[5rem] items-center justify-center gap-3 text-sm font-medium text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" aria-hidden="true" />
          <span>{label}</span>
        </div>
      </td>
    </tr>
  );
}
