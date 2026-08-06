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

export const OTCalculationSection: React.FC = () => {
  return (
    <div className={styles.calculationCard}>
      <h4>Calculate OT If</h4>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Before shift time */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <FormControlLabel
            control={<Checkbox size="small" />}
            label={<Typography sx={{ fontSize: '14px' }}>Daily Worked For Minimum</Typography>}
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
          <Typography sx={{ fontSize: '14px', color: '#475569' }}>before shift time</Typography>
        </Box>

        {/* After shift time */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <FormControlLabel
            control={<Checkbox size="small" />}
            label={<Typography sx={{ fontSize: '14px' }}>Daily Worked For Minimum</Typography>}
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
          <Typography sx={{ fontSize: '14px', color: '#475569' }}>after shift time</Typography>
        </Box>

        {/* Shiftbound Checkbox */}
        <FormControlLabel
          control={<Checkbox size="small" />}
          label={<Typography sx={{ fontSize: '14px' }}>Consider Above Setting As Shiftbound</Typography>}
        />

        <div className={styles.orDivider}>OR</div>

        {/* Irrespective batch hours */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <FormControlLabel
            control={<Checkbox size="small" />}
            label={<Typography sx={{ fontSize: '14px' }}>Daily Worked For Minimum</Typography>}
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
          <Typography sx={{ fontSize: '14px', color: '#475569' }}>irrespective batch hours</Typography>
        </Box>

        <div className={styles.orDivider}>OR</div>

        {/* Consider all */}
        <FormControlLabel
          control={<Checkbox size="small" />}
          label={<Typography sx={{ fontSize: '14px' }}>Consider All Daily Worked Hours As OT</Typography>}
        />
      </Box>
    </div>
  );
};
