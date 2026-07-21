import React from 'react';
import { useNavigate } from 'react-router-dom';

// Redirect to the existing Onboarding Dashboard
export function OnboardingPage() {
  const navigate = useNavigate();

  React.useEffect(() => {
    navigate('/employees/onboarding', { replace: true });
  }, [navigate]);

  return null;
}
