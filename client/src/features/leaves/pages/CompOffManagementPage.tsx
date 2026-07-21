'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCompOffBalance, useRequestCompOff } from '../hooks/useCompOff';

export function CompOffManagementPage() {
  const [selectedCompOffId, setSelectedCompOffId] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  const { balance, totalHours, isLoading, error } = useCompOffBalance();
  const { requestCompOff, isLoading: requestLoading, error: requestError } = useRequestCompOff();

  const availableBalance = balance.filter((b) => b.status === 'available');

  const handleRequestCompOff = async () => {
    if (!selectedCompOffId || !reason.trim()) {
      alert('Please select a comp off and provide a reason');
      return;
    }

    await requestCompOff({ compOffId: selectedCompOffId, reason });
    setSelectedCompOffId(null);
    setReason('');
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Comp Off Management</h1>

      {(error || requestError) && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error || requestError}
        </div>
      )}

      {/* Summary Card */}
      <Card className="p-6 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-indigo-900">{totalHours}</h2>
            <p className="text-indigo-700">Total Available Hours</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-indigo-900">{availableBalance.length}</h3>
            <p className="text-indigo-700">Available Comp Offs</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        {/* List */}
        <div className="col-span-2 space-y-3">
          {isLoading ? (
            <div className="text-center py-10">Loading...</div>
          ) : availableBalance.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No available comp offs</p>
            </Card>
          ) : (
            availableBalance.map((compOff) => {
              const earnedDate = new Date(compOff.compOffEarnedDate);
              const expiryDate = compOff.compOffExpiresAt ? new Date(compOff.compOffExpiresAt) : null;
              const daysUntilExpiry = expiryDate ? Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

              return (
                <Card
                  key={compOff.id}
                  className={`p-4 cursor-pointer hover:shadow-lg transition ${
                    selectedCompOffId === compOff.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedCompOffId(compOff.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold">{compOff.compOffEarnedHours} Hours</h3>
                      <p className="text-gray-600 text-sm">
                        Earned on {earnedDate.toLocaleDateString()}
                      </p>
                      {compOff.reason && (
                        <p className="text-gray-600 text-sm mt-1">
                          Reason: {compOff.reason}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                        Available
                      </span>
                      {daysUntilExpiry !== null && (
                        <p className={`text-sm mt-2 ${daysUntilExpiry < 30 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                          Expires in {daysUntilExpiry} days
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}

          {/* Used Section */}
          {balance.filter((b) => b.status === 'used').length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-4">Used Comp Offs</h2>
              <div className="space-y-2">
                {balance.filter((b) => b.status === 'used').map((compOff) => (
                  <Card key={compOff.id} className="p-4 opacity-60">
                    <div className="flex justify-between items-center">
                      <span>{compOff.compOffEarnedHours} Hours</span>
                      <span className="text-gray-500 text-sm">Used on {new Date(compOff.compOffEarnedDate).toLocaleDateString()}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Request Panel */}
        {selectedCompOffId ? (
          <Card className="col-span-1 p-6 sticky top-6">
            <h2 className="text-lg font-semibold mb-4">Request Comp Off</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Request Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Please provide a reason for your comp off request..."
                />
              </div>

              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleRequestCompOff}
                disabled={requestLoading}
              >
                {requestLoading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="col-span-1 p-6">
            <p className="text-gray-500 text-center">Select a comp off to request</p>
          </Card>
        )}
      </div>
    </div>
  );
}

