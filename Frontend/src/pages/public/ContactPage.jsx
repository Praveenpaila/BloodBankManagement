import { useState } from 'react';
import toast from 'react-hot-toast';
import PublicLayout from '../shared/PublicLayout';
import { BLOOD_GROUPS } from '../../utils/bloodGroups';

const ContactPage = () => {
  const [form, setForm] = useState({ bloodGroup: 'O+', hospitalName: '', city: '', patientNotes: '', urgency: 'urgent' });

  const submit = (event) => {
    event.preventDefault();
    toast.success("Request submitted, we'll contact you");
    setForm({ bloodGroup: 'O+', hospitalName: '', city: '', patientNotes: '', urgency: 'urgent' });
  };

  return (
    <PublicLayout>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          {['Phone: +91 90000 00000', 'Email: support@bloodlink.com', 'Address: Vijayawada, Andhra Pradesh'].map((item) => (
            <div className="card" key={item}>{item}</div>
          ))}
        </div>
        <form className="card grid gap-3" onSubmit={submit}>
          <h1 className="text-2xl font-black">Emergency Request</h1>
          <select className="input-field" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}>
            {BLOOD_GROUPS.map((group) => <option key={group}>{group}</option>)}
          </select>
          <input className="input-field" placeholder="Hospital name" value={form.hospitalName} onChange={(e) => setForm({ ...form, hospitalName: e.target.value })} />
          <input className="input-field" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <select className="input-field" value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
            <option value="critical">Critical</option>
          </select>
          <textarea className="input-field" placeholder="Patient notes" rows="4" value={form.patientNotes} onChange={(e) => setForm({ ...form, patientNotes: e.target.value })} />
          <button className="btn-primary">Submit Request</button>
        </form>
      </section>
    </PublicLayout>
  );
};

export default ContactPage;
