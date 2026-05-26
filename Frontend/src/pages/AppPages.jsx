import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import DashboardLayout from '../components/common/DashboardLayout';
import BloodGroupBadge from '../components/common/BloodGroupBadge';
import { SmallSpinner } from '../components/common/LoadingSpinner';
import api from '../api/axios';
import { useAuth } from '../context/authStore';
import { useSocket } from '../context/SocketContext';
import { BLOOD_GROUPS } from '../utils/bloodGroups';

const fmtDate = (value) => (value ? format(new Date(value), 'dd MMM yyyy') : 'N/A');
const urgencyClass = (value) =>
  value === 'critical'
    ? 'bg-red-50 text-red-700'
    : value === 'urgent'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-green-50 text-green-700';

const useApi = (loader, deps = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      setData(await loader());
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(reload, 0);
    return () => window.clearTimeout(timer);
    // The screens pass their own dependency lists into this small loader helper.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, reload };
};

const StatCard = ({ label, value, tone = 'slate' }) => (
  <div className="card">
    <p className="text-sm font-bold text-slate-500">{label}</p>
    <p className={`mt-2 text-3xl font-black text-${tone}-700`}>{value ?? 0}</p>
  </div>
);

const Empty = ({ text = 'No records yet.' }) => (
  <div className="card text-center text-sm font-bold text-slate-500">{text}</div>
);

const PageTable = ({ headers, rows, empty = 'No records found.' }) => (
  <div className="card table-wrap p-0">
    <table>
      <thead>
        <tr>{headers.map((item) => <th key={item}>{item}</th>)}</tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={headers.length} className="text-center text-slate-500">{empty}</td></tr>
        ) : rows}
      </tbody>
    </table>
  </div>
);

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-bold text-slate-700">{label}</span>
    {children}
  </label>
);

const exportCsv = (filename, rows) => {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const ForgotPasswordPage = () => {
  const [sent, setSent] = useState(false);
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <form
        className="card w-full max-w-md"
        onSubmit={(event) => {
          event.preventDefault();
          setSent(true);
          toast.success('Check your email');
        }}
      >
        <h1 className="text-2xl font-black">Forgot Password</h1>
        {sent ? <p className="mt-4 text-green-700">Check your email for reset instructions.</p> : (
          <>
            <Field label="Email"><input className="input-field" type="email" required /></Field>
            <button className="btn-primary mt-5 w-full">Send reset link</button>
          </>
        )}
      </form>
    </main>
  );
};

export const DonorDashboard = () => {
  const { user } = useAuth();
  const { data, loading } = useApi(async () => {
    const [eligibility, stats, history, notifications] = await Promise.all([
      api.get('/eligibility/status'),
      api.get('/loyalty/my-stats'),
      api.get('/donations/my-history'),
      api.get('/notifications'),
    ]);
    return {
      eligibility: eligibility.data.data,
      stats: stats.data.data,
      donations: history.data.data,
      notifications: notifications.data.data,
    };
  }, []);

  const status = data?.eligibility?.status || data?.eligibility?.record?.status || 'not checked';

  return (
    <DashboardLayout title={`Welcome back, ${user?.firstName || 'Donor'}`} subtitle="Your donation activity, eligibility and recent alerts.">
      {loading ? <SmallSpinner /> : (
        <div className="space-y-5">
          <div className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">{user?.firstName} {user?.lastName}</h2>
              <p className="text-sm text-slate-500">{user?.city}</p>
            </div>
            <BloodGroupBadge group={user?.bloodGroup} size="lg" />
          </div>
          <div className="page-grid">
            <StatCard label="Total Donations" value={data.stats.totalDonations} />
            <StatCard label="Points" value={data.stats.points} />
            <StatCard label="Badges Earned" value={`${data.stats.badges?.length || 0}/6`} />
            <StatCard label="Next Eligible Date" value={data.eligibility?.deferralUntil ? fmtDate(data.eligibility.deferralUntil) : 'Now'} />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className={`card ${status === 'eligible' ? 'border-green-200 bg-green-50' : status === 'not checked' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
              <h3 className="text-lg font-black">Eligibility</h3>
              <p className="mt-2 capitalize">{status.replaceAll('_', ' ')}</p>
              {data.eligibility?.deferralReason && <p className="mt-1 text-sm">{data.eligibility.deferralReason}</p>}
              <Link className="btn-primary mt-4" to="/donor/eligibility">Check Eligibility</Link>
            </div>
            <div className="card">
              <h3 className="text-lg font-black">Quick Actions</h3>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link className="btn-outline" to="/donor/appointments">Book Appointment</Link>
                <Link className="btn-outline" to="/donor/nearby-requests">View Map</Link>
                <Link className="btn-primary" to="/donor/sos">Emergency SOS</Link>
              </div>
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <PageTable headers={['Date', 'Hospital', 'Blood Group']} rows={data.donations.slice(0, 5).map((item) => (
              <tr key={item._id}><td>{fmtDate(item.donationDate)}</td><td>{item.hospital?.firstName}</td><td><BloodGroupBadge group={item.bloodGroup} size="sm" /></td></tr>
            ))} />
            <div className="card">
              <h3 className="text-lg font-black">Recent Notifications</h3>
              <div className="mt-3 space-y-3">
                {data.notifications.slice(0, 3).map((item) => (
                  <div key={item._id} className="rounded-lg border border-slate-200 p-3">
                    <p className="font-black">{item.title}</p>
                    <p className="text-sm text-slate-500">{item.message}</p>
                  </div>
                ))}
                {data.notifications.length === 0 && <p className="text-sm text-slate-500">No alerts yet.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export const DonorProfile = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', phoneNumber: user?.phoneNumber || '', city: user?.city || '', bloodGroup: user?.bloodGroup || 'O+' });

  const save = async (event) => {
    event.preventDefault();
    try {
      const { data } = await api.put('/auth/me', form);
      updateUser(data.data);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Profile update failed');
    }
  };

  const updateLocation = () => {
    navigator.geolocation?.getCurrentPosition(async ({ coords }) => {
      try {
        const { data } = await api.put('/donors/location', { lat: coords.latitude, lng: coords.longitude });
        updateUser(data.data);
        toast.success('Location updated');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Location update failed');
      }
    }, () => toast.error('Could not read location'));
  };

  return (
    <DashboardLayout title="My Profile">
      <form className="card grid gap-4 md:grid-cols-2" onSubmit={save}>
        {['firstName', 'lastName', 'phoneNumber', 'city'].map((field) => (
          <Field key={field} label={field}><input className="input-field" value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} required /></Field>
        ))}
        <Field label="Blood Group"><select className="input-field" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}>{BLOOD_GROUPS.map((group) => <option key={group}>{group}</option>)}</select></Field>
        <div className="flex items-end gap-3">
          <button className="btn-primary">Save Profile</button>
          <button type="button" className="btn-outline" onClick={updateLocation}>Update My Location</button>
        </div>
      </form>
      <div className="card mt-5">
        <h3 className="font-black">Password</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input className="input-field" type="password" placeholder="Current password" />
          <input className="input-field" type="password" placeholder="New password" />
          <input className="input-field" type="password" placeholder="Confirm password" />
        </div>
      </div>
    </DashboardLayout>
  );
};

export const EligibilityPage = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [result, setResult] = useState(null);
  const { data: previous } = useApi(async () => (await api.get('/eligibility/status')).data.data, []);
  const [form, setForm] = useState({
    age: user?.age || '',
    weight: '',
    recentIllness: false,
    medications: false,
    travelHistory: false,
    tattooPiercing: false,
    hemoglobin: '',
    gender: user?.gender?.toLowerCase() || 'male',
  });

  const submit = async () => {
    try {
      const { data } = await api.post('/eligibility/check', form);
      setResult(data.data);
      toast.success('Eligibility checked');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Eligibility check failed');
    }
  };

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const stepLabels = ['Basics', 'Health', 'Exposure', 'Vitals'];

  return (
    <DashboardLayout title="Eligibility Check" subtitle={`Step ${step}/4`}>
      {previous && <div className="status-strip mb-5"><p className="font-black">Previous result: <span className="capitalize">{(previous.status || previous.record?.status || '').replaceAll('_', ' ')}</span></p></div>}
      <div className="eligibility-card">
        <div className="eligibility-steps">
          {stepLabels.map((label, index) => (
            <button key={label} type="button" className={step >= index + 1 ? 'is-active' : ''} onClick={() => setStep(index + 1)}>
              <span>{index + 1}</span>
              {label}
            </button>
          ))}
        </div>
        <div className="mb-6 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-[#C0392B]" style={{ width: `${step * 25}%` }} /></div>
        {step === 1 && <div className="grid gap-4 md:grid-cols-2"><Field label="Age"><input className="input-field input-field-lg" type="number" min="18" placeholder="18 - 65" value={form.age} onChange={(e) => update('age', e.target.value)} /></Field><Field label="Weight in kg"><input className="input-field input-field-lg" type="number" min="45" placeholder="Minimum 45 kg" value={form.weight} onChange={(e) => update('weight', e.target.value)} /></Field></div>}
        {step === 2 && <ToggleGrid items={['recentIllness', 'medications']} form={form} update={update} />}
        {step === 3 && <ToggleGrid items={['travelHistory', 'tattooPiercing']} form={form} update={update} />}
        {step === 4 && <div className="grid gap-4 md:grid-cols-2"><Field label="Hemoglobin"><input className="input-field input-field-lg" type="number" step="0.1" placeholder="e.g. 13.5" value={form.hemoglobin} onChange={(e) => update('hemoglobin', e.target.value)} /></Field><Field label="Gender"><select className="input-field input-field-lg" value={form.gender} onChange={(e) => update('gender', e.target.value)}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></Field></div>}
        <div className="mt-6 flex justify-between">
          <button className="btn-outline" disabled={step === 1} onClick={() => setStep(step - 1)}>Back</button>
          {step < 4 ? <button className="btn-primary" onClick={() => setStep(step + 1)}>Next</button> : <button className="btn-primary" onClick={submit}>Submit</button>}
        </div>
      </div>
      {result && (
        <div className={`card mt-5 ${result.status === 'eligible' ? 'bg-green-50' : result.status === 'permanently_deferred' ? 'bg-red-50' : 'bg-amber-50'}`}>
          <h3 className="text-xl font-black capitalize">{result.status.replaceAll('_', ' ')}</h3>
          {result.reason && <p className="mt-2">{result.reason}</p>}
          {result.deferralUntil && <p className="mt-2">Eligible again on: {fmtDate(result.deferralUntil)}</p>}
        </div>
      )}
    </DashboardLayout>
  );
};

const ToggleGrid = ({ items, form, update }) => (
  <div className="grid gap-4 md:grid-cols-2">
    {items.map((item) => (
      <div key={item} className="choice-field">
        <div>
          <p className="choice-field__label">{item.replace(/([A-Z])/g, ' $1')}</p>
          <p className="choice-field__hint">Choose the current answer for this condition.</p>
        </div>
        <div className="segmented-control">
          <button type="button" className={!form[item] ? 'is-selected' : ''} onClick={() => update(item, false)}>No</button>
          <button type="button" className={form[item] ? 'is-selected' : ''} onClick={() => update(item, true)}>Yes</button>
        </div>
      </div>
    ))}
  </div>
);

export const BookAppointment = () => {
  const { data } = useApi(async () => {
    const [eligibility, hospitals, history] = await Promise.all([api.get('/eligibility/status'), api.get('/hospitals/list'), api.get('/donations/my-history')]);
    return { eligibility: eligibility.data.data, hospitals: hospitals.data.data, history: history.data.data };
  }, []);
  const [form, setForm] = useState({ hospital: '', date: null, timeSlot: 'Morning' });

  const eligible = data?.eligibility?.status === 'eligible';
  const submit = async () => {
    try {
      await api.post('/appointments', form);
      toast.success('Appointment confirmed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Appointment failed');
    }
  };

  return (
    <DashboardLayout title="Book Appointment">
      {!eligible ? <div className="card border-amber-200 bg-amber-50">Complete an eligible check before booking. <Link className="font-black text-[#C0392B]" to="/donor/eligibility">Check now</Link></div> : (
        <div className="card space-y-4">
          <Field label="Hospital"><select className="input-field" value={form.hospital} onChange={(e) => setForm({ ...form, hospital: e.target.value })}><option value="">Select hospital</option>{data?.hospitals?.map((item) => <option value={item._id} key={item._id}>{item.firstName}</option>)}</select></Field>
          <Field label="Date"><DatePicker className="input-field" minDate={new Date()} selected={form.date} onChange={(date) => setForm({ ...form, date })} /></Field>
          <div className="grid gap-3 md:grid-cols-3">{['Morning', 'Afternoon', 'Evening'].map((slot) => <button type="button" key={slot} className={form.timeSlot === slot ? 'btn-primary' : 'btn-outline'} onClick={() => setForm({ ...form, timeSlot: slot })}>{slot}</button>)}</div>
          <button className="btn-primary" onClick={submit}>Confirm Appointment</button>
        </div>
      )}
    </DashboardLayout>
  );
};

export const DonationHistory = () => {
  const { user } = useAuth();
  const { data, loading } = useApi(async () => (await api.get('/donations/my-history')).data, []);
  const donations = data?.data || [];
  const months = new Set(donations.map((item) => format(new Date(item.donationDate), 'yyyy-MM')));

  return (
    <DashboardLayout title="Donation History">
      {loading ? <SmallSpinner /> : (
        <div className="space-y-5">
          <div className="page-grid"><StatCard label="Total Donations" value={data.totalDonations} /><StatCard label="Lives Impacted" value={data.totalDonations * 3} /><StatCard label="Donation Streak" value={`${months.size} months`} /></div>
          <PageTable headers={['Date', 'Hospital', 'Blood Group', 'Units', 'Certificate']} rows={donations.map((item) => (
            <tr key={item._id}><td>{fmtDate(item.donationDate)}</td><td>{item.hospital?.firstName}</td><td><BloodGroupBadge group={item.bloodGroup} size="sm" /></td><td>{item.units}</td><td><button className="btn-outline" onClick={() => window.print()}>{item.certificateId}</button></td></tr>
          ))} />
          <div className="card print:block">
            <h3 className="text-xl font-black">Certificate Preview</h3>
            <p className="mt-2">This certifies that {user?.firstName} donated blood through BloodLink. Thank you for saving lives.</p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export const BadgesPage = () => {
  const { user } = useAuth();
  const { data, loading } = useApi(async () => {
    const [stats, leaderboard] = await Promise.all([api.get('/loyalty/my-stats'), api.get('/loyalty/leaderboard')]);
    return { stats: stats.data.data, leaderboard: leaderboard.data.data };
  }, []);
  const allBadges = ['First Drop', 'Life Saver', 'Blood Hero', 'Rare Type', 'Monthly Champion', 'Emergency Responder'];

  return (
    <DashboardLayout title="Badges & Points">
      {loading ? <SmallSpinner /> : (
        <div className="space-y-5">
          <div className="card"><p className="text-sm font-bold text-slate-500">Points Balance</p><p className="text-5xl font-black text-[#C0392B]">{data.stats.points}</p><div className="mt-4 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-[#C0392B]" style={{ width: `${Math.min((data.stats.points % 1000) / 10, 100)}%` }} /></div></div>
          <div className="grid gap-4 md:grid-cols-3">{allBadges.map((badge) => <div key={badge} className={`card ${data.stats.badges?.includes(badge) ? 'border-green-200 bg-green-50' : 'grayscale'}`}><h3 className="font-black">{badge}</h3><p className="mt-2 text-sm">{data.stats.badges?.includes(badge) ? 'EARNED' : 'Locked'}</p></div>)}</div>
          <PageTable headers={['Action', 'Points', 'Date']} rows={data.stats.records.map((item) => <tr key={item._id}><td>{item.action}</td><td>{item.points}</td><td>{fmtDate(item.createdAt)}</td></tr>)} />
          <PageTable headers={['Rank', 'Name', 'Blood', 'Points']} rows={data.leaderboard.map((item, index) => <tr key={item._id} className={item._id === user?._id ? 'bg-red-50' : ''}><td>{index + 1}</td><td>{item.firstName} {item.lastName}</td><td><BloodGroupBadge group={item.bloodGroup} size="sm" /></td><td>{item.points}</td></tr>)} />
        </div>
      )}
    </DashboardLayout>
  );
};

export const NotificationsPage = () => <NotificationsView title="Notifications" />;
export const HospitalNotifications = () => <NotificationsView title="Hospital Notifications" hospital />;

const NotificationsView = ({ title }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { data, reload } = useApi(async () => (await api.get('/notifications')).data.data, []);

  useEffect(() => {
    if (!socket) return undefined;
    const refresh = () => reload();
    socket.on('blood-request:new', refresh);
    socket.on('blood-request:closed', refresh);
    socket.on('blood-request:response', refresh);
    return () => {
      socket.off('blood-request:new', refresh);
      socket.off('blood-request:closed', refresh);
      socket.off('blood-request:response', refresh);
    };
    // reload is provided by the local useApi helper and refreshed by this subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const respond = async (requestId, action) => {
    try {
      if (!requestId) {
        toast.error('Request details are missing');
        return;
      }
      const { data } = await api.put(`/blood-requests/${requestId}/respond`, { action });
      toast.success(`Request ${action}ed`);
      reload();
      if (action === 'accept') {
        const acceptedRequestId = data?.data?.request?._id || requestId;
        navigate(`/${user?.role || 'donor'}/chat/${acceptedRequestId}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Response failed');
    }
  };
  const markAll = async () => {
    await api.put('/notifications/read-all');
    toast.success('All read');
    reload();
  };
  return (
    <DashboardLayout title={title}>
      <button className="btn-outline mb-4" onClick={markAll}>Mark all read</button>
      <div className="space-y-3">{(data || []).filter(Boolean).map((item, index) => (
        <div key={item._id || `${item.type || 'notification'}-${index}`} className={`card ${!item.isRead ? 'bg-red-50' : ''}`}>
          <div className="flex flex-wrap justify-between gap-2"><h3 className="font-black">{item.title}</h3><span className="text-sm text-slate-500">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span></div>
          <p className="mt-1 text-sm text-slate-600">{item.message}</p>
          {item.type === 'blood_request' && !item.data?.closed && !item.data?.response && <div className="mt-3 flex gap-2"><button className="btn-primary" onClick={() => respond(item.data?.requestId, 'accept')}>Accept</button><button className="btn-outline" onClick={() => respond(item.data?.requestId, 'decline')}>Decline</button></div>}
          {item.type === 'blood_request' && item.data?.response && <p className="mt-3 text-sm font-bold text-slate-500">You {item.data.response}ed this request</p>}
          {item.type === 'blood_request' && item.data?.closed && <p className="mt-3 text-sm font-bold text-slate-500">Covered by {item.data?.acceptedDonorName || 'another donor'}</p>}
          {item.type === 'donor_response' && item.data?.requestId && <button className="btn-outline mt-3" onClick={() => navigate(`/${user.role}/chat/${item.data.requestId}`)}>Open Chat</button>}
        </div>
      ))}{(!data || data.length === 0) && <Empty text="No notifications." />}</div>
    </DashboardLayout>
  );
};

export const NearbyRequestsPage = () => {
  const { user, updateUser } = useAuth();
  const coords = user?.location?.coordinates;
  const { data, reload } = useApi(async () => {
    if (!coords?.length) return [];
    return (await api.get('/blood-requests/nearby', {
      params: { lat: coords[1], lng: coords[0] },
    })).data.data;
  }, [coords?.join(',')]);

  const enable = () => {
    if (!navigator.geolocation) {
      toast.error('Location is not available in this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords: c }) => {
        try {
          const { data: response } = await api.put('/donors/location', { lat: c.latitude, lng: c.longitude });
          updateUser(response.data);
          reload();
          toast.success('Location updated');
        } catch (err) {
          toast.error(err.response?.data?.message || 'Location update failed');
        }
      },
      () => toast.error('Location permission was denied'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <DashboardLayout title="Nearby Requests">
      {!coords?.length ? <div className="card"><p className="font-black">Enable your location to see nearby requests.</p><button className="btn-primary mt-4" onClick={enable}>Update Location</button></div> : (
        <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
          <div className="card min-h-96">{import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'Map view is ready for configured Google Maps key.' : 'Google Maps API key is not set. Nearby requests are listed on the right.'}</div>
          <div className="space-y-3">{(data || []).filter(Boolean).map((item, index) => <RequestCard key={item._id || `request-${index}`} request={item} />)}{(!data || data.length === 0) && <Empty text="No nearby open requests." />}</div>
        </div>
      )}
    </DashboardLayout>
  );
};

const RequestCard = ({ request }) => (
  <div className="card">
    <div className="flex items-center justify-between"><BloodGroupBadge group={request.bloodGroup} /><span className={`badge-pill ${urgencyClass(request.urgency)}`}>{request.urgency}</span></div>
    <p className="mt-3 font-bold">{request.requestedBy?.firstName || 'Hospital'}</p>
    <p className="text-sm text-slate-500">{request.unitsNeeded} unit(s), {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}</p>
  </div>
);

export const HospitalDashboard = () => {
  const { user } = useAuth();
  const { data } = useApi(async () => {
    const [inventory, requests, expiry] = await Promise.all([api.get('/inventory'), api.get('/blood-requests'), api.get('/inventory/expiry-alerts')]);
    return { inventory: inventory.data.data, requests: requests.data.data, expiry: expiry.data.data };
  }, []);
  const totals = BLOOD_GROUPS.map((group) => ({ group, units: (data?.inventory || []).filter((i) => i.bloodGroup === group).reduce((sum, i) => sum + i.units, 0) }));
  return (
    <DashboardLayout title="Hospital Dashboard">
      {user?.isApproved === false && <div className="card mb-5 border-amber-200 bg-amber-50">Approval pending. Admin approval is required for full operations.</div>}
      <div className="page-grid">{totals.map(({ group, units }) => <div key={group} className="card"><BloodGroupBadge group={group} /><p className={`mt-3 text-3xl font-black ${units < 5 ? 'text-red-700' : units <= 10 ? 'text-amber-700' : 'text-green-700'}`}>{units}</p><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-[#C0392B]" style={{ width: `${Math.min(units * 5, 100)}%` }} /></div></div>)}</div>
      <div className="page-grid mt-5"><StatCard label="Open Requests" value={(data?.requests || []).filter((r) => r.status === 'open').length} /><StatCard label="Fulfilled Today" value={(data?.requests || []).filter((r) => r.status === 'fulfilled').length} /><StatCard label="Expiry Alerts" value={(data?.expiry || []).length} /></div>
    </DashboardLayout>
  );
};

export const BloodInventory = () => {
  const { data, reload } = useApi(async () => (await api.get('/inventory')).data.data, []);
  const [form, setForm] = useState({ bloodGroup: 'O+', units: 1, expiryDate: '' });
  const save = async () => {
    try {
      await api.post('/inventory', form);
      toast.success('Stock added');
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Stock save failed');
    }
  };
  const del = async (id) => {
    await api.delete(`/inventory/${id}`);
    toast.success('Stock deleted');
    reload();
  };
  return (
    <DashboardLayout title="Blood Inventory">
      <div className="card mb-5 grid gap-3 md:grid-cols-4"><select className="input-field" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}>{BLOOD_GROUPS.map((group) => <option key={group}>{group}</option>)}</select><input className="input-field" type="number" value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} /><input className="input-field" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /><button className="btn-primary" onClick={save}>Add Stock</button></div>
      <button className="btn-outline mb-4" onClick={() => exportCsv('inventory.csv', [['Blood Group', 'Units', 'Expiry'], ...(data || []).map((i) => [i.bloodGroup, i.units, fmtDate(i.expiryDate)])])}>Export CSV</button>
      <PageTable headers={['Blood Group', 'Units', 'Expiry Date', 'Status', 'Actions']} rows={(data || []).map((item) => <tr key={item._id} className={item.units < 5 ? 'bg-red-50' : item.units <= 10 ? 'bg-amber-50' : ''}><td><BloodGroupBadge group={item.bloodGroup} size="sm" /></td><td>{item.units}</td><td>{fmtDate(item.expiryDate)}</td><td>{item.units < 5 ? 'Critical' : item.units <= 10 ? 'Warning' : 'Safe'}</td><td><button className="btn-outline" onClick={() => del(item._id)}>Delete</button></td></tr>)} />
    </DashboardLayout>
  );
};

export const RaiseRequest = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ bloodGroup: 'O+', urgency: 'normal', unitsNeeded: 1, radiusKm: 10, notes: '' });
  const [requestingLocation, setRequestingLocation] = useState(false);
  const coords = user?.location?.coordinates;
  const hasLocation = coords?.length >= 2;
  const { data: count, reload } = useApi(async () => {
    if (!hasLocation) return 0;
    const response = await api.get('/donors/count', {
      params: {
        bloodGroup: form.bloodGroup,
        lat: coords[1],
        lng: coords[0],
        radius: form.radiusKm,
      },
    });
    return response.data.data.count;
  }, [form.bloodGroup, form.radiusKm, coords?.join(',')]);

  const updateLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location is not available in this browser');
      return;
    }

    setRequestingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: c }) => {
        try {
          const { data } = await api.put('/donors/location', { lat: c.latitude, lng: c.longitude });
          updateUser(data.data);
          toast.success('Location updated');
        } catch (err) {
          toast.error(err.response?.data?.message || 'Location update failed');
        } finally {
          setRequestingLocation(false);
        }
      },
      () => {
        toast.error('Location permission was denied');
        setRequestingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submit = async () => {
    if (!hasLocation) {
      toast.error('Update your location before raising SOS');
      return;
    }

    try {
      const { data } = await api.post('/blood-requests', {
        ...form,
        unitsNeeded: Number(form.unitsNeeded),
        radiusKm: Number(form.radiusKm),
        lat: coords[1],
        lng: coords[0],
      });
      toast.success(`SOS sent to ${data.data.notifiedDonors} donors by ${data.data.matchingAlgorithm}`);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Request failed');
    }
  };
  const isDonorSos = user?.role === 'donor';
  return (
    <DashboardLayout title={isDonorSos ? 'Emergency Blood SOS' : 'Raise Blood Request'} subtitle="Dispatch an urgent donor alert and connect with the first accepting donor.">
      {!hasLocation && (
        <div className="card mb-5 border-amber-200 bg-amber-50">
          <p className="font-black text-amber-800">Location is required to alert nearby donors.</p>
          <button className="btn-primary mt-4" type="button" onClick={updateLocation} disabled={requestingLocation}>
            {requestingLocation ? 'Updating Location...' : 'Use My Location'}
          </button>
        </div>
      )}
      <div className="request-console">
        <div className="request-console__panel">
          <p className="text-sm font-black uppercase tracking-wide text-slate-500">Blood group</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">{BLOOD_GROUPS.map((group) => <button type="button" key={group} className={form.bloodGroup === group ? 'blood-chip is-selected' : 'blood-chip'} onClick={() => setForm({ ...form, bloodGroup: group })}>{group}</button>)}</div>
          <p className="mt-6 text-sm font-black uppercase tracking-wide text-slate-500">Urgency</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">{['normal', 'urgent', 'critical'].map((urgency) => <button type="button" key={urgency} className={form.urgency === urgency ? 'dispatch-option is-selected' : 'dispatch-option'} onClick={() => setForm({ ...form, urgency })}>{urgency}</button>)}</div>
        </div>
        <div className="request-console__panel">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Units needed"><input className="input-field input-field-lg" type="number" min="1" value={form.unitsNeeded} onChange={(e) => setForm({ ...form, unitsNeeded: e.target.value })} /></Field>
            <Field label={`Radius: ${form.radiusKm} km`}><input className="range-field" type="range" min="5" max="50" value={form.radiusKm} onChange={(e) => setForm({ ...form, radiusKm: e.target.value })} /></Field>
          </div>
          <Field label="Request notes"><textarea className="input-field min-h-28" placeholder="Patient, ward, timing or contact instructions" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="dispatch-summary">
            <div>
              <p className="text-sm font-bold text-slate-500">Matching eligible donors</p>
              <p className="text-3xl font-black text-red-700">{count || 0}</p>
            </div>
            <button className="btn-primary" onClick={submit} disabled={!hasLocation}>{isDonorSos ? 'Raise Emergency SOS' : 'Request Blood'}</button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export const RequestStatus = () => <RequestsList hospital />;
export const RequestsLog = () => <RequestsList admin />;

export const ChatPage = () => {
  const { requestId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [conversation, setConversation] = useState(null);
  const [message, setMessage] = useState('');
  const [completing, setCompleting] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get(`/chats/${requestId}`);
      setConversation(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Chat is not available yet');
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
    // Load when the request id changes; load itself closes over that id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  useEffect(() => {
    if (!socket || !requestId) return undefined;
    socket.emit('request:join', requestId);
    const onMessage = ({ requestId: incomingRequestId, message: incoming }) => {
      if (!incoming?._id || String(incomingRequestId) !== String(requestId)) return;
      setConversation((current) => current ? {
        ...current,
        messages: (current.messages || []).some((item) => item._id === incoming._id)
          ? current.messages || []
          : [...(current.messages || []), incoming],
      } : current);
    };
    socket.on('chat:message', onMessage);
    return () => socket.off('chat:message', onMessage);
  }, [socket, requestId]);

  const send = async (event) => {
    event.preventDefault();
    if (!message.trim()) return;
    try {
      await api.post(`/chats/${requestId}/messages`, { message });
      setMessage('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Message failed');
    }
  };

  const requesterId = conversation?.hospital?._id || conversation?.hospital;
  const isRequester = String(requesterId) === String(user?._id);
  const other = isRequester ? conversation?.donor : conversation?.hospital;

  const completeDonation = async () => {
    setCompleting(true);
    try {
      const { data } = await api.put(`/blood-requests/${requestId}/complete-donation`);
      setConversation((current) => current ? {
        ...current,
        request: { ...current.request, status: data.data.request.status },
      } : current);
      toast.success('Donation completed. Donor deferred for 30 days.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not complete donation');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <DashboardLayout title="Request Chat" subtitle={conversation ? `${conversation.request?.bloodGroup} blood, ${conversation.request?.unitsNeeded} unit(s)` : 'Connecting donor and requester'}>
      {!conversation ? <SmallSpinner /> : (
        <div className="chat-shell">
          <aside className="chat-side">
            <BloodGroupBadge group={conversation.request?.bloodGroup} size="lg" />
            <h2>{other?.firstName} {other?.lastName}</h2>
            <p>{other?.phoneNumber || 'Phone not shared'}</p>
            <span className={`badge-pill ${urgencyClass(conversation.request?.urgency)}`}>{conversation.request?.urgency}</span>
            {isRequester && conversation.request?.status !== 'fulfilled' && (
              <button className="btn-primary mt-4 w-full" disabled={completing} onClick={completeDonation}>
                {completing ? 'Completing...' : 'Mark Donation Completed'}
              </button>
            )}
          </aside>
          <section className="chat-panel">
            <div className="chat-messages">
              {(conversation.messages || []).map((item) => {
                const mine = String(item.sender?._id || item.sender) === String(user?._id);
                return (
                  <div key={item._id} className={mine ? 'chat-bubble is-mine' : 'chat-bubble'}>
                    <p>{item.message}</p>
                    <span>{format(new Date(item.createdAt), 'hh:mm a')}</span>
                  </div>
                );
              })}
            </div>
            <form className="chat-input" onSubmit={send}>
              <input className="input-field" placeholder="Type a message" value={message} onChange={(e) => setMessage(e.target.value)} />
              <button className="btn-primary">Send</button>
            </form>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
};

const RequestsList = ({ admin = false }) => {
  const navigate = useNavigate();
  const endpoint = admin ? '/admin/requests' : '/blood-requests';
  const { data, reload } = useApi(async () => (await api.get(endpoint)).data, []);
  const rows = admin ? data?.data || [] : data?.data || [];
  const setStatus = async (id, status) => {
    await api.put(`/blood-requests/${id}/status`, { status });
    toast.success('Status updated');
    reload();
  };
  return (
    <DashboardLayout title={admin ? 'Requests Log' : 'Request Status'}>
      <PageTable headers={['Hospital', 'Blood', 'Units', 'Urgency', 'Status', 'Notified', 'Date', 'Actions']} rows={rows.filter(Boolean).map((item, index) => <tr key={item._id || `request-${index}`}><td>{item.requestedBy?.firstName}</td><td><BloodGroupBadge group={item.bloodGroup} size="sm" /></td><td>{item.unitsNeeded}</td><td><span className={`badge-pill ${urgencyClass(item.urgency)}`}>{item.urgency}</span></td><td>{item.status}</td><td>{item.notifiedDonors?.length || 0}</td><td>{fmtDate(item.createdAt)}</td><td><div className="flex gap-2">{!admin && item.status === 'responding' && item._id && <button className="btn-outline" onClick={() => navigate(`/hospital/chat/${item._id}`)}>Chat</button>}{!admin && item.status === 'responding' && item._id && <button className="btn-outline" onClick={() => setStatus(item._id, 'fulfilled')}>Mark Fulfilled</button>}</div></td></tr>)} />
    </DashboardLayout>
  );
};

export const DonorSearch = () => {
  const [query, setQuery] = useState({ bloodGroup: '', city: '' });
  const [results, setResults] = useState([]);
  const search = async () => {
    const { data } = await api.get('/donors/search', { params: query });
    setResults(data.data);
  };
  return (
    <DashboardLayout title="Donor Search">
      <div className="card mb-5 grid gap-3 md:grid-cols-3"><select className="input-field" value={query.bloodGroup} onChange={(e) => setQuery({ ...query, bloodGroup: e.target.value })}><option value="">Any blood group</option>{BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}</select><input className="input-field" placeholder="City" value={query.city} onChange={(e) => setQuery({ ...query, city: e.target.value })} /><button className="btn-primary" onClick={search}>Search</button></div>
      <div className="page-grid">{results.map((item) => <div className="card" key={item._id}><h3 className="font-black">{item.firstName}</h3><BloodGroupBadge group={item.bloodGroup} /><p className="mt-2 text-sm">{item.city}</p><button className="btn-outline mt-3" onClick={() => toast.success('Direct notification ready')}>Request This Donor</button></div>)}</div>
    </DashboardLayout>
  );
};

export const ExpiryAlerts = () => {
  const { data, reload } = useApi(async () => (await api.get('/inventory/expiry-alerts')).data.data, []);
  const del = async (id) => { await api.delete(`/inventory/${id}`); toast.success('Stock removed'); reload(); };
  const [weekCutoff] = useState(() => new Date(Date.now() + 7 * 86400000));
  const week = (data || []).filter((item) => new Date(item.expiryDate) <= weekCutoff).length;
  return (
    <DashboardLayout title="Expiry Alerts">
      <div className="card mb-5"><p className="text-xl font-black">{week} units expiring this week</p></div>
      <PageTable headers={['Blood Group', 'Units', 'Expiry Date', 'Days Left', 'Actions']} rows={(data || []).map((item) => {
        const days = Math.ceil((new Date(item.expiryDate) - new Date()) / 86400000);
        return <tr key={item._id}><td><BloodGroupBadge group={item.bloodGroup} size="sm" /></td><td>{item.units}</td><td>{fmtDate(item.expiryDate)}</td><td><span className={`badge-pill ${days <= 7 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{days}</span></td><td><button className="btn-outline" onClick={() => del(item._id)}>Discard</button></td></tr>;
      })} />
    </DashboardLayout>
  );
};

export const HospitalProfile = () => <DonorProfile />;

export const AdminDashboard = () => {
  const { data } = useApi(async () => {
    const [stats, analytics, inventory, pending] = await Promise.all([api.get('/admin/stats'), api.get('/admin/analytics'), api.get('/admin/inventory'), api.get('/admin/users?role=hospital&limit=5')]);
    return { stats: stats.data.data, analytics: analytics.data.data, inventory: inventory.data.data, pending: pending.data.data.filter((u) => !u.isApproved) };
  }, []);
  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="page-grid">{['totalUsers', 'totalDonors', 'totalHospitals', 'totalBloodUnits', 'requestsToday', 'fulfilledToday', 'pendingHospitalApprovals'].map((key) => <StatCard key={key} label={key} value={data?.stats?.[key]} />)}</div>
      {data?.inventory?.critical?.length > 0 && <div className="card mt-5 border-red-200 bg-red-50">Critical shortage: {data.inventory.critical.map((i) => i.bloodGroup).join(', ')}</div>}
      <div className="mt-5 grid gap-5 lg:grid-cols-2"><Chart title="Donations By Month" data={data?.analytics?.donationsByMonth?.map((i) => ({ name: `${i._id.month}/${i._id.year}`, value: i.count })) || []} /><PieBox title="Blood Group Distribution" data={data?.analytics?.bloodGroupDistribution?.map((i) => ({ name: i._id, value: i.count })) || []} /></div>
    </DashboardLayout>
  );
};

export const UserManagement = () => {
  const [role, setRole] = useState('');
  const { data, reload } = useApi(async () => (await api.get(`/admin/users?role=${role}`)).data.data, [role]);
  const action = async (id, name) => { await api.put(`/admin/users/${id}/${name}`); toast.success(`User ${name}d`); reload(); };
  return (
    <DashboardLayout title="User Management">
      <div className="mb-4 flex flex-wrap gap-2">{['', 'donor', 'hospital', 'organization', 'admin'].map((r) => <button key={r || 'all'} className={role === r ? 'btn-primary' : 'btn-outline'} onClick={() => setRole(r)}>{r || 'All'}</button>)}</div>
      <PageTable headers={['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions']} rows={(data || []).map((u) => <tr key={u._id}><td>{u.firstName} {u.lastName}</td><td>{u.email}</td><td>{u.role}</td><td>{u.isActive ? 'Active' : 'Suspended'} {u.role === 'hospital' && !u.isApproved ? '/ Pending' : ''}</td><td>{fmtDate(u.createdAt)}</td><td className="flex gap-2">{u.role === 'hospital' && !u.isApproved && <button className="btn-outline" onClick={() => action(u._id, 'approve')}>Approve</button>}<button className="btn-outline" onClick={() => action(u._id, u.isActive ? 'suspend' : 'activate')}>{u.isActive ? 'Suspend' : 'Activate'}</button></td></tr>)} />
    </DashboardLayout>
  );
};

export const InventoryOverview = () => {
  const { data } = useApi(async () => (await api.get('/admin/inventory')).data.data, []);
  const chart = (data?.byBloodGroup || []).map((i) => ({ name: i._id, value: i.totalUnits }));
  return <DashboardLayout title="Inventory Overview"><div className="page-grid mb-5">{chart.map((i) => <StatCard key={i.name} label={i.name} value={i.value} />)}</div><Chart title="Units Per Blood Group" data={chart} /></DashboardLayout>;
};

export const DonorAnalytics = () => {
  const { data } = useApi(async () => (await api.get('/admin/analytics')).data.data, []);
  const retention = data?.retentionRate || {};
  return (
    <DashboardLayout title="Donor Analytics">
      <div className="grid gap-5 lg:grid-cols-2"><Chart title="Donations By Month" data={data?.donationsByMonth?.map((i) => ({ name: `${i._id.month}/${i._id.year}`, value: i.count })) || []} /><PieBox title="Retention" data={[{ name: 'Returning', value: retention.returning || 0 }, { name: 'One Time', value: retention.oneTime || 0 }]} /></div>
      <PageTable headers={['Name', 'Blood', 'Points', 'Donations']} rows={(data?.topDonors || []).map((u) => <tr key={u._id}><td>{u.firstName} {u.lastName}</td><td><BloodGroupBadge group={u.bloodGroup} size="sm" /></td><td>{u.points}</td><td>{u.totalDonations}</td></tr>)} />
    </DashboardLayout>
  );
};

export const BroadcastAlerts = () => {
  const [form, setForm] = useState({ targetRole: '', targetBloodGroup: '', title: '', message: '' });
  const send = async () => {
    try {
      const { data } = await api.post('/admin/broadcast', form);
      toast.success(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Broadcast failed');
    }
  };
  return (
    <DashboardLayout title="Broadcast Alerts">
      <div className="card grid gap-4">
        <select className="input-field" value={form.targetRole} onChange={(e) => setForm({ ...form, targetRole: e.target.value })}><option value="">All Users</option><option value="donor">All Donors</option><option value="hospital">All Hospitals</option></select>
        <select className="input-field" value={form.targetBloodGroup} onChange={(e) => setForm({ ...form, targetBloodGroup: e.target.value })}><option value="">Any Blood Group</option>{BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}</select>
        <input className="input-field" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea className="input-field" placeholder="Message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        <div className="rounded-lg border border-slate-200 p-4"><p className="font-black">{form.title || 'Preview title'}</p><p className="text-sm text-slate-500">{form.message || 'Preview message'}</p></div>
        <button className="btn-primary" onClick={send}>Send Broadcast</button>
      </div>
    </DashboardLayout>
  );
};

export const SystemSettings = () => {
  const [settings, setSettings] = useState(() => JSON.parse(localStorage.getItem('bloodlinkSettings') || '{"radius":10,"expiry":14,"escalation":30}'));
  const save = () => { localStorage.setItem('bloodlinkSettings', JSON.stringify(settings)); toast.success('Settings saved'); };
  return <DashboardLayout title="System Settings"><div className="card grid gap-4 md:grid-cols-3">{['radius', 'expiry', 'escalation'].map((key) => <Field key={key} label={key}><input className="input-field" type="number" value={settings[key]} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} /></Field>)}<button className="btn-primary md:col-span-3" onClick={save}>Save</button></div></DashboardLayout>;
};

export const Reports = () => <DashboardLayout title="Reports"><div className="card"><button className="btn-primary" onClick={() => toast.success('Report generated')}>Generate Report</button><button className="btn-outline ml-3" onClick={() => exportCsv('report.csv', [['Report'], ['BloodLink']])}>Export CSV</button></div></DashboardLayout>;

const Chart = ({ title, data }) => (
  <div className="card h-80">
    <h3 className="mb-4 font-black">{title}</h3>
    <ResponsiveContainer width="100%" height="85%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#C0392B" /></BarChart></ResponsiveContainer>
  </div>
);

const PieBox = ({ title, data }) => (
  <div className="card h-80">
    <h3 className="mb-4 font-black">{title}</h3>
    <ResponsiveContainer width="100%" height="85%"><PieChart><Pie data={data} dataKey="value" nameKey="name" outerRadius={90} label>{data.map((_, index) => <Cell key={index} fill={['#C0392B', '#1A2340', '#16A34A', '#D97706'][index % 4]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
  </div>
);
