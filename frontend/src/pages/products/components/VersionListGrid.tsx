import { ReactNode } from 'react';

export interface VersionListGridRow {
  id: string;
  designNo: string;
  barcode?: string;
  version: string;
  jewelryGroup: string;
  jewelrySize: string;
  metalCaratage: string;
  collection: string;
  stoneInfo: string;
  price: string;
  stage: string;
  status: string;
  isActive: boolean;
  isPrimary: boolean;
  modifiedAt: string;
  media: ReactNode;
  actions: ReactNode;
}

interface VersionListGridProps {
  rows: VersionListGridRow[];
}

function VersionStatusBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
        active
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-rose-200 bg-rose-50 text-rose-700'
      }`}
    >
      {label}
    </span>
  );
}

export default function VersionListGrid({ rows }: VersionListGridProps) {
  return (
    <div className="app-table-shell w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-200 shadow-sm [contain:inline-size]">
      <div className="app-table-scroll scrollbar-top w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
        <table className="app-table app-table-compact w-max min-w-[1480px]">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="app-table-head-cell w-14">#</th>
              <th className="app-table-head-cell">Media</th>
              <th className="app-table-head-cell">Design No.</th>
              <th className="app-table-head-cell">Barcode</th>
              <th className="app-table-head-cell">Version</th>
              <th className="app-table-head-cell">Category</th>
              <th className="app-table-head-cell">Jewelry Size</th>
              <th className="app-table-head-cell min-w-44">Metal Info</th>
              <th className="app-table-head-cell">Sub Category</th>
              <th className="app-table-head-cell min-w-48">Stone Info</th>
              <th className="app-table-head-cell">Cost Price</th>
              <th className="app-table-head-cell">Stage</th>
              <th className="app-table-head-cell">Status</th>
              <th className="app-table-head-cell">Modified</th>
              <th className="app-table-head-cell">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50/70">
                <td className="app-table-cell tabular-nums text-slate-500">{index + 1}</td>
                <td className="app-table-cell">{row.media}</td>
                <td className="app-table-cell whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{row.designNo || '-'}</span>
                    {row.isPrimary ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                        Primary
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="app-table-cell whitespace-nowrap font-mono text-[11px] font-semibold text-slate-600">{row.barcode || '-'}</td>
                <td className="app-table-cell whitespace-nowrap">
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 ring-1 ring-inset ring-slate-500/10">
                    {row.version || 'V1'}
                  </span>
                </td>
                <td className="app-table-cell whitespace-nowrap font-medium text-slate-700">{row.jewelryGroup || '-'}</td>
                <td className="app-table-cell whitespace-nowrap font-medium text-slate-700">{row.jewelrySize || '-'}</td>
                <td className="app-table-cell min-w-44 whitespace-normal break-words font-medium text-slate-700">{row.metalCaratage || '-'}</td>
                <td className="app-table-cell whitespace-nowrap font-medium text-slate-700">{row.collection || '-'}</td>
                <td className="app-table-cell min-w-48 whitespace-normal break-words font-medium text-slate-700">{row.stoneInfo || '-'}</td>
                <td className="app-table-cell whitespace-nowrap font-bold text-slate-900">{row.price}</td>
                <td className="app-table-cell whitespace-nowrap text-slate-700">{row.stage || '-'}</td>
                <td className="app-table-cell whitespace-nowrap">
                  <VersionStatusBadge active={row.isActive} label={row.status || (row.isActive ? 'Active' : 'Inactive')} />
                </td>
                <td className="app-table-cell whitespace-nowrap text-slate-500">{row.modifiedAt || '-'}</td>
                <td className="app-table-cell whitespace-nowrap">{row.actions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
