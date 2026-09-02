import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import SmartDropdown from '../../components/common/SmartDropdown';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Avatar from '../../components/common/Avatar';
import PermissionMatrix from '../../components/permissions/PermissionMatrix';
import { useAppDialog } from '../../components/common/useAppDialog';
import api from '../../services/api';
import { TaskPermission, UserRole } from '../../types/auth.types';
import { ALLOWED_TASK_PERMISSIONS_BY_ROLE, DEFAULT_TASK_PERMISSIONS_BY_ROLE, TASK_PERMISSION_LABELS, USER_ROLE_OPTIONS, UserRecord } from '../../types/user.types';
import { getStoredUser, hasActionPermission } from '../../utils/auth';

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
  const { showAlert: showAppAlert, dialogNode } = useAppDialog();
  const currentUser = getStoredUser();
  const isCompanyAdmin = currentUser?.role === 'COMPANY_ADMIN';
  const canCreateUser = Boolean(currentUser && hasActionPermission(currentUser, 'user.create'));
  const canEditUser = Boolean(currentUser && hasActionPermission(currentUser, 'user.edit'));
  const canUpdateUserStatus = Boolean(currentUser && hasActionPermission(currentUser, 'user.status_update'));
  const canImportUsers = Boolean(currentUser && hasActionPermission(currentUser, 'user.import'));
  const canManageUserPermissions = Boolean(
    currentUser
      && hasActionPermission(currentUser, 'user.edit')
      && hasActionPermission(currentUser, 'user.permissions.manage'),
  );
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [role, setRole] = useState<RoleFilter>('ALL');
  const [page, setPage] = useState(1);
  const [permissionUser, setPermissionUser] = useState<UserRecord | null>(null);
  const [permissionDraft, setPermissionDraft] = useState<{
    taskPermissions: TaskPermission[];
    detailedPermissions: NonNullable<UserRecord['detailedPermissions']>;
  } | null>(null);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const roleOptions = isCompanyAdmin
    ? USER_ROLE_OPTIONS.filter((option) => option.value === 'BRANCH_MANAGER' || option.value === 'SALES_REP')
    : USER_ROLE_OPTIONS;
  const roleFilterOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All Roles' },
      ...roleOptions,
    ],
    [roleOptions],
  );
  const statusFilterOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All Status' },
      { value: 'ACTIVE', label: 'Active' },
      { value: 'INACTIVE', label: 'Inactive' },
    ],
    [],
  );

  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const pagedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return users.slice(start, start + pageSize);
  }, [users, page, pageSize]);
  const showingFrom = users.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, users.length);
  const usersWithSerial = pagedUsers.map((user, index) => ({
    ...user,
    serialNumber: showingFrom + index,
  }));

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

  useEffect(() => {
    if (isCompanyAdmin && role !== 'ALL' && role !== 'BRANCH_MANAGER' && role !== 'SALES_REP') {
      setRole('ALL');
    }
  }, [isCompanyAdmin, role]);

  const openPermissionPopup = (user: UserRecord) => {
    setPermissionUser(user);
    setPermissionDraft({
      taskPermissions: user.taskPermissions || [],
      detailedPermissions: user.detailedPermissions || [],
    });
  };

  const closePermissionPopup = () => {
    if (savingPermissions) return;
    setPermissionUser(null);
    setPermissionDraft(null);
  };

  const savePermissionPopup = async () => {
    if (!permissionUser || !permissionDraft || !canManageUserPermissions) return;
    setSavingPermissions(true);
    try {
      const allowedPermissions = ALLOWED_TASK_PERMISSIONS_BY_ROLE[permissionUser.role] || [];
      const normalizedPermissions = permissionDraft.taskPermissions.filter((permission) =>
        allowedPermissions.includes(permission),
      );
      const payload = {
        firstName: permissionUser.firstName,
        lastName: permissionUser.lastName,
        userHandle: permissionUser.userHandle || null,
        email: permissionUser.email,
        role: permissionUser.role,
        companyId: permissionUser.companyId ? Number(permissionUser.companyId) : null,
        branchId: permissionUser.branchId ? Number(permissionUser.branchId) : null,
        phone: permissionUser.phone || null,
        photoUrl: permissionUser.photoUrl || null,
        isActive: permissionUser.isActive,
        taskPermissions: normalizedPermissions,
        detailedPermissions: permissionDraft.detailedPermissions,
      };
      await api.put(`/users/${permissionUser.id}`, payload);
      setUsers((prev) => prev.map((user) => user.id === permissionUser.id
        ? { ...user, taskPermissions: normalizedPermissions, detailedPermissions: permissionDraft.detailedPermissions }
        : user,
      ));
      showAppAlert('Permissions saved successfully.', { variant: 'success' });
      setPermissionUser(null);
      setPermissionDraft(null);
      fetchUsers();
    } catch (error: any) {
      const message = error?.response?.data?.message;
      showAppAlert(Array.isArray(message) ? message.join(', ') : message || 'Failed to save permissions.', { variant: 'error' });
    } finally {
      setSavingPermissions(false);
    }
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
      showAppAlert('Failed to export users.', { variant: 'error' });
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
      showAppAlert('Failed to download users import template.', { variant: 'error' });
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
      showAppAlert(
        `Import completed.\nTotal Rows: ${summary.totalRows}\nCreated: ${summary.created}\nUpdated: ${summary.updated}\nFailed: ${summary.failed}${errorPreview}`,
        { title: 'Import completed', variant: summary.failed > 0 ? 'warning' : 'success' },
      );
      fetchUsers();
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message;
      showAppAlert(Array.isArray(message) ? message.join(', ') : message || 'Failed to import users.', {
        variant: 'error',
      });
    } finally {
      setImporting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'serialNumber',
        label: '#',
        headerClassName: 'w-16',
        cellClassName: 'w-16 font-semibold text-slate-600',
      },
      {
        key: 'name',
        label: 'User',
        render: (_: unknown, row: UserRecord) => (
          <div className="flex items-center gap-3">
            <Avatar
              name={`${row.firstName} ${row.lastName}`}
              src={row.photoUrl || undefined}
              size="sm"
            />
            <div>
              <p className="font-medium text-gray-900">{row.firstName} {row.lastName}</p>
              <p className="text-xs text-gray-500">{row.email}</p>
            </div>
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
        render: (value: UserRecord['taskPermissions'], row: UserRecord) => {
          const hasAutoApproval = row.detailedPermissions?.some(
            (permission) => permission.actionKey === 'order.require_approval',
          );
          const taskPermissions = hasAutoApproval && row.role === 'SALES_REP'
            ? (value || []).filter((permission) => permission !== 'ORDER_APPROVALS')
            : value || [];
          const labels = [
            ...(hasAutoApproval ? ['Auto approval'] : []),
            ...taskPermissions.map((permission) => TASK_PERMISSION_LABELS[permission]),
          ];

          if (labels.length === 0) {
            return <span className="text-gray-500">-</span>;
          }

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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openPermissionPopup(row)}
              className="app-table-icon-action"
              title="View permissions"
              aria-label={`View permissions for ${row.firstName} ${row.lastName}`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3.25L5.75 5.6v5.2c0 4.05 2.58 7.84 6.25 9.15 3.67-1.31 6.25-5.1 6.25-9.15V5.6L12 3.25Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M9 12.1l2 2 4-4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {canEditUser ? (
              <button
                type="button"
                onClick={() => navigate(`/users/edit/${row.id}`)}
                className="app-table-action"
              >
                Edit
              </button>
            ) : null}
            {canUpdateUserStatus ? (
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
            ) : null}
          </div>
        ),
      },
    ],
    [canEditUser, canUpdateUserStatus, navigate, savingPermissions],
  );


  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-600 mt-1">
            {isCompanyAdmin
              ? 'Manage branch managers and sales reps in your company.'
              : 'Manage role assignments and task-level access control.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!isCompanyAdmin && canImportUsers && (
            <>
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
            </>
          )}
          {canCreateUser ? <Button onClick={() => navigate('/users/add')}>+ Add User</Button> : null}
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
          <SmartDropdown
            value={role}
            onChange={(value) => setRole((value || 'ALL') as RoleFilter)}
            config={{
              options: roleFilterOptions,
              valueKey: 'value',
              labelKey: 'label',
              placeholder: 'All Roles',
              showSearch: false,
            }}
          />
          <SmartDropdown
            value={status}
            onChange={(value) => setStatus((value || 'ALL') as StatusFilter)}
            config={{
              options: statusFilterOptions,
              valueKey: 'value',
              labelKey: 'label',
              placeholder: 'All Status',
              showSearch: false,
            }}
          />
          <div className="flex items-center gap-2">
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
        {loading || users.length > 0 ? (
          <>
            <Table columns={columns} data={usersWithSerial} loading={loading} loadingLabel="Loading users..." />
            {!loading ? <Pagination page={page} totalPages={totalPages} onPageChange={setPage} /> : null}
          </>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No users found for selected filters.</div>
        ) : null}
      </Card>
      {permissionUser ? createPortal((
        <div className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-slate-900/45 px-4 py-8 sm:py-10" role="dialog" aria-modal="true">
          <div className="flex max-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Permissions</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {permissionUser.firstName} {permissionUser.lastName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canManageUserPermissions ? (
                  <Button type="button" size="sm" onClick={savePermissionPopup} disabled={savingPermissions}>
                    {savingPermissions ? 'Saving...' : 'Save'}
                  </Button>
                ) : null}
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onClick={closePermissionPopup}
                  aria-label="Close permissions popup"
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>
            </div>
            <div className="min-h-0 overflow-y-auto p-4">
              <PermissionMatrix
                value={permissionDraft?.taskPermissions || []}
                detailedValue={permissionDraft?.detailedPermissions || []}
                allowedPermissions={ALLOWED_TASK_PERMISSIONS_BY_ROLE[permissionUser.role] || []}
                defaultPermissions={DEFAULT_TASK_PERMISSIONS_BY_ROLE[permissionUser.role] || []}
                role={permissionUser.role}
                canEdit={canManageUserPermissions}
                onChange={(taskPermissions) => setPermissionDraft((prev) => prev ? { ...prev, taskPermissions } : prev)}
                onDetailedChange={(detailedPermissions) => setPermissionDraft((prev) => prev ? { ...prev, detailedPermissions } : prev)}
              />
            </div>
          </div>
        </div>
      ), document.body) : null}
      {dialogNode}
    </div>
  );
}
