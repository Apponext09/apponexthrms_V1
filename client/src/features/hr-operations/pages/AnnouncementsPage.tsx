import React from 'react';
import { useNavigate } from 'react-router-dom';

// Redirect to the existing Announcement Management Page
export function AnnouncementsPage() {
  const navigate = useNavigate();

  React.useEffect(() => {
    navigate('/notifications/announcements', { replace: true });
  }, [navigate]);

  return null;
}
