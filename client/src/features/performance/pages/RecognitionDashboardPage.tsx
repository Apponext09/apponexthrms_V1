import React from 'react';
import { useRecognitions, useLeaderboard, useBadges } from '../api/useRecognition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, Award, TrendingUp } from 'lucide-react';

export const RecognitionDashboardPage: React.FC = () => {
  const { recognitions, isLoading, error } = useRecognitions();
  const { data: leaderboardData, isLoading: leaderboardLoading } = useLeaderboard('month');
  const { data: badgesData, isLoading: badgesLoading } = useBadges();

  const leaderboard = leaderboardData?.data || [];
  const badges = badgesData?.data || [];

  if (isLoading || leaderboardLoading || badgesLoading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 dark:border-red-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <p>Failed to load recognitions</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Recognition & Rewards
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Recognize and reward employee achievements
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Give Recognition
        </Button>
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <Card className="dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((entry: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900">
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        #{entry.rank}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {entry.employeeName}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {entry.department}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                      {entry.thisMonth} pts
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Total: {entry.totalPoints}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Available Badges
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {badges.map((badge: any) => (
              <Card key={badge.id} className="dark:bg-gray-800 text-center">
                <CardContent className="pt-6">
                  <div className="text-4xl mb-2">{badge.icon || '⭐'}</div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {badge.name}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    {badge.description}
                  </p>
                  <Badge variant="outline">
                    {badge.earnedBy?.length || 0} earned
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Recognitions */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Recent Recognitions
        </h2>
        <div className="space-y-3">
          {recognitions && recognitions.length > 0 ? (
            recognitions.map((recognition: any) => (
              <Card key={recognition.id} className="dark:bg-gray-800">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {recognition.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {recognition.description}
                        </p>
                      </div>
                      <Award className="h-5 w-5 text-yellow-500" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">
                          Awardee
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {recognition.awardeeeName}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">
                          Given By
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {recognition.giverName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex gap-2">
                        <Badge variant="default">{recognition.category}</Badge>
                        <Badge variant="outline">{recognition.points} pts</Badge>
                      </div>
                      {recognition.approvalStatus === 'approved' && (
                        <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                          Approved
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="dark:bg-gray-800">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    No recognitions yet. Be the first to recognize someone!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};


