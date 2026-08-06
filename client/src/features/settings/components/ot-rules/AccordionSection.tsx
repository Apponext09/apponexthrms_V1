import React, { useState } from 'react';
import { 
  Accordion, 
  AccordionSummary, 
  AccordionDetails, 
  Typography, 
  Box 
} from '@mui/material';
import styles from './OTRule.module.scss';
import { OTCalculationSection } from './OTCalculationSection';
import { OTDeductionSection } from './OTDeductionSection';
import { PaySection } from './PaySection';

interface AccordionSectionProps {
  title: string;
}

export const AccordionSection: React.FC<AccordionSectionProps> = ({ title }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Accordion 
      className={styles.accordionSection} 
      disableGutters
      expanded={expanded}
      onChange={(_, isExpanded) => setExpanded(isExpanded)}
    >
      <AccordionSummary
        sx={{
          backgroundColor: '#eaeaea', // Grey accordion headers as requested
          minHeight: '44px !important',
          '& .MuiAccordionSummary-content': { margin: '8px 0 !important' },
          borderBottom: expanded ? '1px solid #e2e8f0' : 'none'
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: '700', color: '#1e293b' }}>
          {expanded ? '[-] ' : '[+] '} {title}
        </Typography>
      </AccordionSummary>
      <AccordionDetails className={styles.accordionContent}>
        {/* Calculate OT If */}
        <OTCalculationSection />
        
        {/* OT Deduction */}
        <OTDeductionSection />
        
        {/* Pay */}
        <PaySection />
      </AccordionDetails>
    </Accordion>
  );
};
