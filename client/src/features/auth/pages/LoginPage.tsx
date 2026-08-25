import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

export function LoginPage() {
  const [email, setEmail] = useState('admin@apponexthrms.com');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      const currentUser = useAuthStore.getState().user;
      const roles = currentUser?.roles || [];
      const cleanEmail = (email || '').trim().toLowerCase();

      if (cleanEmail.includes('superadmin') || roles.includes('super_admin')) {
        navigate('/superadmin/dashboard');
      } else if (cleanEmail.includes('mm') || cleanEmail.includes('admin') || roles.includes('organization_admin')) {
        navigate('/dashboard');
      } else if (cleanEmail.includes('pp') || roles.includes('department_head') || roles.includes('manager')) {
        navigate('/manager/dashboard');
      } else if (roles.includes('hr_manager') || cleanEmail.includes('hr')) {
        navigate('/hr/dashboard');
      } else if (roles.includes('team_lead')) {
        navigate('/team-lead/dashboard');
      } else if (roles.includes('intern')) {
        navigate('/intern/dashboard');
      } else if (roles.includes('consultant')) {
        navigate('/consultant/dashboard');
      } else if (roles.includes('employee')) {
        navigate('/employee/dashboard');
      } else {
        navigate('/employee/dashboard');
      }
    } catch (err) {
      setError('Invalid email or password');
    } finally {
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

          {/* Demo credentials */}
          <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-border space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Quick Demo Login Presets
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@apponexthrms.com');
                  setPassword('Admin@123');
                }}
                className="p-2 text-left rounded-lg bg-background hover:bg-muted border border-border transition text-xs"
              >
                <div className="font-bold text-foreground">CEO (Admin)</div>
                <div className="text-[10px] text-muted-foreground truncate">admin@apponexthrms.com</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('superadmin@apponext.com');
                  setPassword('SuperAdmin@2026!Secure');
                }}
                className="p-2 text-left rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition text-xs"
              >
                <div className="font-bold text-amber-500 flex items-center gap-1">
                  ⚡ Super Admin
                </div>
                <div className="text-[10px] text-muted-foreground truncate">superadmin@apponext.com</div>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              ApponextHRMS v1.0.0 • {new Date().getFullYear()} All rights reserved
            </p>
            <div className="flex gap-4 justify-center mt-4 text-xs text-muted-foreground">
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
