import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';

const DashboardLayout = ({ title, subtitle, children }) => {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <div className="flex">
        <Sidebar role={user?.role} />
        <main className="min-h-[calc(100vh-65px)] flex-1 p-4 lg:p-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-5">
              <h1 className="text-2xl font-black text-slate-900">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
            </div>
            {children}
          </div>
        </main>
      </div>
    </>
  );
};

export default DashboardLayout;
