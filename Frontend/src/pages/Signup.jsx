import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Droplet, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export default function Signup() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    dob: '',
    bloodGroup: '',
    password: '',
    gender: '',
    city: '',
    emergencyContact: '',
    age: '',
    otp: ''
  });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const { signup, sendOtp, resendOtp, isLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    // Validate required fields for step 1
    const { firstName, lastName, email, phoneNumber, dob, bloodGroup, password, gender, city, emergencyContact, age } = formData;
    if (!firstName || !lastName || !email || !phoneNumber || !dob || !bloodGroup || !password || !gender || !city || !emergencyContact || !age) {
      setError('Please fill in all details before requesting an OTP');
      return;
    }

    const res = await sendOtp({ email, phoneNumber });
    if (res.success) {
      setSuccessMsg('OTP sent successfully to your Email and Phone!');
      setStep(2);
    } else {
      setError(res.message);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!formData.otp) {
      setError('Please enter the OTP');
      return;
    }

    const res = await signup(formData);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.message);
    }
  };

  const handleResendOtp = async () => {
    const { email, phoneNumber } = formData;

    if (!email || !phoneNumber) {
      setError('Email and phone number are required to resend OTP');
      return;
    }

    const res = await resendOtp({ email, phoneNumber });
    if (res.success) {
      setFormData({ ...formData, otp: '' });
      setSuccessMsg('A new OTP has been sent to your email');
      setError('');
    } else {
      setError(res.message);
      setSuccessMsg('');
    }
  };

  return (
    <div className="auth-container">
      <div className={`glass-panel auth-card ${step === 1 ? 'auth-card-large' : ''} animate-fade-in`}>
        <div className="auth-header">
          <div className="auth-logo">
            {step === 1 ? <Droplet color="white" size={32} /> : <ShieldCheck color="white" size={32} />}
          </div>
          <h1 className="auth-title">{step === 1 ? 'Join BloodLink' : 'Verify OTP'}</h1>
          <p className="auth-subtitle">
            {step === 1 ? 'Register as a donor or receiver and save lives' : `Enter the 6-digit code sent to ${formData.email}`}
          </p>
        </div>

        {error && <div className="error-text" style={{ textAlign: 'center', marginBottom: '1rem' }}>{error}</div>}
        {successMsg && <div className="success-text" style={{ textAlign: 'center', marginBottom: '1rem' }}>{successMsg}</div>}

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="animate-fade-in">
            <div className="grid-2">
              <div className="input-group">
                <label>First Name</label>
                <input type="text" name="firstName" className="input-field" value={formData.firstName} onChange={handleChange} />
              </div>
              <div className="input-group">
                <label>Last Name</label>
                <input type="text" name="lastName" className="input-field" value={formData.lastName} onChange={handleChange} />
              </div>
              <div className="input-group">
                <label>Email Address</label>
                <input type="email" name="email" className="input-field" value={formData.email} onChange={handleChange} />
              </div>
              <div className="input-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  placeholder="Phone Number"
                  className="input-field"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="input-group">
                <label>Password</label>
                <input type="password" name="password" className="input-field" value={formData.password} onChange={handleChange} />
              </div>
              <div className="input-group">
                <label>Date of Birth</label>
                <input type="date" name="dob" className="input-field" value={formData.dob} onChange={handleChange} style={{ colorScheme: 'dark' }} />
              </div>
              <div className="input-group">
                <label>Age</label>
                <input type="number" name="age" className="input-field" value={formData.age} onChange={handleChange} />
              </div>
              <div className="input-group">
                <label>Gender</label>
                <select name="gender" className="input-field" value={formData.gender} onChange={handleChange}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="input-group">
                <label>Blood Group</label>
                <select name="bloodGroup" className="input-field" value={formData.bloodGroup} onChange={handleChange}>
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
              <div className="input-group">
                <label>City</label>
                <input type="text" name="city" className="input-field" value={formData.city} onChange={handleChange} />
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label>Emergency Contact</label>
                <input type="tel" name="emergencyContact" className="input-field" value={formData.emergencyContact} onChange={handleChange} />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send OTP'}
              {!isLoading && <ArrowRight size={20} />}
            </button>
            
            <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)' }}>
              Already have an account? <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}>Sign in</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="animate-fade-in">
            <div className="input-group">
              <label>6-Digit OTP</label>
              <input 
                type="text" 
                name="otp" 
                placeholder="XXXXXX" 
                className="input-field" 
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
                value={formData.otp} 
                onChange={handleChange} 
                maxLength="6"
              />
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Verify & Register'}
            </button>

            <button
              type="button"
              className="btn btn-outline"
              style={{ width: '100%', marginTop: '1rem' }}
              onClick={handleResendOtp}
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Resend OTP'}
            </button>
            
            <button 
              type="button" 
              className="btn btn-outline" 
              style={{ width: '100%', marginTop: '1rem' }} 
              onClick={() => { setStep(1); setSuccessMsg(''); }}
              disabled={isLoading}
            >
              <ArrowLeft size={20} /> Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
