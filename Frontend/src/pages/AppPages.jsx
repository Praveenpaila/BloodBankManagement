import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Award,
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarPlus,
  CalendarDays,
  CheckCircle,
  Clock,
  Download,
  Droplet,
  HeartPulse,
  LocateFixed,
  LogIn,
  MapPin,
  Megaphone,
  Navigation,
  MessageCircle,
  Package,
  Phone,
  Plus,
  Radio,
  Save,
  Search as SearchIcon,
  Send,
  ShieldCheck,
  Stethoscope,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react';
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
const mapsUrl = (location) => {
  const [lng, lat] = location?.coordinates || [];
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : '#';
};
const urgencyClass = (value) =>
  value === 'critical'
    ? 'bg-red-50 text-red-700'
    : value === 'urgent'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-green-50 text-green-700';
const statusClasses = {
  open: 'bg-yellow-50 text-yellow-700',
  responding: 'bg-blue-50 text-blue-700',
  fulfilled: 'bg-green-50 text-green-700',
  completed: 'bg-green-50 text-green-700',
  active: 'bg-green-50 text-green-700',
  scheduled: 'bg-amber-50 text-amber-700',
  pending: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-slate-100 text-slate-600',
  suspended: 'bg-slate-100 text-slate-600',
};
const statusClass = (value) => statusClasses[value] || 'bg-slate-100 text-slate-600';

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

  return { data, loading, reload, setData };
};

const statIconFor = (label = '') => {
  const normalized = label.toLowerCase();
  if (normalized.includes('donor') || normalized.includes('user') || normalized.includes('hospital')) return Users;
  if (normalized.includes('appointment') || normalized.includes('date') || normalized.includes('today')) return CalendarDays;
  if (normalized.includes('badge') || normalized.includes('point') || normalized.includes('rank')) return Award;
  if (normalized.includes('expiry') || normalized.includes('eligible')) return HeartPulse;
  if (normalized.includes('unit') || normalized.includes('inventory') || normalized.includes('stock')) return Package;
  return Droplet;
};

const StatCard = ({ label, value, tone = 'slate' }) => {
  const Icon = statIconFor(label);
  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-500">{label}</p>
        <Icon className="text-[#C0392B]" size={20} />
      </div>
      <p className={`mt-2 text-3xl font-black text-${tone}-700`}>{value ?? 0}</p>
    </div>
  );
};

const Empty = ({ text = 'No records yet.', title = 'Nothing here yet' }) => (
  <div className="empty-state">
    <Droplet size={34} />
    <h3>{title}</h3>
    <p>{text}</p>
  </div>
);

const PageTable = ({ headers, rows, empty = 'No records found.' }) => (
  <div className="card table-wrap p-0">
    <table>
      <thead>
        <tr>{headers.map((item) => <th key={item}>{item}</th>)}</tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={headers.length}><Empty title="No records" text={empty} /></td></tr>
        ) : rows}
      </tbody>
    </table>
  </div>
);

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 flex items-center gap-1 text-sm font-bold text-slate-700"><Users size={15} /> {label}</span>
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
  const [step, setStep] = useState('email');
  const [form, setForm] = useState({ email: '', token: '', newPassword: '' });
  const [loading, setLoading] = useState(false);

  const requestReset = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: form.email });
      toast.success('Reset code sent');
      setStep('reset');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send reset code');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token: form.token, newPassword: form.newPassword });
      toast.success('Password reset successful');
      setStep('done');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <form className="card w-full max-w-md" onSubmit={step === 'email' ? requestReset : resetPassword}>
        <h1 className="text-2xl font-black">Forgot Password</h1>
        {step === 'done' ? (
          <div className="mt-4">
            <p className="text-green-700">Your password has been reset.</p>
            <Link className="btn-primary mt-4" to="/login"><LogIn size={16} /> Back to Login</Link>
          </div>
        ) : step === 'email' ? (
          <>
            <Field label="Email"><input className="input-field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
            <button className="btn-primary mt-5 w-full" disabled={loading}><Send size={16} /> {loading ? 'Sending...' : 'Send reset code'}</button>
          </>
        ) : (
          <>
            <Field label="Reset code"><input className="input-field" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} required /></Field>
            <Field label="New password"><input className="input-field" type="password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} required minLength={6} /></Field>
            <button className="btn-primary mt-5 w-full" disabled={loading}><Save size={16} /> {loading ? 'Resetting...' : 'Reset password'}</button>
          </>
        )}
      </form>
    </main>
  );
};

export const DonorDashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { data, loading, reload } = useApi(async () => {
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

  useEffect(() => {
    if (!socket) return undefined;
    const refresh = () => reload();
    const onRefresh = () => reload();
    socket.on('eligibility:deferred', refresh);
    socket.on('donation:recorded', refresh);
    window.addEventListener('bloodlink:donation-recorded', onRefresh);
    window.addEventListener('bloodlink:eligibility-deferred', onRefresh);
    return () => {
      socket.off('eligibility:deferred', refresh);
      socket.off('donation:recorded', refresh);
      window.removeEventListener('bloodlink:donation-recorded', onRefresh);
      window.removeEventListener('bloodlink:eligibility-deferred', onRefresh);
    };
    // reload is provided by useApi and intentionally used only for this socket refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  return (
    <DashboardLayout title={`Welcome back, ${user?.firstName || 'Donor'}`} subtitle="Your donation activity, eligibility and recent alerts.">
      {loading ? <SmallSpinner /> : (
        <div className="space-y-5">
          {data.eligibility?.deferralUntil && <div className="card border-amber-200 bg-amber-50 text-amber-800">You are deferred for 30 days after your last donation.</div>}
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
              <Link className="btn-primary mt-4" to="/donor/eligibility"><Stethoscope size={16} /> Check Eligibility</Link>
            </div>
            <div className="card">
              <h3 className="text-lg font-black">Quick Actions</h3>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link className="btn-outline" to="/donor/appointments"><CalendarPlus size={16} /> Book Appointment</Link>
                <Link className="btn-outline" to="/donor/nearby-requests"><MapPin size={16} /> View Map</Link>
                <Link className="btn-primary" to="/donor/sos"><Droplet size={16} /> Emergency SOS</Link>
              </div>
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <PageTable headers={['Date', 'Hospital', 'Blood Group', 'Type']} rows={data.donations.slice(0, 5).map((item) => (
              <tr key={item._id}><td>{fmtDate(item.donationDate)}</td><td>{item.hospital?.hospitalName || item.hospital?.firstName}</td><td><BloodGroupBadge group={item.bloodGroup} size="sm" /></td><td>{item.source === 'sos' ? 'SOS' : item.source === 'appointment' ? 'Appointment' : 'Regular'}</td></tr>
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
                {data.notifications.length === 0 && <Empty title="No alerts" text="You're all caught up." />}
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
          <button className="btn-primary"><Save size={16} /> Save Profile</button>
          <button type="button" className="btn-outline" onClick={updateLocation}><LocateFixed size={16} /> Update My Location</button>
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
  const { socket } = useSocket();
  const [step, setStep] = useState(1);
  const [result, setResult] = useState(null);
  const { data: previous, reload } = useApi(async () => (await api.get('/eligibility/status')).data.data, []);
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

  useEffect(() => {
    if (!socket) return undefined;
    const refresh = () => reload();
    socket.on('eligibility:deferred', refresh);
    return () => socket.off('eligibility:deferred', refresh);
    // reload is provided by useApi and intentionally used only for this socket refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  return (
    <DashboardLayout title="Eligibility Check" subtitle={`Step ${step}/4`}>
      {previous?.deferralUntil && <div className="card mb-5 border-amber-200 bg-amber-50 text-amber-800">You are deferred for 30 days after your last donation.</div>}
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
          <button className="btn-outline" disabled={step === 1} onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Back</button>
          {step < 4 ? <button className="btn-primary" onClick={() => setStep(step + 1)}>Next <ArrowRight size={16} /></button> : <button className="btn-primary" onClick={submit}><CheckCircle size={16} /> Submit</button>}
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
  const [confirmation, setConfirmation] = useState(null);

  const eligible = data?.eligibility?.status === 'eligible';
  const submit = async () => {
    try {
      await api.post('/appointments', form);
      toast.success('Appointment confirmed');
      const hospital = data?.hospitals?.find((item) => item._id === form.hospital);
      setConfirmation({
        hospitalName: hospital?.hospitalName || hospital?.firstName || 'Selected hospital',
        date: form.date,
        timeSlot: form.timeSlot,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Appointment failed');
    }
  };

  const addToCalendar = () => {
    if (!confirmation?.date) return;
    const start = new Date(confirmation.date);
    const stamp = start.toISOString().replace(/[-:]/g, '').split('.')[0];
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${stamp}`,
      `SUMMARY:Blood donation appointment`,
      `LOCATION:${confirmation.hospitalName}`,
      `DESCRIPTION:${confirmation.timeSlot} slot at ${confirmation.hospitalName}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bloodlink-appointment.ics';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout title="Book Appointment">
      {!eligible ? <div className="card border-amber-200 bg-amber-50">Complete an eligible check before booking. <Link className="font-black text-[#C0392B]" to="/donor/eligibility">Check now</Link></div> : (
        <div className="card space-y-4">
          {confirmation && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
              <p className="font-black">Appointment confirmed</p>
              <p className="mt-1 text-sm">{confirmation.hospitalName} | {fmtDate(confirmation.date)} | {confirmation.timeSlot}</p>
              <button type="button" className="btn-outline mt-3" onClick={addToCalendar}><CalendarPlus size={16} /> Add to Calendar</button>
            </div>
          )}
          <Field label="Hospital"><select className="input-field" value={form.hospital} onChange={(e) => setForm({ ...form, hospital: e.target.value })}><option value="">Select hospital</option>{data?.hospitals?.map((item) => <option value={item._id} key={item._id}>{item.firstName}</option>)}</select></Field>
          <Field label="Date"><DatePicker className="input-field" minDate={new Date()} selected={form.date} onChange={(date) => setForm({ ...form, date })} /></Field>
          <div className="grid gap-3 md:grid-cols-3">{['Morning', 'Afternoon', 'Evening'].map((slot) => <button type="button" key={slot} className={form.timeSlot === slot ? 'btn-primary' : 'btn-outline'} onClick={() => setForm({ ...form, timeSlot: slot })}>{slot}</button>)}</div>
          <button className="btn-primary" onClick={submit}><CalendarDays size={16} /> Confirm Appointment</button>
        </div>
      )}
    </DashboardLayout>
  );
};

const pdfEscape = (value) =>
  String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\r\n]+/g, ' ');

const downloadPdf = (filename, content) => {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefAt = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;

  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const certificateLine = (x, y, label, value) =>
  `BT /F2 13 Tf ${x} ${y} Td (${pdfEscape(label)}) Tj ET\nBT /F1 13 Tf ${x + 145} ${y} Td (${pdfEscape(value)}) Tj ET`;

const generateCertificatePdf = (donation, user) => {
  const donorName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'BloodLink donor';
  const hospitalName = donation.hospital?.hospitalName || donation.hospital?.firstName || 'BloodLink partner';
  const source = donation.source === 'sos' ? 'Emergency SOS response' : donation.source === 'appointment' ? 'Scheduled appointment' : 'Verified donation';
  const lines = [
    certificateLine(120, 300, 'Donor Name:', donorName),
    certificateLine(120, 270, 'Blood Group:', donation.bloodGroup),
    certificateLine(120, 240, 'Units Donated:', donation.units || 1),
    certificateLine(120, 210, 'Donation Date:', fmtDate(donation.donationDate)),
    certificateLine(120, 180, 'Recorded By:', hospitalName),
    certificateLine(120, 150, 'Donation Type:', source),
    certificateLine(120, 120, 'Certificate ID:', donation.certificateId),
  ].join('\n');

  const content = [
    'q 1 1 1 rg 0 0 842 595 re f Q',
    'q 0.75 0 0 0.75 105 65 cm 0.78 0.05 0.05 RG 4 w 0 0 900 640 re S Q',
    'q 0.96 0.98 0.97 rg 84 60 674 475 re f Q',
    'BT /F2 34 Tf 245 505 Td (Certificate of Blood Donation) Tj ET',
    'BT /F1 15 Tf 272 475 Td (This certificate is proudly presented by BloodLink) Tj ET',
    'BT /F1 14 Tf 175 350 Td (This certifies that the donor below completed a verified blood donation.) Tj ET',
    lines,
    'q 0.78 0.05 0.05 RG 3 w 596 106 140 82 re S Q',
    'BT /F2 18 Tf 615 160 Td (BLOODLINK) Tj ET',
    'BT /F2 15 Tf 625 135 Td (VERIFIED) Tj ET',
    'BT /F1 10 Tf 598 116 Td (Official digital stamp) Tj ET',
    'BT /F2 13 Tf 118 82 Td (Thank you for helping save lives.) Tj ET',
  ].join('\n');

  downloadPdf(`BloodLink-Certificate-${donation.certificateId || 'donation'}.pdf`, content);
};

export const DonationHistory = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { data, loading, reload } = useApi(async () => (await api.get('/donations/my-history')).data, []);
  useEffect(() => {
    if (!socket) return undefined;
    const refresh = () => reload();
    socket.on('donation:recorded', refresh);
    window.addEventListener('bloodlink:donation-recorded', refresh);
    return () => {
      socket.off('donation:recorded', refresh);
      window.removeEventListener('bloodlink:donation-recorded', refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);
  const donations = data?.data || [];
  const months = new Set(donations.map((item) => format(new Date(item.donationDate), 'yyyy-MM')));

  return (
    <DashboardLayout title="Donation History">
      {loading ? <SmallSpinner /> : (
        <div className="space-y-5">
          <div className="page-grid"><StatCard label="Total Donations" value={data.totalDonations} /><StatCard label="Lives Impacted" value={data.totalDonations * 3} /><StatCard label="Donation Streak" value={`${months.size} months`} /></div>
          {donations.length === 0 ? (
            <div className="empty-state">
              <Droplet size={34} />
              <h3>No donations yet</h3>
              <p>Book your first appointment and start building your donation history.</p>
              <Link className="btn-primary mt-4" to="/donor/appointments"><CalendarPlus size={16} /> Book Appointment</Link>
            </div>
          ) : (
            <PageTable headers={['Date', 'Hospital', 'Blood Group', 'Units', 'Type', 'Certificate']} rows={donations.map((item) => (
              <tr key={item._id}><td>{fmtDate(item.donationDate)}</td><td>{item.hospital?.hospitalName || item.hospital?.firstName}</td><td><BloodGroupBadge group={item.bloodGroup} size="sm" /></td><td>{item.units}</td><td><span className={`badge-pill ${item.source === 'sos' ? 'bg-red-50 text-red-700' : item.source === 'appointment' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>{item.source === 'sos' ? 'SOS' : item.source === 'appointment' ? 'Appointment' : 'Regular'}</span></td><td><button className="btn-outline" type="button" onClick={() => generateCertificatePdf(item, user)}><Download size={16} /> Download PDF</button><p className="mt-1 text-xs text-slate-500">{item.certificateId}</p></td></tr>
            ))} />
          )}
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
  const { socket } = useSocket();
  const { data, loading, reload } = useApi(async () => {
    const [stats, leaderboard] = await Promise.all([api.get('/loyalty/my-stats'), api.get('/loyalty/leaderboard')]);
    return { stats: stats.data.data, leaderboard: leaderboard.data.data };
  }, []);
  useEffect(() => {
    if (!socket) return undefined;
    const refresh = () => reload();
    socket.on('donation:recorded', refresh);
    window.addEventListener('bloodlink:donation-recorded', refresh);
    return () => {
      socket.off('donation:recorded', refresh);
      window.removeEventListener('bloodlink:donation-recorded', refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);
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
  const { data, reload: fetchNotifications, setData } = useApi(async () => (await api.get('/notifications')).data.data, []);

  useEffect(() => {
    if (!socket) return undefined;
    const refresh = () => fetchNotifications();
    socket.on('blood-request:new', refresh);
    socket.on('blood-request:closed', refresh);
    socket.on('blood-request:response', refresh);
    socket.on('chat:ready', refresh);
    return () => {
      socket.off('blood-request:new', refresh);
      socket.off('blood-request:closed', refresh);
      socket.off('blood-request:response', refresh);
      socket.off('chat:ready', refresh);
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
      fetchNotifications();
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
    fetchNotifications();
  };
  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    setData((items = []) => items.map((item) => (item._id === id ? { ...item, isRead: true } : item)));
    fetchNotifications();
  };
  const deleteNotification = async (id) => {
    setData((items = []) => items.filter((item) => item._id !== id));
    await api.delete(`/notifications/${id}`);
    toast.success('Notification deleted');
    fetchNotifications();
  };
  const clearAll = async () => {
    setData([]);
    await api.delete('/notifications/all');
    toast.success('Notifications cleared');
    fetchNotifications();
  };
  return (
    <DashboardLayout title={title}>
      <div className="mb-4 flex flex-wrap gap-2">
        <button className="btn-outline" onClick={markAll}><CheckCircle size={16} /> Mark all read</button>
        <button className="btn-danger" onClick={clearAll}><Trash2 size={16} /> Clear All</button>
      </div>
      <div className="space-y-3">{(data || []).filter(Boolean).map((item, index) => (
        <div key={item._id || `${item.type || 'notification'}-${index}`} className={`card ${!item.isRead ? 'bg-red-50' : ''}`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-start gap-3">
              {item.type === 'blood_request' ? <Droplet className="mt-1 text-[#C0392B]" size={18} /> : <Bell className="mt-1 text-slate-500" size={18} />}
              <div>
                <h3 className="font-black">{item.title}</h3>
                <span className="text-sm text-slate-500">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {!item.isRead && item._id && <button className="icon-button" type="button" aria-label="Mark read" onClick={() => markRead(item._id)}><CheckCircle size={16} /></button>}
              {item._id && <button className="icon-button danger" type="button" aria-label="Delete notification" onClick={() => deleteNotification(item._id)}><X size={16} /></button>}
            </div>
          </div>
          <p className="mt-1 text-sm text-slate-600">{item.message}</p>
          {item.type === 'blood_request' && Number.isFinite(Number(item.data?.distanceKm)) && <p className="mt-2 flex items-center gap-1 text-sm font-bold text-slate-600"><MapPin size={16} /> {Number(item.data.distanceKm).toFixed(1)} km away</p>}
          {item.type === 'blood_request' && !item.data?.closed && !item.data?.response && <div className="mt-3 flex gap-2"><button className="btn-primary" onClick={() => respond(item.data?.requestId, 'accept')}><CheckCircle size={16} /> Accept</button><button className="btn-outline" onClick={() => respond(item.data?.requestId, 'decline')}><XCircle size={16} /> Decline</button></div>}
          {item.type === 'blood_request' && item.data?.response && <p className="mt-3 text-sm font-bold text-slate-500">You {item.data.response}ed this request</p>}
          {item.type === 'blood_request' && item.data?.closed && <p className="mt-3 text-sm font-bold text-slate-500">Covered by {item.data?.acceptedDonorName || 'another donor'}</p>}
          {item.type === 'donor_response' && item.data?.requestId && <button className="btn-outline mt-3" onClick={() => navigate(`/${user.role}/chat/${item.data.requestId}`)}><MessageCircle size={16} /> Open Chat</button>}
        </div>
      ))}{(!data || data.length === 0) && <Empty title="All caught up" text="No new notifications." />}</div>
    </DashboardLayout>
  );
};

export const NearbyRequestsPage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const coords = user?.location?.coordinates;
  const { data, reload } = useApi(async () => {
    if (!coords?.length) return [];
    return (await api.get('/blood-requests/nearby', {
      params: { lat: coords[1], lng: coords[0] },
    })).data.data;
  }, [coords?.join(',')]);

  const acceptRequest = async (requestId) => {
    try {
      const { data: response } = await api.put(`/blood-requests/${requestId}/respond`, { action: 'accept' });
      toast.success('Request accepted');
      navigate(`/donor/chat/${response?.data?.request?._id || requestId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not accept request');
    }
  };

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
      {!coords?.length ? <div className="empty-state"><MapPin size={34} /><h3>Location needed</h3><p>Enable your location to see nearby blood requests.</p><button className="btn-primary mt-4" onClick={enable}><LocateFixed size={16} /> Update Location</button></div> : (
        <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
          <div className="card min-h-96">{import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'Map view is ready for configured Google Maps key.' : 'Google Maps API key is not set. Nearby requests are listed on the right.'}</div>
          <div className="space-y-3">{(data || []).filter(Boolean).sort((a, b) => Number(a.distanceKm ?? Infinity) - Number(b.distanceKm ?? Infinity)).map((item, index) => <RequestCard key={item._id || `request-${index}`} request={item} onAccept={item.status === 'open' ? () => acceptRequest(item._id) : undefined} />)}{(!data || data.length === 0) && <Empty text="No blood requests near you right now. You'll be notified when someone needs help." />}</div>
        </div>
      )}
    </DashboardLayout>
  );
};

const RequestCard = ({ request, onAccept }) => (
  <div className="card">
    <div className="flex items-center justify-between"><BloodGroupBadge group={request.bloodGroup} /><span className={`badge-pill ${urgencyClass(request.urgency)}`}>{request.urgency}</span></div>
    <p className="mt-3 font-bold">{request.requestedBy?.firstName || 'Hospital'}</p>
    <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><Clock size={16} /> {request.unitsNeeded} unit(s), {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}</p>
    {Number.isFinite(Number(request.distanceKm)) && <p className="mt-2 flex items-center gap-1 text-sm font-bold text-slate-600"><MapPin size={16} /> {Number(request.distanceKm).toFixed(1)} km from you</p>}
    {onAccept && <button className="btn-primary mt-3" type="button" onClick={onAccept}><CheckCircle size={16} /> Accept Request</button>}
  </div>
);

export const BloodFinder = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ bloodGroup: 'O+' });
  const [coords, setCoords] = useState(null);
  const [results, setResults] = useState({ hospitals: [], donors: [] });
  const [loading, setLoading] = useState(false);

  const search = async (nextCoords = coords) => {
    setLoading(true);
    try {
      const { data } = await api.get('/blood-finder', {
        params: {
          bloodGroup: filters.bloodGroup,
          lat: nextCoords?.lat,
          lng: nextCoords?.lng,
        },
      });
      setResults(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to find blood nearby');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedCoords = user?.location?.coordinates?.length >= 2
      ? { lat: user.location.coordinates[1], lng: user.location.coordinates[0] }
      : null;

    search(savedCoords);

    if (!navigator.geolocation) {
      if (savedCoords) {
        setCoords(savedCoords);
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => {
        const nextCoords = { lat: c.latitude, lng: c.longitude };
        setCoords(nextCoords);
      },
      () => {
        if (savedCoords) {
          setCoords(savedCoords);
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
    // Initial location lookup should run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardLayout title="Find Blood" subtitle="Search stock and eligible donors by blood group.">
      <div className="card mb-5 grid gap-3 md:grid-cols-[1fr_auto]">
        <Field label="Blood group">
          <select className="input-field" value={filters.bloodGroup} onChange={(e) => setFilters({ ...filters, bloodGroup: e.target.value })}>
            {BLOOD_GROUPS.map((group) => <option key={group}>{group}</option>)}
          </select>
        </Field>
        <button className="btn-primary self-end" type="button" disabled={loading} onClick={() => search()}>
          <SearchIcon size={16} />
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ResultColumn title="Hospitals & Blood Banks" empty="No stock found for this blood group.">
          {(results.hospitals || []).map((item) => <BloodFinderCard key={item._id} item={item} showUnits />)}
        </ResultColumn>
        <ResultColumn title="Eligible Donors" empty="No eligible donors found for this blood group.">
          {(results.donors || []).map((item) => <BloodFinderCard key={item._id} item={item} />)}
        </ResultColumn>
      </div>
    </DashboardLayout>
  );
};

const ResultColumn = ({ title, empty, children }) => (
  <section>
    <h2 className="mb-3 text-lg font-black">{title}</h2>
    <div className="space-y-3">{children?.length ? children : <Empty text={empty} />}</div>
  </section>
);

const BloodFinderCard = ({ item, showUnits = false }) => (
  <div className="card">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-black">{item.name}</h3>
        <div className="mt-2"><BloodGroupBadge group={item.bloodGroup} size="sm" /></div>
        {showUnits && <p className="mt-2 text-sm font-bold text-green-700">{item.units} unit(s) available</p>}
        {item.phoneNumber && <p className="mt-2 text-sm text-slate-600">Phone: {item.phoneNumber}</p>}
        {item.address && <p className="mt-1 text-sm text-slate-600">Address: {item.address}</p>}
        {item.city && <p className="text-sm text-slate-500">{item.city}</p>}
        {item.lastAddressUpdated && <p className="mt-1 text-xs font-bold text-slate-500">Last address updated: {fmtDate(item.lastAddressUpdated)}</p>}
      </div>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      {item.phoneNumber && <a className="btn-outline" href={`tel:${item.phoneNumber}`}><Phone size={16} /> Call</a>}
      {item.location?.coordinates?.length >= 2 && <a className="btn-primary" href={mapsUrl(item.location)} target="_blank" rel="noreferrer"><Navigation size={16} /> Get Directions</a>}
    </div>
  </div>
);

export const HospitalDashboard = () => {
  const { user } = useAuth();
  const { data } = useApi(async () => {
    const [inventory, requests, expiry] = await Promise.all([api.get('/inventory'), api.get('/blood-requests'), api.get('/inventory/expiry-alerts')]);
    return { inventory: inventory.data.data, requests: requests.data.data, expiry: expiry.data.data };
  }, []);
  const totals = BLOOD_GROUPS.map((group) => ({ group, units: (data?.inventory || []).filter((i) => i.bloodGroup === group).reduce((sum, i) => sum + i.units, 0) }));
  if (user?.isApproved === false) return <HospitalPendingApproval />;
  return (
    <DashboardLayout title="Hospital Dashboard">
      {user?.isActive === false && <div className="card mb-5 border-red-200 bg-red-50 text-red-800">Your account has been suspended. Reason: {user.suspensionReason || 'No reason provided'}. Contact support.</div>}
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
      <div className="card mb-5 grid gap-3 md:grid-cols-4"><select className="input-field" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}>{BLOOD_GROUPS.map((group) => <option key={group}>{group}</option>)}</select><input className="input-field" type="number" value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} /><input className="input-field" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /><button className="btn-primary" onClick={save}><Plus size={16} /> Add Stock</button></div>
      <button className="btn-outline mb-4" onClick={() => exportCsv('inventory.csv', [['Blood Group', 'Units', 'Expiry'], ...(data || []).map((i) => [i.bloodGroup, i.units, fmtDate(i.expiryDate)])])}><Download size={16} /> Export CSV</button>
      <PageTable headers={['Blood Group', 'Units', 'Expiry Date', 'Status', 'Actions']} rows={(data || []).map((item) => <tr key={item._id} className={item.units < 5 ? 'bg-red-50' : item.units <= 10 ? 'bg-amber-50' : ''}><td><BloodGroupBadge group={item.bloodGroup} size="sm" /></td><td>{item.units}</td><td>{fmtDate(item.expiryDate)}</td><td><span className={`badge-pill ${item.units < 5 ? 'bg-red-50 text-red-700' : item.units <= 10 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>{item.units < 5 ? 'Critical' : item.units <= 10 ? 'Warning' : 'Safe'}</span></td><td><button className="btn-outline" onClick={() => del(item._id)}><Trash2 size={16} /> Delete</button></td></tr>)} />
    </DashboardLayout>
  );
};

export const RaiseRequest = () => {
  const { user, updateUser } = useAuth();
  const { socket } = useSocket();
  const [form, setForm] = useState({ bloodGroup: 'O+', urgency: 'normal', unitsNeeded: 1, radiusKm: 10, notes: '' });
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
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

  const getLiveLocation = () => new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => resolve({ lat: c.latitude, lng: c.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );
  });

  const submit = async () => {
    const savedLocation = hasLocation ? { lat: coords[1], lng: coords[0] } : null;
    setRequestingLocation(true);

    const liveLocation = await getLiveLocation();
    let requestLocation = liveLocation || savedLocation;

    if (liveLocation) {
      try {
        const { data } = await api.put('/donors/location', liveLocation);
        updateUser(data.data);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Location update failed');
      }
    }

    setRequestingLocation(false);

    if (!requestLocation) {
      toast.error('Update your location before raising SOS');
      return;
    }

    try {
      const { data } = await api.post('/blood-requests', {
        ...form,
        unitsNeeded: Number(form.unitsNeeded),
        radiusKm: Number(form.radiusKm),
        lat: requestLocation.lat,
        lng: requestLocation.lng,
      });
      toast.success(`SOS sent to ${data.data.notifiedDonors} donors by ${data.data.matchingAlgorithm}`);
      setActiveRequest(data.data.request);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Request failed');
    }
  };
  useEffect(() => {
    if (!socket || !activeRequest?._id) return undefined;
    const syncRequest = async () => {
      try {
        const { data } = await api.get('/blood-requests');
        const updated = (data.data || []).find((item) => item._id === activeRequest._id);
        if (updated) setActiveRequest(updated);
      } catch {
        // Keep the last known request state if refresh fails.
      }
    };
    socket.on('blood-request:response', syncRequest);
    return () => socket.off('blood-request:response', syncRequest);
  }, [socket, activeRequest?._id]);

  const isDonorSos = user?.role === 'donor';
  const cancelRequest = async () => {
    if (!activeRequest?._id) return;
    try {
      const { data } = await api.put(`/blood-requests/${activeRequest._id}/status`, { status: 'cancelled' });
      setActiveRequest(data.data);
      toast.success('Request cancelled');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel request');
    }
  };

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
              <p className="mt-1 text-sm font-bold text-slate-600">{count || 0} eligible donors found in this area</p>
              {count === 0 && Number(form.radiusKm) < 50 && <p className="mt-1 text-sm text-amber-700">No eligible donors found. Try increasing the radius.</p>}
              {count === 0 && Number(form.radiusKm) >= 50 && <p className="mt-1 text-sm text-red-700">No eligible donors found at max radius. Contact hospitals directly.</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" onClick={submit} disabled={requestingLocation}><Droplet size={16} /> {requestingLocation ? 'Updating Location...' : isDonorSos ? 'Raise Emergency SOS' : 'Request Blood'}</button>
              {isDonorSos && activeRequest?.status === 'open' && <button className="btn-outline" type="button" onClick={cancelRequest}><XCircle size={16} /> Cancel Request</button>}
            </div>
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
  const [resetting, setResetting] = useState(false);

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

  const requester = conversation?.requester;
  const requesterId = requester?._id || requester;
  const isRequester = String(requesterId) === String(user?._id);
  const other = isRequester ? conversation?.donor : requester;

  const completeDonation = async () => {
    setCompleting(true);
    try {
      const { data } = await api.put(`/blood-requests/${requestId}/complete-donation`);
      const loyalty = data.data?.loyalty;
      setConversation((current) => current ? {
        ...current,
        request: { ...current.request, status: data.data.request.status },
      } : current);
      toast.success(
        loyalty
          ? `Donation recorded! +${loyalty.pointsAwarded} points. Total donations: ${loyalty.totalDonations}. Badges: ${(loyalty.badges || []).join(', ') || 'none yet'}.`
          : 'Donation completed. Donor deferred for 30 days.',
        { duration: 8000 },
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not complete donation');
    } finally {
      setCompleting(false);
    }
  };

  const resetNoShow = async () => {
    setResetting(true);
    try {
      const { data } = await api.put(`/blood-requests/${requestId}/status`, { status: 'open' });
      setConversation((current) => current ? {
        ...current,
        request: { ...current.request, status: data.data.status, acceptedDonor: data.data.acceptedDonor },
      } : current);
      toast.success('Request reopened for other donors.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reopen request');
    } finally {
      setResetting(false);
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
            {isRequester && conversation.request?.status === 'responding' && (
              <button className="btn-primary mt-4 w-full" disabled={completing} onClick={completeDonation}>
                {completing ? 'Completing...' : 'Mark Donation Completed'}
              </button>
            )}
            {isRequester && conversation.request?.status === 'responding' && (
              <button className="btn-outline mt-3 w-full" disabled={resetting} onClick={resetNoShow}>
                {resetting ? 'Reopening...' : "Donor didn't show up"}
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
              <button className="btn-primary"><Send size={16} /> Send</button>
            </form>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
};

const RequestsList = ({ admin = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
      <PageTable headers={['Hospital', 'Blood', 'Units', 'Urgency', 'Status', 'Notified', 'Date', 'Actions']} rows={rows.filter(Boolean).map((item, index) => {
        const acceptedDonor = item.acceptedDonor || item.respondingDonors?.find((entry) => entry.action === 'accept')?.donor;
        const canOpenChat = Boolean(!admin && item._id && acceptedDonor);
        const canFulfill = Boolean(!admin && item.status === 'responding' && item._id);
        return <tr key={item._id || `request-${index}`}><td>{item.requestedBy?.firstName}</td><td><BloodGroupBadge group={item.bloodGroup} size="sm" /></td><td>{item.unitsNeeded}</td><td><span className={`badge-pill ${urgencyClass(item.urgency)}`}>{item.urgency}</span></td><td><span className={`badge-pill ${statusClass(item.status)}`}>{item.status}</span></td><td>{item.notifiedDonors?.length || 0}</td><td>{fmtDate(item.createdAt)}</td><td><div className="flex gap-2">{canOpenChat && <button className="btn-outline" onClick={() => navigate(`/${user?.role || 'hospital'}/chat/${item._id}`)}><MessageCircle size={16} /> Chat</button>}{canFulfill && <button className="btn-outline" onClick={() => setStatus(item._id, 'fulfilled')}><CheckCircle size={16} /> Mark Fulfilled</button>}</div></td></tr>;
      })} />
    </DashboardLayout>
  );
};

export const HospitalPendingApproval = () => (
  <DashboardLayout title="Pending Approval">
    <div className="card border-amber-200 bg-amber-50 text-amber-900">
      <p className="text-lg font-black">Your account is pending admin approval.</p>
      <p className="mt-2">You'll receive a notification once approved.</p>
    </div>
  </DashboardLayout>
);

export const DonorSearch = () => {
  const [query, setQuery] = useState({ bloodGroup: '', city: '' });
  const [results, setResults] = useState([]);
  const search = async () => {
    const { data } = await api.get('/donors/search', { params: query });
    setResults(data.data);
  };
  return (
    <DashboardLayout title="Donor Search">
      <div className="card mb-5 grid gap-3 md:grid-cols-3"><select className="input-field" value={query.bloodGroup} onChange={(e) => setQuery({ ...query, bloodGroup: e.target.value })}><option value="">Any blood group</option>{BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}</select><input className="input-field" placeholder="City" value={query.city} onChange={(e) => setQuery({ ...query, city: e.target.value })} /><button className="btn-primary" onClick={search}><SearchIcon size={16} /> Search</button></div>
      <div className="page-grid">{results.map((item) => <div className="card" key={item._id}><h3 className="font-black">{item.firstName}</h3><BloodGroupBadge group={item.bloodGroup} /><p className="mt-2 text-sm">{item.city}</p><button className="btn-outline mt-3" onClick={() => toast.success('Direct notification ready')}><Droplet size={16} /> Request This Donor</button></div>)}{results.length === 0 && <Empty title="No donors found" text="Search by blood group and city to find eligible donors." />}</div>
    </DashboardLayout>
  );
};

export const HospitalAppointments = () => {
  const { data, reload } = useApi(async () => (await api.get('/appointments')).data.data, []);
  const complete = async (id) => {
    try {
      const { data: response } = await api.put(`/appointments/${id}/complete`);
      const loyalty = response.data?.loyalty;
      toast.success(
        loyalty
          ? `Donation recorded! Donor earned +${loyalty.pointsAwarded} points.`
          : 'Appointment marked as donated.',
      );
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not record donation');
    }
  };
  return (
    <DashboardLayout title="Appointments">
      <PageTable
        headers={['Donor', 'Blood', 'Date', 'Slot', 'Status', 'Actions']}
        rows={(data || []).map((item) => (
          <tr key={item._id}>
            <td>{item.donor?.firstName} {item.donor?.lastName}</td>
            <td><BloodGroupBadge group={item.donor?.bloodGroup} size="sm" /></td>
            <td>{fmtDate(item.date)}</td>
            <td>{item.timeSlot}</td>
            <td><span className={`badge-pill ${statusClass(item.status)}`}>{item.status}</span></td>
            <td>
              {item.status === 'scheduled' && (
                <button className="btn-primary" type="button" onClick={() => complete(item._id)}>
                  <CheckCircle size={16} /> Mark Donated
                </button>
              )}
            </td>
          </tr>
        ))}
        empty="No appointments yet."
      />
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
        return <tr key={item._id}><td><BloodGroupBadge group={item.bloodGroup} size="sm" /></td><td>{item.units}</td><td>{fmtDate(item.expiryDate)}</td><td><span className={`badge-pill ${days <= 7 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{days}</span></td><td><button className="btn-outline" onClick={() => del(item._id)}><Trash2 size={16} /> Discard</button></td></tr>;
      })} />
    </DashboardLayout>
  );
};

export const HospitalProfile = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    hospitalName: user?.hospitalName || user?.firstName || '',
    address: user?.address || '',
    city: user?.city || '',
    pincode: user?.pincode || '',
    phoneNumber: user?.phoneNumber || '',
    licenseNumber: user?.licenseNumber || user?.registrationNumber || '',
  });

  const save = async (event) => {
    event.preventDefault();
    try {
      const { data } = await api.put('/auth/me', form);
      updateUser(data.data);
      toast.success('Hospital profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Profile update failed');
    }
  };

  return (
    <DashboardLayout title="Hospital Profile">
      <form className="card grid gap-4 md:grid-cols-2" onSubmit={save}>
        <Field label="Hospital name"><input className="input-field" value={form.hospitalName} onChange={(e) => setForm({ ...form, hospitalName: e.target.value })} required /></Field>
        <Field label="Phone"><input className="input-field" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} required /></Field>
        <Field label="City"><input className="input-field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required /></Field>
        <Field label="Pincode"><input className="input-field" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></Field>
        <Field label="License number"><input className="input-field" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} /></Field>
        <Field label="Address"><textarea className="input-field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        <div className="md:col-span-2"><button className="btn-primary"><Save size={16} /> Save Profile</button></div>
      </form>
    </DashboardLayout>
  );
};

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { data } = useApi(async () => {
    const [stats, analytics, inventory, pending] = await Promise.all([api.get('/admin/stats'), api.get('/admin/analytics'), api.get('/admin/inventory'), api.get('/admin/users?role=hospital&limit=5')]);
    return { stats: stats.data.data, analytics: analytics.data.data, inventory: inventory.data.data, pending: pending.data.data.filter((u) => !u.isApproved) };
  }, []);
  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="page-grid">{['totalUsers', 'totalDonors', 'totalHospitals', 'totalBloodUnits', 'requestsToday', 'fulfilledToday', 'pendingHospitalApprovals'].map((key) => <StatCard key={key} label={key} value={data?.stats?.[key]} />)}</div>
      {data?.inventory?.critical?.length > 0 && (
        <div className="card mt-5 border-red-200 bg-red-50">
          <h2 className="text-lg font-black text-red-800">Critical shortages</h2>
          <div className="mt-3 grid gap-3">
            {data.inventory.critical.map((item) => (
              <div key={item.bloodGroup} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-100 bg-white p-3">
                <div><BloodGroupBadge group={item.bloodGroup} size="sm" /><p className="mt-1 text-sm text-slate-600">{item.totalUnits || 0} units available</p></div>
                <button className="btn-outline" onClick={() => navigate('/admin/broadcast', { state: { bloodGroup: item.bloodGroup } })}><Megaphone size={16} /> Broadcast Alert</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-5 grid gap-5 lg:grid-cols-2"><Chart title="Donations By Month" data={data?.analytics?.donationsByMonth?.map((i) => ({ name: `${i._id.month}/${i._id.year}`, value: i.count })) || []} /><PieBox title="Blood Group Distribution" data={data?.analytics?.bloodGroupDistribution?.map((i) => ({ name: i._id, value: i.count })) || []} /></div>
    </DashboardLayout>
  );
};

export const UserManagement = () => {
  const [role, setRole] = useState('');
  const [suspending, setSuspending] = useState(null);
  const [reason, setReason] = useState('');
  const { data, reload } = useApi(async () => (await api.get(`/admin/users?role=${role}`)).data.data, [role]);
  const action = async (id, name, body = {}) => { await api.put(`/admin/users/${id}/${name}`, body); toast.success(`User ${name}d`); reload(); };
  const openSuspend = (user) => {
    setSuspending(user);
    setReason('');
  };
  const confirmSuspend = async (event) => {
    event.preventDefault();
    if (!suspending?._id) return;
    await action(suspending._id, 'suspend', { reason });
    setSuspending(null);
  };
  return (
    <DashboardLayout title="User Management">
      <div className="mb-4 flex flex-wrap gap-2">{['', 'donor', 'hospital', 'organization', 'admin'].map((r) => <button key={r || 'all'} className={role === r ? 'btn-primary' : 'btn-outline'} onClick={() => setRole(r)}>{r || 'All'}</button>)}</div>
      <PageTable headers={['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions']} rows={(data || []).map((u) => <tr key={u._id}><td>{u.firstName} {u.lastName}</td><td>{u.email}</td><td><span className="role-badge">{u.role}</span></td><td><span className={`badge-pill ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{u.isActive ? 'Active' : 'Suspended'} {u.role === 'hospital' && !u.isApproved ? '/ Pending' : ''}</span></td><td>{fmtDate(u.createdAt)}</td><td className="flex gap-2">{u.role === 'hospital' && !u.isApproved && <button className="btn-outline" onClick={() => action(u._id, 'approve')}><ShieldCheck size={16} /> Approve</button>}<button className="btn-outline" onClick={() => u.isActive ? openSuspend(u) : action(u._id, 'activate')}>{u.isActive ? <XCircle size={16} /> : <CheckCircle size={16} />}{u.isActive ? 'Suspend' : 'Activate'}</button></td></tr>)} />
      {suspending && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
          <form className="card w-full max-w-md" onSubmit={confirmSuspend}>
            <h2 className="text-xl font-black">Suspend user</h2>
            <p className="mt-1 text-sm text-slate-500">{suspending.firstName} {suspending.lastName}</p>
            <Field label="Reason"><textarea className="input-field mt-3" value={reason} onChange={(e) => setReason(e.target.value)} required /></Field>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-outline" onClick={() => setSuspending(null)}><X size={16} /> Cancel</button>
              <button className="btn-primary"><XCircle size={16} /> Suspend</button>
            </div>
          </form>
        </div>
      )}
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
  const location = useLocation();
  const prefillBloodGroup = location.state?.bloodGroup || '';
  const [form, setForm] = useState({
    targetRole: prefillBloodGroup ? 'donor' : '',
    targetBloodGroup: prefillBloodGroup,
    title: prefillBloodGroup ? `${prefillBloodGroup} blood urgently needed` : '',
    message: prefillBloodGroup ? `BloodLink has a critical shortage of ${prefillBloodGroup}. Please donate if you are eligible.` : '',
  });
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
        <button className="btn-primary" onClick={send}><Radio size={16} /> Send Broadcast</button>
      </div>
    </DashboardLayout>
  );
};

export const SystemSettings = () => {
  const [settings, setSettings] = useState(() => JSON.parse(localStorage.getItem('bloodlinkSettings') || '{"radius":10,"expiry":14,"escalation":30}'));
  const save = () => { localStorage.setItem('bloodlinkSettings', JSON.stringify(settings)); toast.success('Settings saved'); };
  return <DashboardLayout title="System Settings"><div className="card grid gap-4 md:grid-cols-3">{['radius', 'expiry', 'escalation'].map((key) => <Field key={key} label={key}><input className="input-field" type="number" value={settings[key]} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} /></Field>)}<button className="btn-primary md:col-span-3" onClick={save}><Save size={16} /> Save</button></div></DashboardLayout>;
};

export const Reports = () => <DashboardLayout title="Reports"><div className="card flex flex-wrap gap-3"><button className="btn-primary" onClick={() => toast.success('Report generated')}><CheckCircle size={16} /> Generate Report</button><button className="btn-outline" onClick={() => exportCsv('report.csv', [['Report'], ['BloodLink']])}><Download size={16} /> Export CSV</button></div></DashboardLayout>;

const Chart = ({ title, data }) => (
  <div className="card h-80">
    <h3 className="mb-4 font-black">{title}</h3>
    {data?.length ? (
      <ResponsiveContainer width="100%" height="85%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#C0392B" /></BarChart></ResponsiveContainer>
    ) : (
      <Empty title="No chart data" text="Data will appear here once records are available." />
    )}
  </div>
);

const PieBox = ({ title, data }) => (
  <div className="card h-80">
    <h3 className="mb-4 font-black">{title}</h3>
    {data?.some((item) => item.value > 0) ? (
      <ResponsiveContainer width="100%" height="85%"><PieChart><Pie data={data} dataKey="value" nameKey="name" outerRadius={90} label>{data.map((_, index) => <Cell key={index} fill={['#C0392B', '#1A2340', '#16A34A', '#D97706'][index % 4]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
    ) : (
      <Empty title="No chart data" text="Data will appear here once records are available." />
    )}
  </div>
);
