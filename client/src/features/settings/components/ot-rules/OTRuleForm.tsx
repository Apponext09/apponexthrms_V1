import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  TextField, 
  RadioGroup, 
  Radio, 
  FormControlLabel,
  Select,
  MenuItem,
  Switch,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { Reorder } from 'framer-motion';

import styles from './OTRule.module.scss';
import { AccordionSection } from './AccordionSection';
import { EligibilityPanel } from './EligibilityPanel';

const schema = z.object({
  ruleName: z.string().min(1, { message: 'OT Rule Name is required' }),
  titleChange: z.string().optional(),
  period: z.enum(['Daily', 'Weekly']),
  shiftType: z.enum(['Time Bound', 'Flexible']),
  dailyMaxOTLimit: z.any().optional(),
  dailyMaxOTLimitUnit: z.enum(['Minutes', 'Hours', 'Days']).optional(),
  weeklyMaxOTLimit: z.any().optional(),
  weeklyMaxOTLimitUnit: z.enum(['Minutes', 'Hours', 'Days']).optional(),
  autoOTApprove: z.boolean(),
  minTime: z.string().optional(),
  maxTime: z.string().optional(),
  otFormula: z.boolean(),
  otCalculation: z.string().optional(),
  employeeTiming: z.string(),
  isActive: z.boolean(),
}).refine(data => {
  if (data.otFormula && (!data.otCalculation || data.otCalculation.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: 'OT Calculation is required when OT Formula is active',
  path: ['otCalculation']
});

type FormData = z.infer<typeof schema>;

const DUMMY_DATA = {
  companyLocation: ['Trial Company (Airoli)', 'Trial Company (Mumbai)', 'Trial Company (Pune)'],
  departments: ['Accounts', 'Admin', 'HR', 'Sales', 'Marketing', 'Finance', 'IT', 'Production', 'Purchase', 'Operations'],
  grades: ['CEO', 'Manager', 'Supervisor', 'Staff', 'Executive', 'Intern'],
  employeeTypes: ['Contract', 'Full Time', 'Part Time', 'Regular', 'Consultant', 'Probation'],
  shifts: ['Day Shift', 'Evening Shift', 'Night Shift', 'General Shift', 'Rotational Shift'],
  employeeStatus: ['Confirmed', 'Probation', 'Active', 'Notice Period', 'Resigned', 'Absconding', 'Terminated', 'Inactive']
};

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

export const OTRuleForm: React.FC = () => {
  const { control, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      ruleName: '',
      titleChange: '',
      period: 'Daily',
      shiftType: 'Time Bound',
      dailyMaxOTLimit: '',
      dailyMaxOTLimitUnit: 'Hours',
      weeklyMaxOTLimit: '',
      weeklyMaxOTLimitUnit: 'Hours',
      autoOTApprove: true,
      minTime: '00:00',
      maxTime: '',
      otFormula: false,
      otCalculation: '',
      employeeTiming: 'No Round',
      isActive: true,
    }
  });

  const autoOTApprove = watch('autoOTApprove');
  const otFormula = watch('otFormula');
  const period = watch('period');
  const [priorityList, setPriorityList] = useState<string[]>(['Holidays', 'Normal Days', 'Weekends']);

  const onSubmit = (data: FormData) => {
    console.log('Form Data:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.mainContent}>
      {/* Audit Log Button */}
      <div className={styles.auditLogContainer}>
        <Button 
          variant="outlined" 
          startIcon={<HistoryIcon />}
          size="small"
          sx={{ borderColor: '#cbd5e1', color: '#475569', textTransform: 'none', borderRadius: '8px' }}
        >
          Audit Log
        </Button>
      </div>

      {/* Main Module 1: OT Rule */}
      <div className={styles.ruleCard}>
        <div className={styles.cardHeader}>
          <Box sx={{ p: 1, bgcolor: '#1e293b', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SettingsIcon sx={{ color: '#ffffff', fontSize: '18px' }} />
          </Box>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>OT Rule</h2>
        </div>

        <div className={styles.cardContent} style={{ padding: '32px' }}>
          
          {/* OT Rule Name */}
          <div className={styles.formRow}>
            <div className={styles.rowLabel}>
              OT Rule Name<span className={styles.required}>*</span>
            </div>
            <div className={styles.rowControl}>
              <Controller
                name="ruleName"
                control={control}
                render={({ field }) => (
                  <TextField 
                    {...field}
                    size="small" 
                    className={styles.textField500}
                    error={!!errors.ruleName}
                    helperText={errors.ruleName?.message}
                    sx={{ '& .MuiInputBase-input': { fontSize: '14px', p: '8px 12px' } }}
                  />
                )}
              />
            </div>
          </div>

          {/* Title (In Case Of Change) */}
          <div className={styles.formRow}>
            <div className={styles.rowLabel}>
              Title(In Case Of Change)
            </div>
            <div className={styles.rowControl}>
              <Controller
                name="titleChange"
                control={control}
                render={({ field }) => (
                  <TextField 
                    {...field}
                    size="small" 
                    className={styles.textField500}
                    sx={{ '& .MuiInputBase-input': { fontSize: '14px', p: '8px 12px' } }}
                  />
                )}
              />
            </div>
          </div>

          {/* Period & Shift Type Row */}
          <div className={styles.formRow}>
            <div className={styles.radioColumn} style={{ flex: 1 }}>
              <div className={styles.radioLabel}>Period</div>
              <Controller
                name="period"
                control={control}
                render={({ field }) => (
                  <RadioGroup {...field} className={styles.radioOptions}>
                    <FormControlLabel value="Daily" control={<Radio size="small" />} label={<Typography sx={{ fontSize: '14px', fontWeight: '500' }}>Daily</Typography>} sx={{ m: 0, gap: '8px' }} />
                    <FormControlLabel value="Weekly" control={<Radio size="small" />} label={<Typography sx={{ fontSize: '14px', fontWeight: '500' }}>Weekly</Typography>} sx={{ m: 0, gap: '8px' }} />
                  </RadioGroup>
                )}
              />
            </div>

            <div className={styles.radioColumn} style={{ flex: 1 }}>
              <div className={styles.radioLabel}>Shift Type</div>
              <Controller
                name="shiftType"
                control={control}
                render={({ field }) => (
                  <RadioGroup {...field} className={styles.radioOptions}>
                    <FormControlLabel value="Time Bound" control={<Radio size="small" />} label={<Typography sx={{ fontSize: '14px', fontWeight: '500' }}>Time Bound</Typography>} sx={{ m: 0, gap: '8px' }} />
                    <FormControlLabel value="Flexible" control={<Radio size="small" />} label={<Typography sx={{ fontSize: '14px', fontWeight: '500' }}>Flexible</Typography>} sx={{ m: 0, gap: '8px' }} />
                  </RadioGroup>
                )}
              />
            </div>
          </div>

          {/* Conditionally show Daily or Weekly Max OT Limit */}
          {period === 'Daily' ? (
            <div className={styles.formRow}>
              <div className={styles.rowLabel}>Daily Max OT Limit</div>
              <div className={styles.rowControl} style={{ gap: '16px' }}>
                <Controller
                  name="dailyMaxOTLimit"
                  control={control}
                  render={({ field }) => (
                    <TextField 
                      {...field}
                      type="number"
                      size="small" 
                      sx={{ width: '150px', '& .MuiInputBase-input': { fontSize: '14px', p: '8px 12px' } }}
                      onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  )}
                />
                <Controller
                  name="dailyMaxOTLimitUnit"
                  control={control}
                  render={({ field }) => (
                    <Select {...field} size="small" sx={{ width: '150px', fontSize: '14px', '& .MuiSelect-select': { p: '8px 12px' } }}>
                      <MenuItem value="Minutes">Mins</MenuItem>
                      <MenuItem value="Hours">Hrs</MenuItem>
                      <MenuItem value="Days">Days</MenuItem>
                    </Select>
                  )}
                />
              </div>
            </div>
          ) : (
            <div className={styles.formRow}>
              <div className={styles.rowLabel}>Weekly Max OT Limit</div>
              <div className={styles.rowControl} style={{ gap: '16px' }}>
                <Controller
                  name="weeklyMaxOTLimit"
                  control={control}
                  render={({ field }) => (
                    <TextField 
                      {...field}
                      type="number"
                      size="small" 
                      sx={{ width: '150px', '& .MuiInputBase-input': { fontSize: '14px', p: '8px 12px' } }}
                      onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  )}
                />
                <Controller
                  name="weeklyMaxOTLimitUnit"
                  control={control}
                  render={({ field }) => (
                    <Select {...field} size="small" sx={{ width: '150px', fontSize: '14px', '& .MuiSelect-select': { p: '8px 12px' } }}>
                      <MenuItem value="Minutes">Mins</MenuItem>
                      <MenuItem value="Hours">Hrs</MenuItem>
                      <MenuItem value="Days">Days</MenuItem>
                    </Select>
                  )}
                />
              </div>
            </div>
          )}

          {/* Max Limit Priority */}
          <div style={{ marginBottom: '32px' }}>
            <div className={styles.priorityLabel}>Max Limit Priority (Drag up and down to adjust priority)</div>
            <Reorder.Group 
              axis="y"
              values={priorityList} 
              onReorder={setPriorityList}
              className={styles.sortableContainer} 
              style={{ width: '350px', listStyle: 'none', padding: 0, margin: 0 }}
            >
              {priorityList.map((item, index) => (
                <Reorder.Item 
                  key={item} 
                  value={item} 
                  className={styles.sortableItem}
                  style={{ 
                    borderBottom: index === priorityList.length - 1 ? 'none' : '1px solid #e2e8f0', 
                    borderRadius: index === 0 ? '4px 4px 0 0' : index === priorityList.length - 1 ? '0 0 4px 4px' : 0,
                    cursor: 'grab'
                  }}
                >
                  {item}
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>

          {/* Auto OT Approve Section */}
          <div className={styles.formRow} style={{ gap: '40px', flexWrap: 'wrap' }}>
            <div>
              <Typography sx={{ fontSize: '15px', fontWeight: '700', mb: 1, color: '#1e293b' }}>Auto OT Approve</Typography>
              <Controller
                name="autoOTApprove"
                control={control}
                render={({ field }) => (
                  <CustomToggle 
                    value={field.value} 
                    onChange={field.onChange} 
                    activeText="ON" 
                    inactiveText="OFF" 
                  />
                )}
              />
            </div>

            {autoOTApprove && (
              <>
                <div>
                  <Typography sx={{ fontSize: '15px', fontWeight: '700', mb: 1, display: 'block', color: '#1e293b' }}>Min</Typography>
                  <Controller
                    name="minTime"
                    control={control}
                    render={({ field }) => (
                      <TextField 
                        {...field} 
                        size="small" 
                        sx={{ width: '220px', '& .MuiInputBase-input': { fontSize: '14px', p: '8px 12px' } }} 
                      />
                    )}
                  />
                </div>
                <div>
                  <Typography sx={{ fontSize: '15px', fontWeight: '700', mb: 1, display: 'block', color: '#1e293b' }}>Max</Typography>
                  <Controller
                    name="maxTime"
                    control={control}
                    render={({ field }) => (
                      <TextField 
                        {...field} 
                        placeholder="HH:MM" 
                        size="small" 
                        sx={{ width: '220px', '& .MuiInputBase-input': { fontSize: '14px', p: '8px 12px' } }} 
                      />
                    )}
                  />
                </div>
              </>
            )}
          </div>

          {/* OT Formula Section */}
          <div style={{ marginBottom: '32px' }}>
            <Typography sx={{ fontSize: '15px', fontWeight: '700', mb: 1, display: 'block', color: '#1e293b' }}>OT Formula</Typography>
            <Controller
              name="otFormula"
              control={control}
              render={({ field }) => (
                <CustomToggle 
                  value={field.value} 
                  onChange={field.onChange} 
                  activeText="Yes" 
                  inactiveText="No" 
                />
              )}
            />
            {otFormula && (
              <Box sx={{ mt: 2, width: '500px' }}>
                <Typography variant="caption" color="#475569" sx={{ display: 'block', mb: 0.5 }}>
                  OT Calculation<span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
                </Typography>
                <Controller
                  name="otCalculation"
                  control={control}
                  render={({ field }) => (
                    <TextField 
                      {...field}
                      multiline 
                      rows={5} 
                      fullWidth 
                      size="small" 
                      error={!!errors.otCalculation}
                      helperText={errors.otCalculation?.message}
                      sx={{ '& .MuiInputBase-input': { fontSize: '14px' } }}
                    />
                  )}
                />
              </Box>
            )}
          </div>

          {/* Employee Timing */}
          <div className={styles.formRow}>
            <div className={styles.rowLabel}>Employee Timing</div>
            <div className={styles.rowControl}>
              <Controller
                name="employeeTiming"
                control={control}
                render={({ field }) => (
                  <Select {...field} size="small" sx={{ width: '220px', fontSize: '14px', '& .MuiSelect-select': { p: '8px 12px' } }}>
                    <MenuItem value="No Round">No Round</MenuItem>
                    <MenuItem value="Round">Round</MenuItem>
                    <MenuItem value="Round Up">Round Up</MenuItem>
                    <MenuItem value="Round Down">Round Down</MenuItem>
                  </Select>
                )}
              />
            </div>
          </div>

          <Divider sx={{ my: 4 }} />

          {/* Sub-modules: OT Rule Accordions */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <AccordionSection title="For Normal Days" />
            <AccordionSection title="For Holidays" />
            <AccordionSection title="For Weekends" />
          </Box>
        </div>
      </div>

      {/* Main Module 2: Eligibility Settings */}
      <div className={styles.ruleCard}>
        <div className={styles.cardHeader}>
          <Box sx={{ p: 1, bgcolor: '#1e293b', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SettingsIcon sx={{ color: '#ffffff', fontSize: '18px' }} />
          </Box>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Eligibility Settings</h2>
        </div>

        <div className={styles.cardContent} style={{ padding: 0 }}>
          <EligibilityPanel title="Company - Location" items={DUMMY_DATA.companyLocation} defaultExpanded={true} />
          <EligibilityPanel title="Department" items={DUMMY_DATA.departments} />
          <EligibilityPanel title="Grade" items={DUMMY_DATA.grades} />
          <EligibilityPanel title="Employee Type" items={DUMMY_DATA.employeeTypes} />
          <EligibilityPanel title="Shift" items={DUMMY_DATA.shifts} />
          <EligibilityPanel title="Employee Status" items={DUMMY_DATA.employeeStatus} />
        </div>
      </div>

      {/* Footer Actions */}
      <div className={styles.footerActions}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>Active</Typography>
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <Switch {...field} checked={field.value} color="primary" />
            )}
          />
          <Typography sx={{ fontSize: '14px', color: '#1c63d5', fontWeight: '500' }}>{watch('isActive') ? 'Yes' : 'No'}</Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            color="error"
            sx={{ textTransform: 'none', borderRadius: '8px', px: 3 }}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            variant="contained" 
            startIcon={<AddIcon />}
            sx={{ 
              bgcolor: '#16a34a', 
              '&:hover': { bgcolor: '#15803d' },
              textTransform: 'none',
              borderRadius: '8px',
              boxShadow: 'none',
              px: 4
            }}
          >
            Add
          </Button>
        </Box>
      </div>
    </form>
  );
};
