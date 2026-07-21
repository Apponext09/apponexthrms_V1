import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface EmptyStateCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  docLink?: string;
}

export function EmptyStateCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  docLink,
}: EmptyStateCardProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        {/* Icon */}
        <div className="mb-6 flex justify-center text-muted-foreground">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-6xl"
          >
            {icon}
          </motion.div>
        </div>

        {/* Content */}
        <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
        <p className="text-muted-foreground mb-8">{description}</p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {actionLabel && onAction && (
            <Button onClick={onAction} className="sm:flex-1">
              {actionLabel}
            </Button>
          )}
          {docLink && (
            <Button variant="outline" onClick={() => window.open(docLink, '_blank')} className="sm:flex-1">
              Learn More
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
