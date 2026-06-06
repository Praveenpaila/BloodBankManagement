import { useState } from 'react';
import toast from 'react-hot-toast';
import PublicLayout from '../shared/PublicLayout';
import api from '../../api/axios';
import { BLOOD_GROUPS } from '../../utils/bloodGroups';
import BloodGroupBadge from '../../components/common/BloodGroupBadge';

const PublicSearchPage = () => {
  const [filters, setFilters] = useState({ bloodGroup: '', city: '' });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const search = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.get('/donors/search', { params: filters });
      setResults(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-6">
          <h1 className="text-3xl font-black">Find eligible donors</h1>
          <p className="mt-2 text-slate-600">Search publicly by blood group and city. Sign up to request donors directly.</p>
        </div>
        <form className="card grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={search}>
          <select className="input-field" value={filters.bloodGroup} onChange={(e) => setFilters({ ...filters, bloodGroup: e.target.value })}>
            <option value="">All blood groups</option>
            {BLOOD_GROUPS.map((group) => <option key={group}>{group}</option>)}
          </select>
          <input className="input-field" placeholder="City" value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} />
          <button className="btn-primary" disabled={loading}>{loading ? 'Searching...' : 'Search'}</button>
        </form>
        {results && (
          <div className="mt-5 space-y-3">
            <div className="card">
              <h2 className="text-xl font-black">{results.count} eligible donor{results.count === 1 ? '' : 's'} found</h2>
            </div>
            {results.data.length === 0 ? (
              <div className="card text-center text-sm font-bold text-slate-500">No donors match your search. Try a different city or blood group.</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {results.data.map((donor) => (
                  <div className="card flex items-center justify-between gap-3" key={donor._id}>
                    <div>
                      <p className="font-black">{donor.firstName}</p>
                      <p className="text-sm text-slate-500">{donor.city || 'City not listed'}</p>
                    </div>
                    <BloodGroupBadge group={donor.bloodGroup} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </PublicLayout>
  );
};

export default PublicSearchPage;
