import { Bell, ChevronDown, Droplet, LogOut, Menu, Settings, User } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/authStore';
import { useSocket } from '../../context/SocketContext';
import { sidebarItems } from './Sidebar';
import api from '../../api/axios';

const publicLinks = [
  ['Home', '/'],
  ['About', '/about'],
  ['Search', '/search'],
  ['Contact', '/contact'],
];

const roleLinks = {
  donor: [['Dashboard', '/donor/dashboard'], ['Requests', '/donor/nearby-requests'], ['Find Blood', '/donor/blood-finder'], ['SOS', '/donor/sos']],
  hospital: [['Dashboard', '/hospital/dashboard'], ['Inventory', '/hospital/inventory'], ['Find Blood', '/hospital/blood-finder']],
  admin: [['Dashboard', '/admin/dashboard'], ['Users', '/admin/users']],
};

const getInitial = (user) => (user?.firstName || user?.hospitalName || user?.email || 'U').slice(0, 1).toUpperCase();
const profilePath = (role) => (role === 'hospital' ? '/hospital/profile' : role === 'admin' ? '/admin/settings' : '/donor/profile');

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { socket } = useSocket();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const load = async () => {
      try {
        const { data } = await api.get('/notifications');
        setUnread(data.data.filter((item) => !item.isRead).length);
      } catch {
        setUnread(0);
      }
    };

    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!socket) return undefined;
    const refresh = async () => {
      try {
        const { data } = await api.get('/notifications');
        setUnread(data.data.filter((item) => !item.isRead).length);
      } catch {
        setUnread(0);
      }
    };
    socket.on('blood-request:new', refresh);
    socket.on('blood-request:response', refresh);
    socket.on('blood-request:closed', refresh);
    socket.on('chat:ready', refresh);
    return () => {
      socket.off('blood-request:new', refresh);
      socket.off('blood-request:response', refresh);
      socket.off('blood-request:closed', refresh);
      socket.off('chat:ready', refresh);
    };
  }, [socket]);

  const links = isAuthenticated ? roleLinks[user?.role] || [] : publicLinks;
  const mobileLinks = isAuthenticated ? sidebarItems[user?.role] || [] : publicLinks.map(([label, path]) => [label, null, path]);
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.hospitalName || user?.email || 'Profile';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-xl font-black text-[#C0392B]">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-red-50">
            <Droplet size={21} fill="currentColor" />
          </span>
          <span>BloodLink</span>
        </Link>

        <nav className="hidden items-center gap-5 md:ml-auto md:flex">
          {links.map(([label, path]) => (
            <NavLink key={path} to={path} className={({ isActive }) => `text-sm font-bold ${isActive ? 'text-[#C0392B]' : 'text-slate-700'}`}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:ml-8 md:flex">
          {isAuthenticated ? (
            <>
              <Link className="relative rounded-full border border-slate-200 p-2 hover:bg-slate-50" to={`/${user.role}/notifications`}>
                <Bell size={18} />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#C0392B] px-1 text-xs font-bold text-white">
                    {unread}
                  </span>
                )}
              </Link>
              <div className="relative">
                <button className="profile-trigger" type="button" onClick={() => setProfileOpen((value) => !value)}>
                  <span className="avatar-circle">{getInitial(user)}</span>
                  <span className="text-left">
                    <span className="block text-sm font-black">{name}</span>
                    <span className="role-badge">{user?.role || 'User'}</span>
                  </span>
                  <ChevronDown size={16} />
                </button>
                {profileOpen && (
                  <div className="profile-menu">
                    <Link to={profilePath(user?.role)} onClick={() => setProfileOpen(false)}><User size={16} /> Profile</Link>
                    <Link to={user?.role === 'admin' ? '/admin/settings' : profilePath(user?.role)} onClick={() => setProfileOpen(false)}><Settings size={16} /> Settings</Link>
                    <button type="button" onClick={logout}><LogOut size={16} /> Logout</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link className="btn-outline" to="/login">Login</Link>
              <Link className="btn-primary" to="/register">Register</Link>
            </>
          )}
        </div>

        <button className="btn-outline mobile-menu-toggle" onClick={() => setOpen((value) => !value)} aria-label="Menu">
          <Menu size={18} />
        </button>
      </div>

      {open && (
        <div className="mobile-nav-panel border-t border-slate-200 bg-white px-4 py-3">
          <div className="flex flex-col gap-3">
            {mobileLinks.map(([label, Icon, path]) => (
              <NavLink key={path} to={path} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 font-bold text-slate-700 hover:bg-slate-100">
                {Icon && <Icon size={17} />}
                {label}
                {label === 'Notifications' && unread > 0 ? ` (${unread})` : ''}
              </NavLink>
            ))}
            {isAuthenticated ? (
              <>
                <Link className="btn-outline" to={profilePath(user?.role)} onClick={() => setOpen(false)}>
                  <User size={16} /> {name}
                </Link>
                <button className="btn-outline" onClick={logout}><LogOut size={16} /> Logout</button>
              </>
            ) : (
              <>
                <Link className="btn-outline" to="/login" onClick={() => setOpen(false)}>Login</Link>
                <Link className="btn-primary" to="/register" onClick={() => setOpen(false)}>Register</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
