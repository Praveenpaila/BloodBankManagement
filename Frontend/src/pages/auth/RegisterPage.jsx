import { yupResolver } from '@hookform/resolvers/yup';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Droplet, KeyRound, LogIn, Send, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import * as yup from 'yup';
import api from '../../api/axios';
import { useAuth } from '../../context/authStore';
import { BLOOD_GROUPS } from '../../utils/bloodGroups';

const schema = yup.object({
  firstName: yup.string().required('Name is required'),
  email: yup.string().email('Enter a valid email').required('Email is required'),
  phoneNumber: yup.string().required('Phone number is required'),
  password: yup.string().min(6, 'Use at least 6 characters').required('Password is required'),
  confirmPassword: yup.string().oneOf([yup.ref('password')], 'Passwords must match'),
  city: yup.string().required('City is required'),
  otp: yup.string().required('OTP is required'),
});

const RegisterPage = () => {
  const [params] = useSearchParams();
  const defaultRole = params.get('role') || 'donor';
  const navigate = useNavigate();
  const { register: createAccount, dashboardFor } = useAuth();
  const { register, handleSubmit, control, getValues, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { role: defaultRole, bloodGroup: 'O+', gender: 'male', otp: '' },
  });
  const role = useWatch({ control, name: 'role' });

  const sendOtp = async () => {
    try {
      const { email, phoneNumber } = getValues();
      await api.post('/auth/send-otp', { email, phoneNumber });
      toast.success('OTP sent');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    }
  };

  const submit = async (values) => {
    try {
      const payload = {
        ...values,
        lastName: values.lastName || '',
        age: values.age || 25,
        dob: values.dob || '2000-01-01',
        emergencyContact: values.emergencyContact || values.phoneNumber,
      };
      const nextRole = await createAccount(payload);
      navigate(dashboardFor(nextRole));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <main className="grid min-h-screen place-items-center p-4 sm:p-6">
      <form className="card w-full max-w-3xl" onSubmit={handleSubmit(submit)}>
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-[#982f25]">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#C0392B] shadow-sm">
            <Droplet size={24} fill="currentColor" />
          </span>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Create BloodLink Account</h1>
            <p className="text-sm font-bold">Save Lives. Donate Blood.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-1">
          {['donor', 'hospital', 'organization'].map((item) => (
            <button
              className={role === item ? 'btn-primary' : 'btn-outline'}
              key={item}
              type="button"
              onClick={() => setValue('role', item)}
            >
              {item}
            </button>
          ))}
        </div>
        <input type="hidden" {...register('role')} />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div><input className="input-field" placeholder={role === 'hospital' ? 'Hospital name' : 'First name'} {...register('firstName')} />{errors.firstName && <p className="text-sm text-red-600">{errors.firstName.message}</p>}</div>
          <input className="input-field" placeholder="Last name" {...register('lastName')} />
          <div><input className="input-field" placeholder="Email" {...register('email')} />{errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}</div>
          <div><input className="input-field" placeholder="Phone number" {...register('phoneNumber')} />{errors.phoneNumber && <p className="text-sm text-red-600">{errors.phoneNumber.message}</p>}</div>
          <input className="input-field" placeholder="City" {...register('city')} />
          {role === 'donor' && (
            <>
              <select className="input-field" {...register('bloodGroup')}>{BLOOD_GROUPS.map((group) => <option key={group}>{group}</option>)}</select>
              <input className="input-field" type="date" {...register('dob')} />
              <select className="input-field" {...register('gender')}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select>
              <input className="input-field" type="number" placeholder="Age" {...register('age')} />
              <input className="input-field" placeholder="Emergency contact" {...register('emergencyContact')} />
            </>
          )}
          {role === 'hospital' && <input className="input-field" placeholder="Registration number" {...register('registrationNumber')} />}
          <div><input className="input-field" type="password" placeholder="Password" {...register('password')} />{errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}</div>
          <div><input className="input-field" type="password" placeholder="Confirm password" {...register('confirmPassword')} />{errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>}</div>
          <div className="flex gap-2">
            <input className="input-field" placeholder="OTP" {...register('otp')} />
            <button className="btn-outline" type="button" onClick={sendOtp}><Send size={16} /> Send OTP</button>
          </div>
        </div>
        <button className="btn-primary mt-5 w-full" disabled={isSubmitting}><UserPlus size={16} /> {isSubmitting ? 'Creating...' : 'Register'}</button>
        <p className="mt-4 text-sm">Already registered? <Link className="inline-flex items-center gap-1 font-bold text-[#C0392B]" to="/login"><LogIn size={15} /> Login</Link></p>
      </form>
    </main>
  );
};

export default RegisterPage;
