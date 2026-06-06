import { useState } from 'react';
import toast from 'react-hot-toast';
import PublicLayout from '../shared/PublicLayout';

const ContactPage = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const submit = (event) => {
    event.preventDefault();
    toast.success("Message sent. We'll get back to you soon.");
    setForm({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <PublicLayout>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-xl font-black">Get in touch</h2>
            <p className="mt-2 text-sm text-slate-600">Questions about donations, hospital onboarding, or emergency support? Reach out anytime.</p>
          </div>
          {['Phone: +91 90000 00000', 'Email: support@bloodlink.com', 'Address: Vijayawada, Andhra Pradesh'].map((item) => (
            <div className="card" key={item}>{item}</div>
          ))}
        </div>
        <form className="card grid gap-3" onSubmit={submit}>
          <h1 className="text-2xl font-black">Contact Us</h1>
          <input className="input-field" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input-field" type="email" placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="input-field" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
          <textarea className="input-field" placeholder="How can we help?" rows="5" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
          <button className="btn-primary">Send Message</button>
        </form>
      </section>
    </PublicLayout>
  );
};

export default ContactPage;
