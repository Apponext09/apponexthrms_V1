import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Home, ChevronLeft, Lock } from 'lucide-react';

export function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        {/* 403 Illustration */}
        <div className="mb-8 flex justify-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-6xl text-danger/40"
          >
            <Lock className="h-20 w-20" />
          </motion.div>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">
          Access Denied
        </h1>
        <p className="text-muted-foreground mb-8">
          You don't have permission to access this resource. If you believe this is a mistake, contact your administrator.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate(-1)} variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <Button onClick={() => navigate('/')}>
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
