import React from 'react';
import { 
  Box, 
  Typography, 
  Select, 
  MenuItem, 
  OutlinedInput, 
  InputAdornment, 
  FormControl 
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { RuleCard } from './RuleCard';
import styles from './OTRule.module.scss';

export const Sidebar: React.FC = () => {
  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarFilters}>
        <FormControl size="small" sx={{ minWidth: 80, flex: 1 }}>
          <Select defaultValue="All" sx={{ fontSize: '14px' }}>
            <MenuItem value="All">All</MenuItem>
            {/* Add more filter options as needed */}
          </Select>
        </FormControl>

        <OutlinedInput
          size="small"
          placeholder="Search"
          sx={{ flex: 2, '& .MuiInputBase-input': { fontSize: '14px', p: '8.5px 14px 8.5px 0' } }}
          startAdornment={
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          }
        />

        <FormControl size="small" sx={{ minWidth: 90, flex: 1 }}>
          <Select defaultValue="Active" sx={{ fontSize: '14px' }}>
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Inactive">Inactive</MenuItem>
          </Select>
        </FormControl>
      </div>

      <div className={styles.sidebarHeader}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
          OT Rule
        </Typography>
        <span className={styles.badge}>1</span>
      </div>

      <div className={styles.sidebarList}>
        <RuleCard title="OT Rule" count={1} selected={true} />
      </div>
    </div>
  );
};
