import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import api from '../../services/api';
import { TaskPermission, UserRole } from '../../types/auth.types';
import {
  DEFAULT_TASK_PERMISSIONS_BY_ROLE,
  TASK_PERMISSION_OPTIONS,
  USER_ROLE_OPTIONS,
} from '../../types/user.types';

interface CompanyOption {
  id: string;
  companyName: string;
  companyCode: string;
}

interface BranchOption {
  id: string;
  name: string;
  code: string;
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  companyId: string;
  branchId: string;
  phone: string;
  photoUrl: string;
  isActive: boolean;
  taskPermissions: TaskPermission[];
}

function roleNeedsCompany(role: UserRole): boolean {
  return role === 'COMPANY_ADMIN' || role === 'BRANCH_MANAGER' || role === 'SALES_REP';
}

function roleNeedsBranch(role: UserRole): boolean {
  return role === 'BRANCH_MANAGER' || role === 'SALES_REP';
}

export default function AddUser() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const presetCompanyId = searchParams.get('companyId') || '';
  const presetBranchId = searchParams.get('branchId') || '';
  const presetRole = (
    USER_ROLE_OPTIONS.some((option) => option.value === roleParam)
      ? roleParam
      : presetBranchId
        ? 'SALES_REP'
        : 'COMPANY_ADMIN'
  ) as UserRole;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [formData, setFormData] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: presetRole,
    companyId: presetCompanyId,
    branchId: presetBranchId,
    phone: '',
    photoUrl: '',
    isActive: true,
    taskPermissions: DEFAULT_TASK_PERMISSIONS_BY_ROLE[presetRole],
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (formData.companyId && roleNeedsBranch(formData.role)) {
      fetchBranches(formData.companyId);
      return;
    }

    setBranches([]);
    setFormData((prev) => ({ ...prev, branchId: '' }));
  }, [formData.companyId, formData.role]);

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies', { params: { limit: 200, status: 'ACTIVE' } });
      setCompanies(response.data.data || []);
    } catch (error) {
      console.error(error);
      setCompanies([]);
    }
  };

  const fetchBranches = async (companyId: string) => {
    try {
      const response = await api.get('/branches', {
        params: { companyId, limit: 200, status: 'ACTIVE' },
      });
      setBranches(response.data.data || []);
    } catch (error) {
      console.error(error);
      setBranches([]);
    }
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) nextErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) nextErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) nextErrors.email = 'Email is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = 'Invalid email format';
    }
    if (!formData.password.trim()) {
      nextErrors.password = 'Password is required';
    } else if (formData.password.trim().length < 8) {
      nextErrors.password = 'Password must be at least 8 characters';
    }

    if (roleNeedsCompany(formData.role) && !formData.companyId) {
      nextErrors.companyId = 'Company is required for this role';
    }

    if (roleNeedsBranch(formData.role) && !formData.branchId) {
      nextErrors.branchId = 'Branch is required for this role';
    }

    if (formData.taskPermissions.length === 0) {
      nextErrors.taskPermissions = 'Select at least one task permission';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleRoleChange = (role: UserRole) => {
    setFormData((prev) => ({
      ...prev,
      role,
      companyId: roleNeedsCompany(role) ? prev.companyId : '',
      branchId: roleNeedsBranch(role) ? prev.branchId : '',
      taskPermissions: DEFAULT_TASK_PERMISSIONS_BY_ROLE[role],
    }));
  };

  const handlePermissionToggle = (permission: TaskPermission) => {
    setFormData((prev) => {
      const exists = prev.taskPermissions.includes(permission);
      return {
        ...prev,
        taskPermissions: exists
          ? prev.taskPermissions.filter((item) => item !== permission)
          : [...prev.taskPermissions, permission],
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/users', {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
        companyId: formData.companyId || null,
        branchId: formData.branchId || null,
        phone: formData.phone.trim() || null,
        photoUrl: formData.photoUrl.trim() || null,
        isActive: formData.isActive,
        taskPermissions: formData.taskPermissions,
      });

      navigate('/users');
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      setErrors({ submit: Array.isArray(message) ? message.join(', ') : message || 'Failed to create user' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const formDataPayload = new FormData();
    formDataPayload.append('file', file);
    setUploadingPhoto(true);
    try {
      const response = await api.post('/users/upload-photo', formDataPayload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const photoStoragePath = String(response.data?.url || '');
      const previewUrl = String(response.data?.previewUrl || response.data?.url || '');
      setFormData((prev) => ({ ...prev, photoUrl: photoStoragePath }));
      setPhotoPreviewUrl(previewUrl);
      setErrors((prev) => ({ ...prev, photoUrl: '' }));
    } catch (error: any) {
      const message = error?.response?.data?.message;
      setErrors((prev) => ({
        ...prev,
        photoUrl: Array.isArray(message) ? message.join(', ') : message || 'Failed to upload photo',
      }));
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-screen-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="secondary" onClick={() => navigate('/users')}>
          Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Add New User</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">{errors.submit}</div>
        )}

        <Card title="User Information">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="First Name *"
              value={formData.firstName}
              onChange={(event) => setFormData({ ...formData, firstName: event.target.value })}
              placeholder="John"
              error={errors.firstName}
              required
            />
            <Input
              label="Last Name *"
              value={formData.lastName}
              onChange={(event) => setFormData({ ...formData, lastName: event.target.value })}
              placeholder="Doe"
              error={errors.lastName}
              required
            />
            <Input
              label="Email *"
              type="email"
              value={formData.email}
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              placeholder="john.doe@company.com"
              error={errors.email}
              required
            />
            <Input
              label="Password *"
              type="password"
              value={formData.password}
              onChange={(event) => setFormData({ ...formData, password: event.target.value })}
              placeholder="Minimum 8 characters"
              error={errors.password}
              required
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
              placeholder="+1-555-0100"
            />
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Profile Photo</label>
              <div className="flex flex-wrap items-center gap-3">
                {formData.photoUrl ? (
                  <img
                    src={photoPreviewUrl || formData.photoUrl}
                    alt="User profile preview"
                    className="h-16 w-16 rounded-full border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-slate-300 text-xs font-semibold text-slate-500">
                    No Photo
                  </div>
                )}
                <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  {uploadingPhoto ? 'Uploading...' : formData.photoUrl ? 'Change Photo' : 'Upload Photo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingPhoto}
                    onChange={handlePhotoFileChange}
                  />
                </label>
              </div>
              {errors.photoUrl && <p className="mt-1 text-sm text-red-600">{errors.photoUrl}</p>}
            </div>
            <div className="flex items-center gap-2 mt-7">
              <input
                id="active-user"
                type="checkbox"
                checked={formData.isActive}
                onChange={(event) => setFormData({ ...formData, isActive: event.target.checked })}
                className="w-4 h-4 text-primary-600"
              />
              <label htmlFor="active-user" className="text-sm text-gray-700 font-medium">
                Active user
              </label>
            </div>
          </div>
        </Card>

        <Card title="Role & Scope">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.role}
                onChange={(event) => handleRoleChange(event.target.value as UserRole)}
              >
                {USER_ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {roleNeedsCompany(formData.role) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
                <select
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                    errors.companyId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.companyId}
                  onChange={(event) =>
                    setFormData({ ...formData, companyId: event.target.value, branchId: '' })
                  }
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.companyName} ({company.companyCode})
                    </option>
                  ))}
                </select>
                {errors.companyId && <p className="mt-1 text-sm text-red-600">{errors.companyId}</p>}
              </div>
            )}

            {roleNeedsBranch(formData.role) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
                <select
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                    errors.branchId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.branchId}
                  onChange={(event) => setFormData({ ...formData, branchId: event.target.value })}
                  disabled={!formData.companyId}
                >
                  <option value="">Select Branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </option>
                  ))}
                </select>
                {errors.branchId && <p className="mt-1 text-sm text-red-600">{errors.branchId}</p>}
              </div>
            )}
          </div>
        </Card>

        <Card title="Task Permissions">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Select what this user is allowed to access. Use defaults to reset by role.
              </p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    taskPermissions: DEFAULT_TASK_PERMISSIONS_BY_ROLE[prev.role],
                  }))
                }
              >
                Use Role Defaults
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TASK_PERMISSION_OPTIONS.map((permission) => {
                const checked = formData.taskPermissions.includes(permission.value);
                return (
                  <label
                    key={permission.value}
                    className={`border rounded-lg p-3 cursor-pointer ${
                      checked ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handlePermissionToggle(permission.value)}
                        className="mt-1 w-4 h-4 text-primary-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{permission.label}</p>
                        <p className="text-xs text-gray-600 mt-1">{permission.description}</p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            {errors.taskPermissions && <p className="text-sm text-red-600">{errors.taskPermissions}</p>}
          </div>
        </Card>

        <div className="flex gap-3 sticky bottom-0 bg-white py-4 border-t">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create User'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => navigate('/users')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

