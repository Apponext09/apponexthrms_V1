import { motion } from 'framer-motion';
import { Lightbulb, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ComingSoonPageProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export function ComingSoonPage({
  title,
  description,
  icon = <Lightbulb className="h-16 w-16" />,
}: ComingSoonPageProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        {/* Icon */}
        <div className="mb-8 flex justify-center text-muted-foreground">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            {icon}
          </motion.div>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">
          {title}
        </h1>
        <p className="text-muted-foreground mb-8">
          {description || 'This feature is coming soon. We\'re working hard to bring it to you!'}
        </p>

        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowRight className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </motion.div>
    </div>
  );
}
