import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Input from '../../components/common/Input';
import ExpandableText from '../../components/common/ExpandableText';
import api from '../../services/api';
import { getStoredUser, hasActionPermission } from '../../utils/auth';
import { formatAddressLocation } from '../../utils/address';

export default function BranchesPage() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isCompanyAdmin = currentUser?.role === 'COMPANY_ADMIN';
  const canCreateBranch = Boolean(currentUser && hasActionPermission(currentUser, 'branch.create'));
  const canEditBranch = Boolean(currentUser && hasActionPermission(currentUser, 'branch.edit'));
  const canManageBranches = (isSuperAdmin || isCompanyAdmin) && (canCreateBranch || canEditBranch);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusBranch, setStatusBranch] = useState<any | null>(null);
  const [targetBranchId, setTargetBranchId] = useState('');
  const [unlinkUsers, setUnlinkUsers] = useState(false);
  const [branchMoveOptions, setBranchMoveOptions] = useState<any[]>([]);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');

  const pageSize = 15;
  const showingFrom = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min((page - 1) * pageSize + branches.length, totalRecords);
  const branchesWithSerial = branches.map((branch, index) => ({
    ...branch,
    serialNumber: showingFrom + index,
  }));

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page,
        limit: pageSize,
      };

      if (searchTerm) params.search = searchTerm;

      const response = await api.get('/branches', { params });
      const nextBranches = response.data.data || [];
      const nextTotalRecords = Number(response.data.total ?? nextBranches.length);
      const nextTotalPages = Math.max(1, Number(response.data.totalPages ?? Math.ceil(nextTotalRecords / pageSize)));

      setBranches(nextBranches);
      setTotalRecords(nextTotalRecords);
      setTotalPages(nextTotalPages);
    } catch {
      setBranches([]);
      setTotalRecords(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [searchTerm, page]);

  useEffect(() => {
    if (!loading && page > totalPages) {
      setPage(totalPages);
    }
  }, [loading, page, totalPages]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearchTerm(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setPage(1);
    setSearchTerm('');
  };

  const closeStatusConfirm = () => {
    if (savingStatus) return;
    setStatusBranch(null);
    setTargetBranchId('');
    setUnlinkUsers(false);
    setBranchMoveOptions([]);
    setStatusError('');
  };

  const openBranchDisableConfirm = async (branch: any) => {
    setStatusBranch(branch);
    setTargetBranchId('');
    setUnlinkUsers(false);
    setStatusError('');
    try {
      const response = await api.get('/branches', {
        params: { companyId: branch.companyId || branch.company?.id, status: 'ACTIVE', limit: 200 },
      });
      const options = (response.data?.data || []).filter((item: any) => item.id !== branch.id);
      setBranchMoveOptions(options);
    } catch (error) {
      console.error(error);
      setBranchMoveOptions([]);
    }
  };

  const updateBranchStatus = async (branch: any, isActive: boolean) => {
    const assignedUsers = Number(branch.userCount || 0);
    if (!isActive && assignedUsers > 0 && !targetBranchId && !unlinkUsers) {
      setStatusError('Select another branch to move users, or confirm unlinking them from this branch.');
      return;
    }

    setSavingStatus(true);
    setStatusError('');
    try {
      await api.patch(`/branches/${branch.id}/status`, {
        isActive,
        targetBranchId: !isActive && targetBranchId ? Number(targetBranchId) : undefined,
        unlinkUsers: !isActive && unlinkUsers,
      });
      setStatusBranch(null);
      setTargetBranchId('');
      setUnlinkUsers(false);
      setBranchMoveOptions([]);
      fetchBranches();
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      setStatusError(Array.isArray(message) ? message.join(', ') : message || 'Failed to update branch status');
    } finally {
      setSavingStatus(false);
    }
  };
  const columns = [
    {
      key: 'serialNumber',
      label: '#',
      headerClassName: 'w-16',
      cellClassName: 'w-16 font-semibold text-slate-600',
    },
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Branch Name' },
    {
      key: 'company',
      label: 'Company',
      render: (_: any, row: any) => <span>{row.company?.companyName || '-'}</span>,
    },
    {
      key: 'city',
      label: 'Location',
      headerClassName: 'min-w-[180px]',
      cellClassName: 'min-w-[180px] max-w-[230px] align-top',
      render: (_: string, row: any) => <ExpandableText text={formatAddressLocation(row)} />,
    },
    {
      key: 'branchManager',
      label: 'Branch Manager',
      render: (_: any, row: any) => (
        <span>{row.branchManager ? `${row.branchManager.firstName} ${row.branchManager.lastName}` : '-'}</span>
      ),
    },
    {
      key: 'salesRepCount',
      label: 'Sales Reps',
      render: (val: number) => <span>{val ?? 0}</span>,
    },
    {
      key: 'userCount',
      label: 'Total Users',
      render: (val: number) => <span>{val ?? 0}</span>,
    },
    {
      key: 'pricing',
      label: 'Pricing',
      render: (_: any, row: any) =>
        row.enableSlabPricing
          ? `${row.pricingSlabCount || 0} slab tier${row.pricingSlabCount === 1 ? '' : 's'}`
          : `${parseFloat(row.branchMultiplier || 1).toFixed(2)}x default`,
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (val: boolean) => (
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            val ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {val ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  if (canEditBranch) {
    columns.push({
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/branches/edit/${row.id}`)}
            className="app-table-action"
          >
            Edit
          </button>
          <button
            onClick={() => {
              if (row.isActive) {
                void openBranchDisableConfirm(row);
                return;
              }
              void updateBranchStatus(row, true);
            }}
            className={`app-table-action ${
              row.isActive
                ? 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800'
            }`}
          >
            {row.isActive ? 'Disable' : 'Enable'}
          </button>
        </div>
      ),
    });
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
          <p className="text-sm text-gray-600 mt-1">
            {canManageBranches
              ? 'Manage company branches, branch managers, and branch-level pricing'
              : 'View branches for your assigned companies'}
          </p>
        </div>
        {canCreateBranch && <Button onClick={() => navigate('/branches/add')}>+ Add Branch</Button>}
      </div>

      <Card className="mb-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by branch name, code, city, country, or company"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              Search
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={handleClearSearch}>
              Clear
            </Button>
          </div>
        </form>
      </Card>

      {statusBranch && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/45 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="border-b px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Disable Branch</h2>
              <p className="mt-1 text-sm text-gray-600">
                {statusBranch.name} has {Number(statusBranch.userCount || 0)} assigned user{Number(statusBranch.userCount || 0) === 1 ? '' : 's'}.
              </p>
            </div>
            <div className="space-y-4 px-5 py-4">
              {statusError && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{statusError}</div>}
              {Number(statusBranch.userCount || 0) > 0 ? (
                <>
                  <label className="block text-sm font-medium text-gray-700">
                    Move users to another branch
                    <select
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-primary-500"
                      value={targetBranchId}
                      onChange={(event) => {
                        setTargetBranchId(event.target.value);
                        if (event.target.value) setUnlinkUsers(false);
                      }}
                    >
                      <option value="">Select active branch</option>
                      {branchMoveOptions.map((branch) => (
                        <option key={branch.id} value={branch.id}>{branch.name} ({branch.code})</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-start gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={unlinkUsers}
                      onChange={(event) => {
                        setUnlinkUsers(event.target.checked);
                        if (event.target.checked) setTargetBranchId('');
                      }}
                      className="mt-1 h-4 w-4 text-primary-600"
                    />
                    <span>Unlink these users from this branch instead of moving them.</span>
                  </label>
                </>
              ) : (
                <p className="text-sm text-gray-600">No users are assigned to this branch.</p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-4">
              <Button type="button" variant="secondary" onClick={closeStatusConfirm} disabled={savingStatus}>Cancel</Button>
              <Button type="button" variant="danger" onClick={() => updateBranchStatus(statusBranch, false)} disabled={savingStatus}>
                {savingStatus ? 'Disabling...' : 'Disable Branch'}
              </Button>
            </div>
          </div>
        </div>
      )}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Branch Directory</h2>
          <span className="text-xs text-gray-600">
            Showing {showingFrom}–{showingTo} of {totalRecords} record{totalRecords === 1 ? '' : 's'}
          </span>
        </div>
        {loading || branches.length > 0 ? (
          <>
            <Table columns={columns} data={branchesWithSerial} tableClassName="min-w-[1100px]" loading={loading} loadingLabel="Loading branches..." />
            {!loading ? <Pagination page={page} totalPages={totalPages} onPageChange={setPage} /> : null}
          </>
        ) : branches.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No branches found for selected filters.</div>
        ) : null}
      </Card>
    </div>
  );
}





