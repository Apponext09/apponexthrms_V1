import React from 'react';
import { useNavigate } from 'react-router-dom';

// Redirect to the existing RecognitionDashboardPage in performance module
export function RecognitionPage() {
  const navigate = useNavigate();

  React.useEffect(() => {
    navigate('/performance/recognition', { replace: true });
  }, [navigate]);

  return null;
}
