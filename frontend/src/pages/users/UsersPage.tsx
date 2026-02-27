import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Table from '../../components/common/Table';
import api from '../../services/api';
import { UserRole } from '../../types/auth.types';
import { TASK_PERMISSION_LABELS, USER_ROLE_OPTIONS, UserRecord } from '../../types/user.types';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type RoleFilter = 'ALL' | UserRole;

const roleBadgeClass: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
  COMPANY_ADMIN: 'bg-blue-100 text-blue-700',
  BRANCH_MANAGER: 'bg-amber-100 text-amber-700',
  SALES_REP: 'bg-emerald-100 text-emerald-700',
  INTERNAL_REP: 'bg-cyan-100 text-cyan-700',
};

export default function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [role, setRole] = useState<RoleFilter>('ALL');

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
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadgeClass[value]}`}>
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
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
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
              className="text-primary-600 hover:text-primary-800 text-sm font-medium"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleToggleStatus(row.id, row.isActive)}
              className={`text-sm font-medium ${
                row.isActive ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'
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
        <Button onClick={() => navigate('/users/add')}>+ Add User</Button>
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
            <option value="ALL">All Statuses</option>
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
            {users.length} record{users.length === 1 ? '' : 's'}
          </span>
        </div>
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No users found for selected filters.</div>
        ) : (
          <Table columns={columns} data={users} />
        )}
      </Card>
    </div>
  );
}
