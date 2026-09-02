import { useEffect, useMemo, useState } from 'react';
import Button from '../../components/common/Button';
import PermissionMatrix, { DetailedPermission } from '../../components/permissions/PermissionMatrix';
import api from '../../services/api';
import { TaskPermission, UserRole } from '../../types/auth.types';
import {
  ALLOWED_TASK_PERMISSIONS_BY_ROLE,
  DEFAULT_TASK_PERMISSIONS_BY_ROLE,
  getDefaultDetailedPermissionsByRole,
  USER_ROLE_OPTIONS,
} from '../../types/user.types';

type RolePermissionDefault = {
  id?: number;
  role: UserRole;
  name?: string;
  isActive?: boolean;
  taskPermissions: TaskPermission[];
  detailedPermissions: DetailedPermission[];
};

type RoleDefaultDraft = {
  taskPermissions: TaskPermission[];
  detailedPermissions: DetailedPermission[];
};

const EDITABLE_ROLES = USER_ROLE_OPTIONS.filter((role) => role.value !== 'SUPER_ADMIN');

const createFallbackDraft = (role: UserRole): RoleDefaultDraft => ({
  taskPermissions: DEFAULT_TASK_PERMISSIONS_BY_ROLE[role] || [],
  detailedPermissions: [...getDefaultDetailedPermissionsByRole(role)],
});

export default function RoleDefaultPermissionsPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('COMPANY_ADMIN');
  const [defaultsByRole, setDefaultsByRole] = useState<Partial<Record<UserRole, RolePermissionDefault>>>({});
  const [draftByRole, setDraftByRole] = useState<Partial<Record<UserRole, RoleDefaultDraft>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/permissions/role-defaults');
        const rows: RolePermissionDefault[] = Array.isArray(response.data) ? response.data : [];
        if (!active) return;

        const nextDefaults: Partial<Record<UserRole, RolePermissionDefault>> = {};
        const nextDrafts: Partial<Record<UserRole, RoleDefaultDraft>> = {};
        rows.forEach((row) => {
          nextDefaults[row.role] = row;
          nextDrafts[row.role] = {
            taskPermissions: row.taskPermissions || [],
            detailedPermissions: row.detailedPermissions || [],
          };
        });
        setDefaultsByRole(nextDefaults);
        setDraftByRole(nextDrafts);
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.message || 'Unable to load role defaults.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const selectedRoleOption = useMemo(
    () => EDITABLE_ROLES.find((role) => role.value === selectedRole) || EDITABLE_ROLES[0],
    [selectedRole],
  );
  const currentDraft = draftByRole[selectedRole] || createFallbackDraft(selectedRole);
  const savedDefault = defaultsByRole[selectedRole];
  const selectedCount = currentDraft.detailedPermissions.length || currentDraft.taskPermissions.length;

  const updateDraft = (role: UserRole, patch: Partial<RoleDefaultDraft>) => {
    setDraftByRole((prev) => {
      const current = prev[role] || createFallbackDraft(role);
      return {
        ...prev,
        [role]: {
          ...current,
          ...patch,
        },
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload = {
        name: savedDefault?.name || 'Default',
        isActive: true,
        taskPermissions: currentDraft.taskPermissions,
        detailedPermissions: currentDraft.detailedPermissions,
      };
      const response = await api.put(`/permissions/role-defaults/${selectedRole}`, payload);
      const saved: RolePermissionDefault = response.data;
      setDefaultsByRole((prev) => ({ ...prev, [selectedRole]: saved }));
      setDraftByRole((prev) => ({
        ...prev,
        [selectedRole]: {
          taskPermissions: saved.taskPermissions || [],
          detailedPermissions: saved.detailedPermissions || [],
        },
      }));
      setMessage(`${selectedRoleOption.label} defaults saved.`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to save role defaults.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Default Permissions</h1>
          <p className="mt-1 text-sm text-slate-500">{selectedRoleOption.label}</p>
        </div>
        <div className="flex items-center gap-3">
          {loading ? <span className="text-sm text-slate-500">Loading...</span> : null}
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            {selectedCount} selected
          </span>
          <Button type="button" onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving...' : 'Save Defaults'}
          </Button>
        </div>
      </div>

      {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid min-h-[680px] grid-cols-1 overflow-hidden rounded-lg border border-slate-200 bg-white lg:grid-cols-[20%_80%]">
        <aside className="border-b border-slate-200 bg-slate-50 lg:border-b-0 lg:border-r">
          <div className="space-y-2 p-3">
            {EDITABLE_ROLES.map((role) => {
              const active = selectedRole === role.value;
              const draft = draftByRole[role.value] || createFallbackDraft(role.value);
              const count = draft.detailedPermissions.length || draft.taskPermissions.length;
              return (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => {
                    setSelectedRole(role.value);
                    setMessage(null);
                    setError(null);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-3 text-left transition ${
                    active
                      ? 'border-[#d6a85f] bg-white text-slate-900 shadow-sm'
                      : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{role.label}</span>
                    <span className="mt-0.5 block text-xs text-slate-400">{count} selected</span>
                  </span>
                  <span className={`h-2.5 w-2.5 rounded-full ${savedDefault ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0 p-3">
          <PermissionMatrix
            value={currentDraft.taskPermissions}
            detailedValue={currentDraft.detailedPermissions}
            allowedPermissions={ALLOWED_TASK_PERMISSIONS_BY_ROLE[selectedRole] || []}
            defaultPermissions={DEFAULT_TASK_PERMISSIONS_BY_ROLE[selectedRole] || []}
            role={selectedRole}
            canEdit={!loading && !saving}
            onChange={(taskPermissions) => updateDraft(selectedRole, { taskPermissions })}
            onDetailedChange={(detailedPermissions) => updateDraft(selectedRole, { detailedPermissions })}
          />
        </main>
      </div>
    </div>
  );
}
