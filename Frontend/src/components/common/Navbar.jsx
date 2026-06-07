import { Bell, Menu, UserCircle } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/authStore';
import { useSocket } from '../../context/SocketContext';
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

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { socket } = useSocket();
  const [open, setOpen] = useState(false);
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
    const bump = () => setUnread((value) => value + 1);
    const refresh = async () => {
      try {
        const { data } = await api.get('/notifications');
        setUnread(data.data.filter((item) => !item.isRead).length);
      } catch {
        setUnread(0);
      }
    };
    socket.on('blood-request:new', bump);
    socket.on('blood-request:response', bump);
    socket.on('blood-request:closed', refresh);
    return () => {
      socket.off('blood-request:new', bump);
      socket.off('blood-request:response', bump);
      socket.off('blood-request:closed', refresh);
    };
  }, [socket]);

  const links = isAuthenticated ? roleLinks[user?.role] || [] : publicLinks;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-xl font-black text-[#C0392B]">
          <span>🩸</span>
          <span>BloodLink</span>
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          {links.map(([label, path]) => (
            <NavLink key={path} to={path} className="text-sm font-bold text-slate-700">
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <>
              <Link className="relative rounded-full border border-slate-200 p-2" to={`/${user.role}/notifications`}>
                <Bell size={18} />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#C0392B] px-1 text-xs font-bold text-white">
                    {unread}
                  </span>
                )}
              </Link>
              <div className="flex items-center gap-2 text-sm font-bold">
                <UserCircle size={22} />
                {user?.firstName}
              </div>
              <button className="btn-outline" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link className="btn-outline" to="/login">Login</Link>
              <Link className="btn-primary" to="/register">Register</Link>
            </>
          )}
        </div>

        <button className="btn-outline md:hidden" onClick={() => setOpen((value) => !value)} aria-label="Menu">
          <Menu size={18} />
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-3">
            {links.map(([label, path]) => (
              <NavLink key={path} to={path} onClick={() => setOpen(false)}>
                {label}
              </NavLink>
            ))}
            {isAuthenticated ? (
              <button className="btn-outline" onClick={logout}>Logout</button>
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
