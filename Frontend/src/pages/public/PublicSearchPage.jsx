import { useState } from 'react';
import toast from 'react-hot-toast';
import PublicLayout from '../shared/PublicLayout';
import api from '../../api/axios';
import { BLOOD_GROUPS } from '../../utils/bloodGroups';
import BloodGroupBadge from '../../components/common/BloodGroupBadge';

const PublicSearchPage = () => {
  const [filters, setFilters] = useState({ bloodGroup: '', city: '' });
  const [results, setResults] = useState(null);

  const search = async (event) => {
    event.preventDefault();
    try {
      const { data } = await api.get('/donors/search', { params: filters });
      setResults(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Search failed');
    }
  };

  return (
    <PublicLayout>
      <section className="mx-auto max-w-5xl px-4 py-12">
        <form className="card grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={search}>
          <select className="input-field" value={filters.bloodGroup} onChange={(e) => setFilters({ ...filters, bloodGroup: e.target.value })}>
            <option value="">All blood groups</option>
            {BLOOD_GROUPS.map((group) => <option key={group}>{group}</option>)}
          </select>
          <input className="input-field" placeholder="City" value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} />
          <button className="btn-primary">Search</button>
        </form>
        {results && (
          <div className="card mt-5">
            <h2 className="text-xl font-black">{results.count} eligible donors found</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {results.data.map((donor) => <BloodGroupBadge key={donor._id} group={donor.bloodGroup} />)}
            </div>
          </div>
        )}
      </section>
    </PublicLayout>
  );
};

export default PublicSearchPage;
