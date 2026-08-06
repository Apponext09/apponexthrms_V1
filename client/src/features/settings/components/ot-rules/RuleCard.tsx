import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

interface RuleCardProps {
  title: string;
  count: number;
  selected?: boolean;
  onClick?: () => void;
}

export const RuleCard: React.FC<RuleCardProps> = ({ title, count, selected = false, onClick }) => {
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        bgcolor: selected ? '#1c63d5' : '#ffffff', // Brand blue for selected
        color: selected ? '#ffffff' : '#0f172a',
        border: '1px solid',
        borderColor: selected ? '#1c63d5' : '#e2e8f0',
        boxShadow: selected ? '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' : 'none',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: selected ? '#154fb0' : '#cbd5e1',
          bgcolor: selected ? '#154fb0' : '#f8fafc',
        }
      }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: '16px !important' }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: selected ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
          p: 1,
          borderRadius: 1
        }}>
          <CalendarMonthIcon sx={{ color: selected ? '#ffffff' : '#64748b' }} />
        </Box>
        <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: '600' }}>
          {title}
        </Typography>
      </CardContent>
    </Card>
  );
};
