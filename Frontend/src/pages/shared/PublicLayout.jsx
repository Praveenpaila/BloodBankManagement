import Navbar from '../../components/common/Navbar';

const Footer = () => (
  <footer className="border-t border-slate-200 bg-white py-8">
    <div className="mx-auto max-w-7xl px-4 text-sm text-slate-500">
      BloodLink connects donors, hospitals, and administrators for faster blood availability.
    </div>
  </footer>
);

const PublicLayout = ({ children }) => (
  <>
    <Navbar />
    <main>{children}</main>
    <Footer />
  </>
);

export default PublicLayout;
