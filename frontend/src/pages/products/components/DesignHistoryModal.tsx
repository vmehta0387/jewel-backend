import TableLoadingRow from '../../../components/common/TableLoadingRow';
import ProductsModal from './ProductsModal';

interface DesignHistoryRow {
  id: string;
  actionType: string;
  remarks: string;
  user: string;
  dateTime: string;
}

interface DesignHistoryModalProps {
  designNo: string;
  loading: boolean;
  error: string | null;
  rows: DesignHistoryRow[];
  onClose: () => void;
}

export default function DesignHistoryModal({ designNo, loading, error, rows, onClose }: DesignHistoryModalProps) {
  return (
    <ProductsModal title={`ACTIONS HISTORY (${designNo})`} onClose={onClose} size="max-w-4xl">
      <div className="overflow-x-auto scrollbar-top rounded border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left text-xs uppercase text-gray-600">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Remarks</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Date Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableLoadingRow colSpan={4} label="Loading history..." />
            ) : error ? (
              <tr className="border-t border-gray-200">
                <td className="px-3 py-4 text-center text-sm text-red-600" colSpan={4}>
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr className="border-t border-gray-200">
                <td className="px-3 py-4 text-center text-sm text-gray-500" colSpan={4}>
                  No history entries found.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id || `${row.actionType}-${idx}`} className="border-t border-gray-200">
                  <td className="px-3 py-2">{idx + 1}</td>
                  <td className="px-3 py-2">
                    {row.actionType ? `${row.actionType}: ` : ''}
                    {row.remarks || '-'}
                  </td>
                  <td className="px-3 py-2">{row.user || 'System'}</td>
                  <td className="px-3 py-2">{row.dateTime || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </ProductsModal>
  );
}
