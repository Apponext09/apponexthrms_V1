import React from 'react';
import { Navigate } from 'react-router-dom';

export const MyAttendance: React.FC = () => {
  return <Navigate to="/employee/dashboard" replace />;
};

export default MyAttendance;
