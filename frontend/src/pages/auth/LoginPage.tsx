import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import api from '../../services/api';
import { saveAuthSession } from '../../utils/auth';

const ADMIN_PORTAL_ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'INTERNAL_REP']);

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password, clientPlatform: 'ADMIN_PORTAL' });
      const nextUser = response.data.user;
      if (!ADMIN_PORTAL_ALLOWED_ROLES.has(nextUser.role)) {
        setError('This role is not allowed in the admin portal');
        return;
      }
      saveAuthSession(response.data.accessToken, nextUser);

      const redirectTo = (location.state as { from?: string } | undefined)?.from || '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#f3efe8]">
      <div className="relative z-10 mx-auto w-full max-w-md px-4 pb-10 pt-10 sm:px-0">
        <div className="text-center mb-7">
          <div className="text-[34px] leading-none text-[#b98f47]">⚡</div>
          <h1 className="mt-2 text-[42px] font-black tracking-[0.14em] text-[#0f0f12] leading-none">BLITZ</h1>
          <p className="mt-3 text-[14px] font-bold tracking-[0.3em] text-[#b98f47] uppercase">New York City</p>
          <div className="mx-auto mt-4 h-[4px] w-16 rounded-full bg-[#c3a26a]" />
        </div>

        <div className="w-full rounded-[32px] border border-[#ebe3d8] bg-white p-8 shadow-[0_20px_60px_-40px_rgba(20,15,10,0.45)]">
          <form onSubmit={handleLogin} className="space-y-6">
            {error ? (
              <div className="rounded-xl border border-[#e7c2c2] bg-[#fbefef] px-4 py-3 text-sm font-semibold text-[#b34b4b]">
                {error}
              </div>
            ) : null}

            <div className="space-y-2">
              <h2 className="text-[28px] leading-[1.06] font-black tracking-tight text-[#171311]">Sign in to continue</h2>
              <p className="text-[14px] leading-tight font-semibold text-[#8a8278]">Use your assigned work credentials</p>
            </div>

            <div className="space-y-5 pt-2">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@blitznyc.com"
                required
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <div className="pt-1">
              <Button type="submit" className="w-full text-base py-3.5" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : '⚡ Sign in instantly'}
              </Button>
            </div>

            <div className="pt-1 text-center">
              <p className="text-sm font-medium text-[#8f857b]">
                Need access? <span className="font-bold text-[#b1843f]">Contact your admin</span>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
