import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Droplet, Heart, Activity, User } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export default function Dashboard() {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="dashboard-nav animate-fade-in">
        <div className="nav-brand">
          <Droplet color="var(--primary)" size={28} />
          <span>BloodLink</span>
        </div>
        <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>
          <LogOut size={18} /> Logout
        </button>
      </nav>

      <main className="main-content">
        <div className="glass-panel delay-1 animate-fade-in" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Welcome to BloodLink</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px' }}>
            Your dashboard is ready. From here you can manage your blood donation requests, view your history, and help save lives in your community.
          </p>
        </div>

        <div className="grid-2 delay-2 animate-fade-in" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(230, 46, 77, 0.1)', borderRadius: '16px' }}>
              <Heart color="var(--primary)" size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem' }}>Donate Blood</h3>
            <p style={{ color: 'var(--text-muted)', flex: 1 }}>Find nearby blood banks and schedule a donation appointment.</p>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 'auto' }}>Schedule Now</button>
          </div>

          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(46, 213, 115, 0.1)', borderRadius: '16px' }}>
              <Activity color="var(--success)" size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem' }}>Request Blood</h3>
            <p style={{ color: 'var(--text-muted)', flex: 1 }}>Submit an emergency request for blood and alert nearby donors.</p>
            <button className="btn btn-outline" style={{ width: '100%', marginTop: 'auto' }}>Make Request</button>
          </div>

          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '16px' }}>
              <User color="white" size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem' }}>My Profile</h3>
            <p style={{ color: 'var(--text-muted)', flex: 1 }}>Update your contact information, blood group, and medical history.</p>
            <button className="btn btn-outline" style={{ width: '100%', marginTop: 'auto' }}>View Profile</button>
          </div>

        </div>
      </main>
    </div>
  );
}
