import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import api from '../../services/api';
import { saveAuthSession } from '../../utils/auth';

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
      const response = await api.post('/auth/login', { email, password });
      saveAuthSession(response.data.accessToken, response.data.user);

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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
      {/* Immersive Background Ornaments */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-sky-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[15%] w-[30%] h-[30%] rounded-full bg-violet-500/5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        <div className="text-center mb-10 w-full animate-fade-in" style={{ animationDuration: '0.8s' }}>
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-soft ring-4 ring-white/60 mb-8 transform transition-transform hover:scale-105">
            <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
            Jewelry Platform
          </h1>
          <p className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Secure Admin Access
          </p>
        </div>

        <div className="glass-panel w-full rounded-3xl shadow-glass-xl border-t border-l border-white/80 p-8 sm:p-10 animate-fade-in" style={{ animationDuration: '1s' }}>
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/80 backdrop-blur-sm px-4 py-3 text-sm font-bold tracking-wide text-rose-700 shadow-sm animate-fade-in relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"></div>
                {error}
              </div>
            )}
            
            <div className="space-y-5">
              <Input
                label="Administrator Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@jewelryplatform.com"
                required
              />
              <Input
                label="Account Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full text-base py-3 shadow-md group" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Authenticating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Enter Portal
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                  </span>
                )}
              </Button>
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-xs font-medium text-slate-400">
                Protected by advanced encryption. Unauthorized access is strictly prohibited.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
