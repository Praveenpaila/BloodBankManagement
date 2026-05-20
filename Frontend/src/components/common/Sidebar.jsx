import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const sidebarItems = {
  donor: [
    ['Dashboard', '🏠', '/donor/dashboard'],
    ['My Profile', '👤', '/donor/profile'],
    ['Eligibility Check', '✅', '/donor/eligibility'],
    ['Book Appointment', '📅', '/donor/appointments'],
    ['Donation History', '🧾', '/donor/history'],
    ['Badges & Points', '🏅', '/donor/badges'],
    ['Notifications', '🔔', '/donor/notifications'],
    ['Nearby Requests', '📍', '/donor/nearby-requests'],
  ],
  hospital: [
    ['Dashboard', '🏠', '/hospital/dashboard'],
    ['Blood Inventory', '🧪', '/hospital/inventory'],
    ['Raise Request', '🚨', '/hospital/raise-request'],
    ['Request Status', '📋', '/hospital/requests'],
    ['Donor Search', '🔎', '/hospital/donor-search'],
    ['Expiry Alerts', '⏰', '/hospital/expiry-alerts'],
    ['Profile', '🏥', '/hospital/profile'],
    ['Notifications', '🔔', '/hospital/notifications'],
  ],
  admin: [
    ['Dashboard', '🏠', '/admin/dashboard'],
    ['Users', '👥', '/admin/users'],
    ['Inventory', '🧪', '/admin/inventory'],
    ['Requests', '📋', '/admin/requests'],
    ['Analytics', '📊', '/admin/analytics'],
    ['Broadcast', '📣', '/admin/broadcast'],
    ['Settings', '⚙️', '/admin/settings'],
    ['Reports', '📄', '/admin/reports'],
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
            <span>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
        <button className="btn-outline mt-auto" onClick={logout}>Logout</button>
      </div>
    </aside>
  );
};

export default Sidebar;
