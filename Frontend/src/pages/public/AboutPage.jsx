import PublicLayout from '../shared/PublicLayout';

const AboutPage = () => (
  <PublicLayout>
    <section className="mx-auto max-w-7xl px-4 py-12">
      <div className="card">
        <h1 className="text-4xl font-black">About BloodLink</h1>
        <p className="mt-4 max-w-3xl text-slate-600">
          BloodLink is a Blood Bank Management System for coordinating donors, hospitals, inventory, emergency alerts, eligibility and analytics.
        </p>
      </div>
      <div className="page-grid mt-6">
        {['Reliable matching', 'Hospital inventory', 'Donor rewards', 'Admin analytics'].map((item) => (
          <div className="card" key={item}>
            <h3 className="font-black">{item}</h3>
            <p className="mt-2 text-sm text-slate-500">Built to support real operational workflows in a simple interface.</p>
          </div>
        ))}
      </div>
    </section>
  </PublicLayout>
);

export default AboutPage;
