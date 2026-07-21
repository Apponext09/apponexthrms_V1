import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const ReturnAsset: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // API call would go here
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Return Asset</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Request asset return</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Asset Return Form</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asset</label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option>Select an asset...</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condition</label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="">Select condition...</option>
                <option value="good">Good</option>
                <option value="minor_damage">Minor Damage</option>
                <option value="major_damage">Major Damage</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Request Return'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
