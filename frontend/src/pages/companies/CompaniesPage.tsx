import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Input from '../../components/common/Input';
import api from '../../services/api';
import { getStoredUser } from '../../utils/auth';

export default function CompaniesPage() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(companies.length / pageSize));
  const pagedCompanies = companies.slice((page - 1) * pageSize, page * pageSize);
  const showingFrom = companies.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, companies.length);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};

      if (searchTerm) params.search = searchTerm;

      const response = await api.get('/companies', { params });
      setCompanies(response.data.data || []);
    } catch {
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchTerm(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
  };

  const columns = [
    { key: 'companyCode', label: 'Code' },
    { key: 'companyName', label: 'Company Name' },
    {
      key: 'accountManager',
      label: 'Account Manager',
      render: (_: any, row: any) => (
        <span>{row.accountManager ? `${row.accountManager.firstName} ${row.accountManager.lastName}` : '-'}</span>
      ),
    },
    {
      key: 'city',
      label: 'Location',
      render: (val: string, row: any) => <span>{val ? `${val}, ${row.country || ''}` : '-'}</span>,
    },
    {
      key: 'defaultMultiplier',
      label: 'Default Multiplier',
      render: (val: number) => `${val}x`,
    },
    {
      key: 'branchCount',
      label: 'Total Branches',
      render: (val: number) => <span>{val ?? 0}</span>,
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

  if (isSuperAdmin) {
    columns.push({
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/companies/edit/${row.id}`)}
            className="app-table-action"
          >
            Edit
          </button>
          <button
            onClick={async () => {
              try {
                await api.patch(`/companies/${row.id}/status`, { isActive: !row.isActive });
                fetchCompanies();
              } catch (error) {
                console.error(error);
              }
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
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-sm text-gray-600 mt-1">
            {isSuperAdmin
              ? 'Manage your jewelry company partners'
              : 'View companies assigned to you'}
          </p>
        </div>
        {isSuperAdmin && <Button onClick={() => navigate('/companies/add')}>+ Add Company</Button>}
      </div>

      <Card className="mb-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by company name, code, city, country, or account manager"
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

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Company Directory</h2>
          <span className="text-xs text-gray-600">
            Showing {showingFrom}–{showingTo} of {companies.length} record{companies.length === 1 ? '' : 's'}
          </span>
        </div>
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : companies.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No companies found for selected filters.</div>
        ) : (
          <>
            <Table columns={columns} data={pagedCompanies} />
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
