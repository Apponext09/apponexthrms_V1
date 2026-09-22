import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore, useAuthHydrated } from '../store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuthStore();
  const authHydrated = useAuthHydrated();

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

      // Get user data immediately (avoid second fetch)
      const currentUser = useAuthStore.getState().user;
      const roles = currentUser?.roles || [];
      const accessRole = String((currentUser as any)?.accessRole || (currentUser as any)?.role || '').toLowerCase();
      const userRolesNorm = roles.map((r: string) => String(r).toLowerCase());
      const cleanEmail = (email || '').trim().toLowerCase();

      // Navigate based on user roles fetched from database
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
        'Invalid email or password';
      setError(serverMsg);
      setLoading(false);
    }
  };

  // Animated blobs for hero section
  const BlobShape = ({ delay, duration }: { delay: number; duration: number }) => (
    <motion.div
      className="absolute blur-3xl rounded-full opacity-30 mix-blend-multiply"
      animate={{
        x: [0, 100, -50, 0],
        y: [0, -50, 100, 0],
      }}
      transition={{
        delay,
        duration,
        repeat: Infinity,
      }}
      style={{
        width: '200px',
        height: '200px',
      }}
    />
  );

  return (
    <div className="min-h-screen flex overflow-hidden bg-background">
      {/* Hero Section - Left side (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/80 to-accent relative overflow-hidden items-center justify-center p-12">
        {/* Animated background blobs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/40 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-accent/40 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-success/40 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />

        <div className="relative z-10 text-white max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white/20 backdrop-blur-md mb-4">
                <span className="text-3xl font-bold">A</span>
              </div>
              <h2 className="text-4xl font-bold mb-4">Apponext HRMS</h2>
              <p className="text-lg text-white/90 leading-relaxed">
                Manage your human resources with elegance and efficiency. Enterprise-grade HRMS built for modern teams.
              </p>
            </div>

            {/* Feature list */}
            <div className="space-y-4 pt-8 border-t border-white/20">
              {[
                'Complete employee lifecycle management',
                'Intelligent payroll processing',
                'Performance & development tracking',
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
                  className="flex gap-3"
                >
                  <div className="flex-shrink-0 text-accent mt-0.5">✓</div>
                  <p className="text-white/80">{feature}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Login Form - Right side / Full on mobile */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-sm"
        >
          {/* Logo for mobile */}
          <div className="lg:hidden mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20 mb-4">
              <span className="text-2xl font-bold text-primary">A</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground mt-2">
              Sign in to your Apponext HRMS account
            </p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back</h1>
            <p className="text-muted-foreground">
              Sign in to your Apponext HRMS account to continue
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs text-primary hover:text-primary/80 transition"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) =>
                  setRememberMe(checked as boolean)
                }
              />
              <label
                htmlFor="remember"
                className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition"
              >
                Remember me
              </label>
            </div>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-danger/10 border border-danger/20 rounded-lg"
              >
                <p className="text-sm text-danger font-medium">{error}</p>
              </motion.div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 font-semibold"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>



          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border/60 text-center space-y-1.5">
            <p className="text-xs font-semibold text-foreground/80">
              © {new Date().getFullYear()} ApponextHRMS
            </p>
            <p className="text-[11px] text-muted-foreground font-medium">
              All rights reserved
            </p>
            <div className="flex gap-4 justify-center pt-2 text-xs text-muted-foreground">
              <a href="#" className="hover:text-foreground transition">
                Privacy
              </a>
              <a href="#" className="hover:text-foreground transition">
                Terms
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
