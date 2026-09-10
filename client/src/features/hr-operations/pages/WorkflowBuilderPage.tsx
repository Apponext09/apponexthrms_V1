import React from 'react';
import { useNavigate } from 'react-router-dom';

// Redirect to the existing Workflow Builder Page
export function WorkflowBuilderPage() {
  const navigate = useNavigate();

  React.useEffect(() => {
    navigate('/workflow/builder', { replace: true });
  }, [navigate]);

  return null;
}
