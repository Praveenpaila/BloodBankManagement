import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/authStore';

const sidebarItems = {
  donor: [
    ['Dashboard', 'Home', '/donor/dashboard'],
    ['My Profile', 'User', '/donor/profile'],
    ['Eligibility Check', 'Check', '/donor/eligibility'],
    ['Book Appointment', 'Date', '/donor/appointments'],
    ['Donation History', 'Log', '/donor/history'],
    ['Badges & Points', 'Award', '/donor/badges'],
    ['Notifications', 'Bell', '/donor/notifications'],
    ['Nearby Requests', 'Map', '/donor/nearby-requests'],
    ['Emergency SOS', 'SOS', '/donor/sos'],
  ],
  hospital: [
    ['Dashboard', 'Home', '/hospital/dashboard'],
    ['Blood Inventory', 'Stock', '/hospital/inventory'],
    ['Raise Request', 'SOS', '/hospital/raise-request'],
    ['Request Status', 'List', '/hospital/requests'],
    ['Appointments', 'Date', '/hospital/appointments'],
    ['Donor Search', 'Find', '/hospital/donor-search'],
    ['Expiry Alerts', 'Clock', '/hospital/expiry-alerts'],
    ['Profile', 'Care', '/hospital/profile'],
    ['Notifications', 'Bell', '/hospital/notifications'],
  ],
  admin: [
    ['Dashboard', 'Home', '/admin/dashboard'],
    ['Users', 'Users', '/admin/users'],
    ['Inventory', 'Stock', '/admin/inventory'],
    ['Requests', 'List', '/admin/requests'],
    ['Analytics', 'Chart', '/admin/analytics'],
    ['Broadcast', 'Cast', '/admin/broadcast'],
    ['Settings', 'Gear', '/admin/settings'],
    ['Reports', 'Docs', '/admin/reports'],
  ],
};

const Sidebar = ({ role }) => {
  const { logout } = useAuth();
  const items = sidebarItems[role] || [];

  return (
    <aside className="sticky top-[65px] hidden h-[calc(100vh-65px)] w-64 border-r border-slate-200 bg-white p-3 lg:block">
      <div className="flex h-full flex-col gap-1">
        {items.map(([label, icon, path]) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold ${
                isActive ? 'bg-[#C0392B] text-white' : 'text-slate-700 hover:bg-slate-100'
              }`
            }
          >
            <span className="min-w-9 text-xs font-black uppercase tracking-wide">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
        <button className="btn-outline mt-auto" onClick={logout}>Logout</button>
      </div>
    </aside>
  );
};

export default Sidebar;
