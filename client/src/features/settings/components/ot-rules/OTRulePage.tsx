import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Sidebar } from './Sidebar';
import { OTRuleForm } from './OTRuleForm';
import styles from './OTRule.module.scss';

const theme = createTheme({
  typography: {
    fontFamily: [
      '"Plus Jakarta Sans"',
      '"Inter"',
      'ui-sans-serif',
      'system-ui',
      'sans-serif',
    ].join(','),
    body2: {
      fontSize: '13px',
    },
    body1: {
      fontSize: '13px',
    },
    subtitle2: {
      fontSize: '13px',
      fontWeight: 600,
    },
    subtitle1: {
      fontSize: '14px',
      fontWeight: 600,
    },
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          fontSize: '13px',
          borderRadius: '6px',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '13px',
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          padding: '4px',
        },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        label: {
          fontSize: '13px',
          fontWeight: 500,
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          width: 42,
          height: 26,
          padding: 0,
          display: 'flex',
          '& .MuiSwitch-switchBase': {
            padding: 2,
            '&.Mui-checked': {
              transform: 'translateX(16px)',
            },
          },
          '& .MuiSwitch-thumb': {
            width: 22,
            height: 22,
          },
          '& .MuiSwitch-track': {
            borderRadius: 13,
          },
        },
      },
    },
  },
  palette: {
    primary: {
      main: '#1c63d5', // Cohesive Brand Blue
    },
  },
});

export const OTRulePage: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <div className={styles.pageContainer}>
        <OTRuleForm />
        <Sidebar />
      </div>
    </ThemeProvider>
  );
};

export default OTRulePage;
