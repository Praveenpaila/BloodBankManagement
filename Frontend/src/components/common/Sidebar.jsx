import {
  Award,
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  HeartPulse,
  Home,
  Map,
  Megaphone,
  MessageCircle,
  Package,
  Search,
  Settings,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
  User,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/authStore';

export const sidebarItems = {
  donor: [
    ['Dashboard', Home, '/donor/dashboard'],
    ['My Profile', User, '/donor/profile'],
    ['Eligibility Check', ClipboardCheck, '/donor/eligibility'],
    ['Book Appointment', CalendarDays, '/donor/appointments'],
    ['Donation History', ClipboardList, '/donor/history'],
    ['Badges & Points', Award, '/donor/badges'],
    ['Notifications', Bell, '/donor/notifications'],
    ['Chats', MessageCircle, '/donor/chats'],
    ['Nearby Requests', Map, '/donor/nearby-requests'],
    ['Find Blood', Search, '/donor/blood-finder'],
    ['Emergency SOS', Siren, '/donor/sos'],
  ],
  hospital: [
    ['Dashboard', Home, '/hospital/dashboard'],
    ['Blood Inventory', Package, '/hospital/inventory'],
    ['Raise Request', Siren, '/hospital/raise-request'],
    ['Request Status', ClipboardList, '/hospital/requests'],
    ['Appointments', CalendarDays, '/hospital/appointments'],
    ['Donor Search', Search, '/hospital/donor-search'],
    ['Find Blood', Map, '/hospital/blood-finder'],
    ['Expiry Alerts', HeartPulse, '/hospital/expiry-alerts'],
    ['Profile', User, '/hospital/profile'],
    ['Notifications', Bell, '/hospital/notifications'],
    ['Chats', MessageCircle, '/hospital/chats'],
  ],
  admin: [
    ['Dashboard', Home, '/admin/dashboard'],
    ['Users', Users, '/admin/users'],
    ['Inventory', Package, '/admin/inventory'],
    ['Requests', ClipboardList, '/admin/requests'],
    ['Analytics', BarChart3, '/admin/analytics'],
    ['Broadcast', Megaphone, '/admin/broadcast'],
    ['Settings', Settings, '/admin/settings'],
    ['Reports', FileText, '/admin/reports'],
  ],
};

const SidebarContent = ({ role, collapsed }) => {
  const { logout } = useAuth();
  const items = sidebarItems[role] || [];

  return (
    <div className="flex h-full flex-col gap-1">
      {items.map(([label, Icon, path]) => (
        <NavLink
          key={path}
          to={path}
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            `sidebar-link ${collapsed ? 'justify-center px-2' : ''} ${
              isActive ? 'is-active' : ''
            }`
          }
        >
          <Icon size={18} />
          {!collapsed && <span>{label}</span>}
        </NavLink>
      ))}
      <button className="btn-outline mt-auto" onClick={logout}>
        <ShieldCheck size={16} />
        {!collapsed && 'Logout'}
      </button>
    </div>
  );
};

const Sidebar = ({ role }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`dashboard-sidebar hidden md:block ${collapsed ? 'is-collapsed' : ''}`}>
      <button className="btn-outline mb-3 w-full" type="button" onClick={() => setCollapsed((value) => !value)}>
        <SlidersHorizontal size={16} />
        {!collapsed && 'Collapse'}
      </button>
      <SidebarContent role={role} collapsed={collapsed} />
    </aside>
  );
};

export default Sidebar;
