import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  IconButton
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import styles from './OTRule.module.scss';

interface CustomToggleProps {
  value: boolean;
  onChange: (val: boolean) => void;
  activeText: string;
  inactiveText: string;
}

const CustomToggle: React.FC<CustomToggleProps> = ({ value, onChange, activeText, inactiveText }) => {
  return (
    <Box 
      onClick={() => onChange(!value)}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        cursor: 'pointer',
        width: 100,
        height: 34,
        borderRadius: '4px',
        border: '1px solid #cbd5e1',
        overflow: 'hidden',
        userSelect: 'none',
        bgcolor: value ? '#1c63d5' : '#f1f5f9',
        transition: 'all 0.2s',
      }}
    >
      <Box 
        sx={{
          width: '50%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: '700',
          color: value ? '#ffffff' : 'transparent',
          bgcolor: value ? '#1c63d5' : '#ffffff',
          transition: 'all 0.2s',
        }}
      >
        {activeText}
      </Box>
      <Box 
        sx={{
          width: '50%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: '700',
          color: value ? 'transparent' : '#475569',
          bgcolor: value ? '#ffffff' : '#e2e8f0',
          transition: 'all 0.2s',
        }}
      >
        {inactiveText}
      </Box>
    </Box>
  );
};

export const PaySection: React.FC = () => {
  const [isFormulaActive, setIsFormulaActive] = useState(true);

  return (
    <div className={styles.calculationCard}>
      <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '700', color: '#475569' }}>Pay</h4>

      <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        
        {/* Left Column: PAY as per Formula Toggle */}
        <Box sx={{ width: '220px', minWidth: '220px' }}>
          <Typography sx={{ fontSize: '15px', fontWeight: '700', mb: 1, color: '#1e293b' }}>
            PAY as per Formula
          </Typography>
          <CustomToggle 
            value={isFormulaActive}
            onChange={setIsFormulaActive}
            activeText="Yes"
            inactiveText="No"
          />
        </Box>

        {/* Right Column: Conditional Formula Input or Default Pay Per Mins */}
        <Box sx={{ flex: 1, minWidth: '300px' }}>
          {isFormulaActive ? (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                <Typography sx={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                  Pay Amount Formula<span style={{ color: '#ef4444' }}>*</span>
                </Typography>
                <InfoIcon sx={{ fontSize: '16px', color: '#475569' }} />
              </Box>
              <TextField 
                multiline
                rows={4}
                fullWidth
                size="small"
                sx={{ 
                  '& .MuiOutlinedInput-root': { borderRadius: '4px' },
                  '& .MuiInputBase-input': { fontSize: '14px' } 
                }}
              />
              <Typography sx={{ fontSize: '13px', color: '#475569', mt: 1.5, lineHeight: 1.5 }}>
                Amount given by formula considered as final amount.For mathematical operations use OT Hours in minutes.
              </Typography>
            </Box>
          ) : (
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: '700', mb: 1, color: '#1e293b' }}>
                Default Calculation Settings
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: '14px', color: '#334155', fontWeight: '500' }}>
                  OT Amount = Pay Per Mins
                </Typography>
                <TextField 
                  type="number"
                  size="small" 
                  sx={{ width: 80, '& .MuiInputBase-input': { p: '6px 8px', fontSize: '14px' } }} 
                />
                <Typography sx={{ fontSize: '14px', color: '#334155', fontWeight: '500' }}>
                  times
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

      </Box>
    </div>
  );
};
