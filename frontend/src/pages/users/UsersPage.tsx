import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import api from '../../services/api';
import { UserRole } from '../../types/auth.types';
import { TASK_PERMISSION_LABELS, USER_ROLE_OPTIONS, UserRecord } from '../../types/user.types';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type RoleFilter = 'ALL' | UserRole;

const roleBadgeClass: Record<UserRole, string> = {
  SUPER_ADMIN: 'border-violet-200 bg-violet-50 text-violet-700',
  COMPANY_ADMIN: 'border-blue-200 bg-blue-50 text-blue-700',
  BRANCH_MANAGER: 'border-amber-200 bg-amber-50 text-amber-700',
  SALES_REP: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  INTERNAL_REP: 'border-cyan-200 bg-cyan-50 text-cyan-700',
};

export default function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [role, setRole] = useState<RoleFilter>('ALL');
  const [page, setPage] = useState(1);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const pagedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return users.slice(start, start + pageSize);
  }, [users, page, pageSize]);
  const showingFrom = users.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, users.length);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        status,
      };

      if (searchTerm) {
        params.search = searchTerm;
      }

      if (role !== 'ALL') {
        params.role = role;
      }

      const response = await api.get('/users', { params });
      setUsers(response.data || []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchTerm, status, role]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, status, role]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchTerm(searchInput.trim());
  };

  const handleClear = () => {
    setSearchInput('');
    setSearchTerm('');
    setStatus('ALL');
    setRole('ALL');
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/users/${id}/status`, { isActive: !currentStatus });
      fetchUsers();
    } catch (error) {
      console.error(error);
    }
  };

  const getCurrentParams = (): Record<string, string> => {
    const params: Record<string, string> = {
      status,
    };
    if (searchTerm) {
      params.search = searchTerm;
    }
    if (role !== 'ALL') {
      params.role = role;
    }
    return params;
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/users/export', {
        params: getCurrentParams(),
        responseType: 'blob',
      });
      downloadBlob(
        new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        'users-export.xlsx',
      );
    } catch (error) {
      console.error(error);
      window.alert('Failed to export users.');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/users/export/template', {
        responseType: 'blob',
      });
      downloadBlob(
        new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        'users-import-template.xlsx',
      );
    } catch (error) {
      console.error(error);
      window.alert('Failed to download users import template.');
    }
  };

  const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setImporting(true);
    try {
      const response = await api.post('/users/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const summary = response.data as {
        totalRows: number;
        created: number;
        updated: number;
        failed: number;
        errors: string[];
      };
      const errorPreview =
        summary.errors.length > 0 ? `\n\nErrors:\n${summary.errors.slice(0, 10).join('\n')}` : '';
      window.alert(
        `Import completed.\nTotal Rows: ${summary.totalRows}\nCreated: ${summary.created}\nUpdated: ${summary.updated}\nFailed: ${summary.failed}${errorPreview}`,
      );
      fetchUsers();
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message;
      window.alert(Array.isArray(message) ? message.join(', ') : message || 'Failed to import users.');
    } finally {
      setImporting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'User',
        render: (_: unknown, row: UserRecord) => (
          <div>
            <p className="font-medium text-gray-900">{row.firstName} {row.lastName}</p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
        ),
      },
      {
        key: 'role',
        label: 'Role',
        render: (value: UserRole) => (
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${roleBadgeClass[value]}`}>
            {value.replace('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())}
          </span>
        ),
      },
      {
        key: 'scope',
        label: 'Company / Branch',
        render: (_: unknown, row: UserRecord) => {
          const managedCompanies = row.managedCompanies || [];
          const showManagedCompanies = row.role === 'INTERNAL_REP' && managedCompanies.length > 0;

          const companyText = row.company
            ? `${row.company.companyName} (${row.company.companyCode})`
            : showManagedCompanies
              ? `${managedCompanies
                  .slice(0, 2)
                  .map((company) => `${company.companyName} (${company.companyCode})`)
                  .join(', ')}${managedCompanies.length > 2 ? ` +${managedCompanies.length - 2} more` : ''}`
              : '-';

          const branchText = row.branch
            ? `${row.branch.name} (${row.branch.code})`
            : showManagedCompanies
              ? 'Assigned as account manager'
              : '-';

          return (
            <div>
              <p className="text-sm text-gray-900">{companyText}</p>
              <p className="text-xs text-gray-500">{branchText}</p>
            </div>
          );
        },
      },
      {
        key: 'taskPermissions',
        label: 'Task Access',
        render: (value: UserRecord['taskPermissions']) => {
          if (!value || value.length === 0) {
            return <span className="text-gray-500">-</span>;
          }

          const labels = value.map((permission) => TASK_PERMISSION_LABELS[permission]);
          const preview = labels.slice(0, 2).join(', ');
          const remaining = labels.length - 2;
          return (
            <span className="text-sm text-gray-700">
              {preview}
              {remaining > 0 ? ` +${remaining} more` : ''}
            </span>
          );
        },
      },
      {
        key: 'isActive',
        label: 'Status',
        render: (value: boolean) => (
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              value ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {value ? 'Active' : 'Inactive'}
          </span>
        ),
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (_: unknown, row: UserRecord) => (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate(`/users/edit/${row.id}`)}
              className="app-table-action"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleToggleStatus(row.id, row.isActive)}
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
      },
    ],
    [navigate],
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-600 mt-1">Manage role assignments and task-level access control.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleDownloadTemplate}>
            Template
          </Button>
          <Button type="button" variant="secondary" onClick={handleExport}>
            Export Excel
          </Button>
          <Button type="button" variant="secondary" onClick={() => importInputRef.current?.click()} disabled={importing}>
            {importing ? 'Importing...' : 'Import Excel'}
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportChange}
          />
          <Button onClick={() => navigate('/users/add')}>+ Add User</Button>
        </div>
      </div>

      <Card className="mb-6">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name, email, company, or branch"
            />
          </div>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            value={role}
            onChange={(event) => setRole(event.target.value as RoleFilter)}
          >
            <option value="ALL">All Roles</option>
            {USER_ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              Search
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">User Directory</h2>
          <span className="text-xs text-gray-600">
            Showing {showingFrom}–{showingTo} of {users.length} record{users.length === 1 ? '' : 's'}
          </span>
        </div>
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No users found for selected filters.</div>
        ) : (
          <>
            <Table columns={columns} data={pagedUsers} />
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
