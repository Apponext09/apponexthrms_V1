import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuthStore, useAuthHydrated } from '../store/authStore';
import { useThemeStore } from '@/features/settings/store/themeStore';
import hrmsLogo from '@/assests/hrms.png';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuthStore();
  const authHydrated = useAuthHydrated();
  const { resolvedTheme, toggleTheme } = useThemeStore();

  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    if (!authHydrated || !isAuthenticated || !user) return;
    const roles = user.roles || [];
    const accessRole = String((user as any)?.accessRole || (user as any)?.role || '').toLowerCase();
    const userRolesNorm = roles.map((r: string) => String(r).toLowerCase());

    if (userRolesNorm.includes('super_admin') || accessRole === 'super_admin') {
      navigate('/superadmin/dashboard', { replace: true });
    } else if (userRolesNorm.includes('finance') || userRolesNorm.includes('finance_manager') || accessRole === 'finance' || accessRole === 'finance_manager') {
      navigate('/finance/dashboard', { replace: true });
    } else if (userRolesNorm.includes('organization_admin') || userRolesNorm.includes('ceo') || accessRole === 'organization_admin' || accessRole === 'ceo') {
      navigate('/dashboard', { replace: true });
    } else if (userRolesNorm.includes('hr_manager') || userRolesNorm.includes('hr_admin') || accessRole === 'hr_manager' || accessRole === 'hr_admin') {
      navigate('/hr/dashboard', { replace: true });
    } else if (userRolesNorm.includes('department_head') || userRolesNorm.includes('manager') || accessRole === 'department_head' || accessRole === 'manager') {
      navigate('/manager/dashboard', { replace: true });
    } else if (userRolesNorm.includes('team_lead') || accessRole === 'team_lead') {
      navigate('/team-lead/dashboard', { replace: true });
    } else if (userRolesNorm.includes('intern') || accessRole === 'intern') {
      navigate('/intern/dashboard', { replace: true });
    } else if (userRolesNorm.includes('consultant') || accessRole === 'consultant') {
      navigate('/consultant/dashboard', { replace: true });
    } else {
      navigate('/employee/dashboard', { replace: true });
    }
  }, [authHydrated, isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);

      const currentUser = useAuthStore.getState().user;
      const roles = currentUser?.roles || [];
      const accessRole = String((currentUser as any)?.accessRole || (currentUser as any)?.role || '').toLowerCase();
      const userRolesNorm = roles.map((r: string) => String(r).toLowerCase());

      if (userRolesNorm.includes('super_admin') || accessRole === 'super_admin') {
        navigate('/superadmin/dashboard', { replace: true });
      } else if (userRolesNorm.includes('finance') || userRolesNorm.includes('finance_manager') || accessRole === 'finance' || accessRole === 'finance_manager') {
        navigate('/finance/dashboard', { replace: true });
      } else if (userRolesNorm.includes('organization_admin') || userRolesNorm.includes('ceo') || accessRole === 'organization_admin' || accessRole === 'ceo') {
        navigate('/dashboard', { replace: true });
      } else if (userRolesNorm.includes('hr_manager') || userRolesNorm.includes('hr_admin') || userRolesNorm.includes('hr') || accessRole === 'hr_manager' || accessRole === 'hr_admin' || accessRole === 'hr') {
        navigate('/hr/dashboard', { replace: true });
      } else if (userRolesNorm.includes('support') || accessRole === 'support') {
        navigate('/hr/dashboard', { replace: true });
      } else if (userRolesNorm.includes('department_head') || userRolesNorm.includes('manager') || accessRole === 'department_head' || accessRole === 'manager') {
        navigate('/manager/dashboard', { replace: true });
      } else if (userRolesNorm.includes('team_lead') || accessRole === 'team_lead') {
        navigate('/team-lead/dashboard', { replace: true });
      } else if (userRolesNorm.includes('intern') || accessRole === 'intern') {
        navigate('/intern/dashboard', { replace: true });
      } else if (userRolesNorm.includes('consultant') || accessRole === 'consultant') {
        navigate('/consultant/dashboard', { replace: true });
      } else {
        navigate('/employee/dashboard', { replace: true });
      }
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Invalid username, employee ID, or password';
      setError(serverMsg);
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-screen max-h-screen overflow-hidden flex flex-col justify-between bg-gradient-to-br from-[#f6faff] via-[#edf4fe] to-[#e0efff] dark:from-[#060b13] dark:via-[#0c1424] dark:to-[#070e1b] font-sans select-none transition-colors duration-300">

      {/* ─── Ambient Glow Blobs ────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full bg-blue-400/25 dark:bg-blue-600/15 blur-[140px] transition-colors duration-300" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-sky-300/35 dark:bg-sky-500/15 blur-[150px] transition-colors duration-300" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-indigo-200/20 dark:bg-indigo-600/15 blur-[170px] transition-colors duration-300" />

      {/* ─── Precise Constellation Mesh SVG ───────────────────────────────── */}
      <svg
        className="pointer-events-none absolute inset-0 w-full h-full transition-opacity duration-300"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="netLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isDark ? '#38bdf8' : '#93c5fd'} stopOpacity={isDark ? '0.45' : '0.55'} />
            <stop offset="50%" stopColor={isDark ? '#6366f1' : '#60a5fa'} stopOpacity={isDark ? '0.30' : '0.35'} />
            <stop offset="100%" stopColor={isDark ? '#1e40af' : '#bfdbfe'} stopOpacity={isDark ? '0.15' : '0.2'} />
          </linearGradient>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isDark ? '#38bdf8' : '#3b82f6'} stopOpacity={isDark ? '0.6' : '0.5'} />
            <stop offset="100%" stopColor={isDark ? '#0284c7' : '#3b82f6'} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Constellation Web Lines - Left Area */}
        <g stroke="url(#netLineGrad)" strokeWidth="1.2" fill="none">
          <line x1="20" y1="120" x2="160" y2="240" />
          <line x1="160" y1="240" x2="90" y2="420" />
          <line x1="20" y1="360" x2="90" y2="420" />
          <line x1="90" y1="420" x2="220" y2="520" />
          <line x1="160" y1="240" x2="340" y2="340" />
          <line x1="220" y1="520" x2="360" y2="600" />
          <line x1="90" y1="420" x2="150" y2="700" />
          <line x1="220" y1="520" x2="150" y2="700" />
          <line x1="150" y1="700" x2="250" y2="860" />
          <line x1="220" y1="520" x2="250" y2="860" />
          <line x1="250" y1="860" x2="400" y2="880" />
          <line x1="360" y1="600" x2="400" y2="880" />
          <line x1="400" y1="880" x2="560" y2="780" />
        </g>

        {/* Constellation Web Lines - Right Area */}
        <g stroke="url(#netLineGrad)" strokeWidth="1.2" fill="none">
          <line x1="940" y1="40" x2="840" y2="160" />
          <line x1="840" y1="160" x2="1080" y2="220" />
          <line x1="1080" y1="220" x2="1260" y2="120" />
          <line x1="1260" y1="120" x2="1440" y2="180" />
          <line x1="840" y1="160" x2="790" y2="360" />
          <line x1="790" y1="360" x2="960" y2="440" />
          <line x1="960" y1="440" x2="1080" y2="220" />
          <line x1="960" y1="440" x2="1220" y2="390" />
          <line x1="1080" y1="220" x2="1260" y2="320" />
          <line x1="790" y1="360" x2="900" y2="620" />
          <line x1="900" y1="620" x2="1160" y2="600" />
          <line x1="1160" y1="600" x2="1220" y2="390" />
          <line x1="900" y1="620" x2="1060" y2="800" />
          <line x1="1060" y1="800" x2="1280" y2="760" />
        </g>

        {/* Soft Glowing Major Constellation Nodes */}
        <circle cx="220" cy="520" r="28" fill="url(#nodeGlow)" />
        <circle cx="220" cy="520" r="7" fill={isDark ? '#38bdf8' : '#3b82f6'} />
        <circle cx="220" cy="520" r="3.5" fill="#ffffff" />

        <circle cx="250" cy="860" r="32" fill="url(#nodeGlow)" />
        <circle cx="250" cy="860" r="8" fill={isDark ? '#0284c7' : '#2563eb'} />
        <circle cx="250" cy="860" r="4" fill="#ffffff" />

        <circle cx="560" cy="780" r="24" fill="url(#nodeGlow)" />
        <circle cx="560" cy="780" r="6" fill={isDark ? '#38bdf8' : '#3b82f6'} />

        <circle cx="840" cy="160" r="30" fill="url(#nodeGlow)" />
        <circle cx="840" cy="160" r="8" fill={isDark ? '#38bdf8' : '#3b82f6'} />
        <circle cx="840" cy="160" r="3.5" fill="#ffffff" />

        <circle cx="1220" cy="390" r="28" fill="url(#nodeGlow)" />
        <circle cx="1220" cy="390" r="7" fill={isDark ? '#38bdf8' : '#3b82f6'} />
      </svg>

      {/* ─── Top Header Navigation Bar ────────────────────────────────────── */}
      <header className="relative z-20 shrink-0 w-full px-5 py-3 sm:px-8 sm:py-3.5 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <img
            src={hrmsLogo}
            alt="Apponext HRMS"
            className="w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow-xs"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white transition-colors">
                APPONEXT <span className="text-blue-600 dark:text-blue-400">HRMS</span>
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] font-semibold text-slate-400 dark:text-slate-500 tracking-wide uppercase transition-colors">
              Manage • Empower • Grow
            </p>
          </div>
        </div>

        {/* ─── Theme Toggle Button (System Default / Quick Toggle) ────────── */}
        <button
          type="button"
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="flex items-center justify-center size-9 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md hover:bg-slate-100/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-xs transition-all duration-200 cursor-pointer active:scale-95"
          aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700 dark:text-slate-200" />
          )}
        </button>
      </header>

      {/* ─── Main Content Area (Centered Card, No Scroll) ─────────────────── */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-3 sm:p-4 overflow-hidden">
        <div className="w-full max-w-[400px]">

          {/* Floating Luxury Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="relative rounded-[24px] bg-white/95 dark:bg-slate-900/90 p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(28,78,168,0.18),0_0_0_1px_rgba(226,232,240,0.9)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8),0_0_0_1px_rgba(51,65,85,0.6),0_0_35px_rgba(59,130,246,0.08)] backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 transition-all duration-300"
          >
            {/* Top Subtle Blue Gradient Line */}
            <div className="absolute top-0 left-10 right-10 h-[3px] bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-t-full" />

            {/* Apponext HRMS Official Logo */}
            <div className="flex justify-center mb-3">
              <img
                src={hrmsLogo}
                alt="Apponext HRMS Logo"
                className="h-16 w-auto object-contain drop-shadow-xs"
              />
            </div>

            {/* Header Titles */}
            <div className="text-center mb-5">
              <h1 className="text-xl sm:text-[23px] font-black text-slate-900 dark:text-white tracking-tight leading-tight transition-colors">
                Login to HRMS
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 transition-colors">
                Enter your credentials to continue
              </p>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  className="mb-3.5 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs font-semibold text-center shadow-2xs"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">

              {/* Username / Employee ID */}
              <div className="group relative flex items-center rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:border-blue-600 dark:focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 dark:focus-within:ring-blue-500/20 transition-all duration-200">
                <div className="absolute left-3.5 pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
                  <User className="w-4 h-4 stroke-[2]" />
                </div>
                <input
                  id="username-input"
                  type="text"
                  required
                  placeholder="Username / Employee ID"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-transparent text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-medium outline-none"
                />
              </div>

              {/* Password */}
              <div className="group relative flex items-center rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:border-blue-600 dark:focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 dark:focus-within:ring-blue-500/20 transition-all duration-200">
                <div className="absolute left-3.5 pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
                  <Lock className="w-4 h-4 stroke-[2]" />
                </div>
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 rounded-xl bg-transparent text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-medium outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 stroke-[2]" />
                  ) : (
                    <Eye className="w-4 h-4 stroke-[2]" />
                  )}
                </button>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full h-11 mt-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-sm tracking-wide shadow-md shadow-blue-600/25 hover:shadow-blue-600/35 dark:shadow-blue-600/30 transition-all duration-150 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Login</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.4] group-hover:translate-x-1 transition-transform duration-200" />
                  </>
                )}
              </button>
            </form>

            {/* Trust Footer */}
            <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-slate-400 dark:text-slate-500 transition-colors">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500/80" />
              <span>Human Resource Management System • Trusted & Secure</span>
            </div>
          </motion.div>
        </div>
      </main>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="relative z-20 shrink-0 w-full px-5 py-2.5 sm:px-8 flex flex-col sm:flex-row items-center justify-between text-[11px] font-semibold text-slate-500/80 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-950/40 backdrop-blur-xs transition-colors duration-300">
        <p>© {new Date().getFullYear()} ApponextHRMS Platform. All rights reserved.</p>
        <div className="flex items-center gap-3 mt-0.5 sm:mt-0 text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">
          <span className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer">Privacy Policy</span>
          <span>•</span>
          <span className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer">Terms of Service</span>
          <span>•</span>
          <span className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer">Support</span>
        </div>
      </footer>
    </div>
  );
}
