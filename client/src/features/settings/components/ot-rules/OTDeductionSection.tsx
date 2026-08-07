import React from 'react';
import { 
  Box, 
  Typography, 
  Checkbox, 
  FormControlLabel, 
  TextField, 
  Select, 
  MenuItem,
  FormControl
} from '@mui/material';
import styles from './OTRule.module.scss';

export const OTDeductionSection: React.FC = () => {
  return (
    <div className={styles.calculationCard}>
      <h4>OT Deduction</h4>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <FormControlLabel
          control={<Checkbox size="small" />}
          label={<Typography sx={{ fontSize: '14px' }}>Calculate OT after</Typography>}
          sx={{ mr: 1 }}
        />
        <TextField size="small" sx={{ width: 80, '& .MuiInputBase-input': { p: '6px 8px', fontSize: '14px' } }} />
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <Select defaultValue="Hours" sx={{ fontSize: '14px', '& .MuiSelect-select': { p: '6px 12px' } }}>
            <MenuItem value="Minutes">Minutes</MenuItem>
            <MenuItem value="Hours">Hours</MenuItem>
            <MenuItem value="Days">Days</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </div>
  );
};
