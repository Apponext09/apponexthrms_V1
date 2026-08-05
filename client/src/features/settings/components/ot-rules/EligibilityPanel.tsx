import React, { useState } from 'react';
import { 
  Accordion, 
  AccordionSummary, 
  AccordionDetails, 
  Typography, 
  Checkbox, 
  FormControlLabel, 
  FormGroup,
  Box
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface EligibilityPanelProps {
  title: string;
  defaultExpanded?: boolean;
  items: string[];
}

export const EligibilityPanel: React.FC<EligibilityPanelProps> = ({ 
  title, 
  defaultExpanded = false, 
  items 
}) => {
  const [expanded, setExpanded] = useState<boolean>(defaultExpanded);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedItems(items);
    } else {
      setSelectedItems([]);
    }
  };

  const handleItemChange = (event: React.ChangeEvent<HTMLInputElement>, item: string) => {
    if (event.target.checked) {
      setSelectedItems((prev) => [...prev, item]);
    } else {
      setSelectedItems((prev) => prev.filter((i) => i !== item));
    }
  };

  const isAllSelected = items.length > 0 && selectedItems.length === items.length;
  const isIndeterminate = selectedItems.length > 0 && selectedItems.length < items.length;

  return (
    <Accordion 
      expanded={expanded} 
      onChange={() => setExpanded(!expanded)}
      disableGutters
      sx={{ 
        boxShadow: 'none', 
        borderBottom: '1px solid #e2e8f0',
        '&:before': { display: 'none' }
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2" sx={{ fontWeight: '600' }}>{title}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, pb: 2, px: 3 }}>
        <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox 
                  size="small" 
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={handleSelectAll}
                />
              }
              label="Select All"
              sx={{ '& .MuiTypography-root': { fontSize: '13px', fontWeight: 500 } }}
            />
            {items.map((item) => (
              <FormControlLabel
                key={item}
                control={
                  <Checkbox 
                    size="small" 
                    checked={selectedItems.includes(item)}
                    onChange={(e) => handleItemChange(e, item)}
                  />
                }
                label={item}
                sx={{ '& .MuiTypography-root': { fontSize: '13px', color: '#475569' } }}
              />
            ))}
          </FormGroup>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};
