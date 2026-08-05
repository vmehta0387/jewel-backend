import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import api from '../../services/api';
import { saveAuthSession } from '../../utils/auth';
import loginLogo from '../../assets/login-logo.png';

const ADMIN_PORTAL_ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'INTERNAL_REP', 'COMPANY_ADMIN']);

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

      const roleDefaultRoute = nextUser.role === 'COMPANY_ADMIN' ? '/orders' : '/dashboard';
      const redirectTo = (location.state as { from?: string } | undefined)?.from || roleDefaultRoute;
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
        <div className="flex justify-center mb-7">
          <img src={loginLogo} alt="BLITZ New York City" className="h-48 w-48 object-contain sm:h-56 sm:w-56" />
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
              <Link
                to="/privacy-policy"
                className="mt-3 inline-flex text-sm font-bold text-[#9a6f33] underline-offset-4 transition hover:text-[#6f4a18] hover:underline"
              >
                Privacy Policy
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
