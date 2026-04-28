import { apiRequest } from './client';
import type { BranchEmployee, BranchOption } from '../types';

export const fetchBranchEmployees = (token: string) =>
  apiRequest<BranchEmployee[]>('/branch-employees', { method: 'GET' }, token);

export const fetchBranchEmployeeBranches = (token: string) =>
  apiRequest<BranchOption[]>('/branch-employees/branches', { method: 'GET' }, token);

export type CreateBranchEmployeePayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  branchId?: string;
};

export const createBranchEmployee = (token: string, payload: CreateBranchEmployeePayload) =>
  apiRequest<BranchEmployee>('/branch-employees', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);

export type UpdateBranchEmployeePayload = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  branchId?: string;
};

export const updateBranchEmployee = (token: string, id: string, payload: UpdateBranchEmployeePayload) =>
  apiRequest<BranchEmployee>(`/branch-employees/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, token);

export const updateBranchEmployeeStatus = (token: string, id: string, isActive: boolean) =>
  apiRequest<BranchEmployee>(`/branch-employees/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  }, token);
