import { yupResolver } from '@hookform/resolvers/yup';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Droplet, LogIn, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import * as yup from 'yup';
import { useAuth } from '../../context/authStore';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const schema = yup.object({
  email: yup.string().email('Enter a valid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user, dashboardFor, loading } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: yupResolver(schema) });

  if (loading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to={dashboardFor(user.role)} replace />;
  }

  const submit = async (values) => {
    try {
      const role = await login(values.email, values.password);
      navigate(dashboardFor(role));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <main className="grid min-h-screen md:grid-cols-2">
      <section className="hidden bg-[#1A2340] p-10 text-white md:grid md:place-items-center">
        <div>
          <Droplet className="mb-4 text-[#E53E3E]" size={44} fill="currentColor" />
          <h1 className="text-5xl font-black">BloodLink</h1>
          <p className="mt-4 max-w-md text-slate-200">Sign in to manage donations, inventory, requests and analytics.</p>
        </div>
      </section>
      <section className="grid place-items-center p-4">
        <form className="card w-full max-w-md" onSubmit={handleSubmit(submit)}>
          <h2 className="text-2xl font-black">Login</h2>
          <label className="mt-5 block text-sm font-bold">Email</label>
          <input className="input-field mt-1" {...register('email')} />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          <label className="mt-4 block text-sm font-bold">Password</label>
          <input className="input-field mt-1" type="password" {...register('password')} />
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
          <button className="btn-primary mt-5 w-full" disabled={isSubmitting}><LogIn size={16} /> {isSubmitting ? 'Signing in...' : 'Login'}</button>
          <div className="mt-4 flex justify-between text-sm">
            <Link to="/forgot-password">Forgot password?</Link>
            <Link className="inline-flex items-center gap-1 font-bold text-[#C0392B]" to="/register"><UserPlus size={15} /> Register</Link>
          </div>
        </form>
      </section>
    </main>
  );
};

export default LoginPage;
