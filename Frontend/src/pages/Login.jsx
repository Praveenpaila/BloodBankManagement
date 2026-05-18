import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Droplet, ArrowRight, Mail, Phone, Lock } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export default function Login() {
  const [usePhone, setUsePhone] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    phoneNumber: '',
    password: ''
  });
  const [error, setError] = useState('');
  const { login, isLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.password || (!formData.email && !formData.phoneNumber)) {
      setError('Please fill in all required fields');
      return;
    }

    const res = await login(formData);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card animate-fade-in">
        <div className="auth-header">
          <div className="auth-logo">
            <Droplet color="white" size={32} />
          </div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to your BloodLink account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group delay-1 animate-fade-in" style={{ animationFillMode: 'both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label>Login with</label>
              <button 
                type="button" 
                onClick={() => { setUsePhone(!usePhone); setFormData({...formData, email: '', phoneNumber: ''}); setError(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                Use {usePhone ? 'Email' : 'Phone'} instead
              </button>
            </div>
            
            {usePhone ? (
              <div style={{ position: 'relative' }}>
                <Phone size={20} color="rgba(255,255,255,0.5)" style={{ position: 'absolute', top: '14px', left: '14px' }} />
                <input
                  type="tel"
                  name="phoneNumber"
                  placeholder="Phone Number (+1...)"
                  className="input-field"
                  style={{ paddingLeft: '2.75rem' }}
                  value={formData.phoneNumber}
                  onChange={handleChange}
                />
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <Mail size={20} color="rgba(255,255,255,0.5)" style={{ position: 'absolute', top: '14px', left: '14px' }} />
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  className="input-field"
                  style={{ paddingLeft: '2.75rem' }}
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            )}
          </div>

          <div className="input-group delay-2 animate-fade-in" style={{ animationFillMode: 'both' }}>
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={20} color="rgba(255,255,255,0.5)" style={{ position: 'absolute', top: '14px', left: '14px' }} />
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                className="input-field"
                style={{ paddingLeft: '2.75rem' }}
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          {error && <div className="error-text delay-2 animate-fade-in" style={{ animationFillMode: 'both', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

          <button 
            type="submit" 
            className="btn btn-primary delay-3 animate-fade-in" 
            style={{ width: '100%', marginTop: '1rem', animationFillMode: 'both' }}
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
            {!isLoading && <ArrowRight size={20} />}
          </button>
        </form>

        <p className="delay-3 animate-fade-in" style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-muted)', animationFillMode: 'both' }}>
          Don't have an account? <Link to="/signup" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}
