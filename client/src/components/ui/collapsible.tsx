import * as React from 'react';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import { motion } from 'framer-motion';

const Collapsible = CollapsiblePrimitive.Root;

interface CollapsibleTriggerProps
  extends React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Trigger> {}

const CollapsibleTrigger = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Trigger>,
  CollapsibleTriggerProps
>(({ className, ...props }, ref) => (
  <CollapsiblePrimitive.Trigger
    ref={ref}
    className={className}
    {...props}
  />
));
CollapsibleTrigger.displayName = CollapsiblePrimitive.Trigger.displayName;

interface CollapsibleContentProps
  extends React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content> {}

const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Content>,
  CollapsibleContentProps
>(({ className, ...props }, ref) => (
  <CollapsiblePrimitive.Content ref={ref} className={className} asChild {...props}>
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      {props.children}
    </motion.div>
  </CollapsiblePrimitive.Content>
));
CollapsibleContent.displayName = CollapsiblePrimitive.Content.displayName;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
