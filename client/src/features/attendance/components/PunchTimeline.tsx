import React from 'react';

interface PunchTimelineProps {
  sessions: any[];
}

export const PunchTimeline: React.FC<PunchTimelineProps> = ({ sessions }) => {
  const getSessionIcon = (type: string) => {
    switch (type) {
      case 'check_in':
        return '→';
      case 'check_out':
        return '←';
      case 'break_in':
        return '⏸';
      case 'break_out':
        return '▶';
      default:
        return '•';
    }
  };

  const getSessionColor = (type: string) => {
    switch (type) {
      case 'check_in':
        return 'text-green-600';
      case 'check_out':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Punch Timeline</h3>

      {sessions.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No punch records today</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session, index) => (
            <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded">
              <div className={`text-2xl font-bold ${getSessionColor(session.session_type)}`}>
                {getSessionIcon(session.session_type)}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 capitalize">
                  {session.session_type.replace('_', ' ')}
                </p>
                <p className="text-sm text-gray-600">
                  {new Date(session.session_timestamp).toLocaleTimeString()}
                </p>
              </div>
              {session.geofence_matched !== undefined && (
                <div className={`text-xs px-2 py-1 rounded ${
                  session.geofence_matched
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {session.geofence_matched ? 'In Office' : 'Outside'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
