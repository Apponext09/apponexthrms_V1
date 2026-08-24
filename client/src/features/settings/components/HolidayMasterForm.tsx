import React from 'react';
import { HolidayCalendarsPage } from '../pages/HolidayCalendarsPage';

interface HolidayMasterFormProps {
  onCancel?: () => void;
  onSave?: (data: any) => void;
}

export function HolidayMasterForm({ onCancel }: HolidayMasterFormProps) {
  return <HolidayCalendarsPage onBackToMasters={onCancel} />;
}
