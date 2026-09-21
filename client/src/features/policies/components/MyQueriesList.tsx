import React, { useEffect, useState } from 'react';
import { policiesApi } from '../api/policiesApi';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const MyQueriesList: React.FC = () => {
  const [queries, setQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueries = async () => {
    setLoading(true);
    try {
      const data = await policiesApi.getMyQueries();
      setQueries(data);
    } catch (error) {
      console.error('Failed to load queries', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueries();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-xl space-y-3">
        <div className="h-9 w-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-xs font-medium text-muted-foreground">Loading your queries...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">My Policy Queries</h3>
        <Button size="sm" variant="outline" onClick={fetchQueries} className="h-8 text-xs font-bold gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {queries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-card border border-border rounded-xl space-y-3 text-center">
          <MessageCircle className="w-8 h-8 text-muted-foreground" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">No Queries Found</h3>
            <p className="text-xs text-muted-foreground max-w-md">
              You have not asked any questions regarding company policies.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {queries.map((q) => (
            <Card key={q.id} className="border-border/80 shadow-2xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold">
                    Policy: {q.policyTitle || `Document #${q.policyDocumentId}`}
                  </div>
                  <Badge
                    variant={q.status === 'OPEN' ? 'default' : q.status === 'REPLIED' ? 'secondary' : 'outline'}
                    className="text-[10px] font-bold"
                  >
                    {q.status}
                  </Badge>
                </div>
                
                <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">
                  <span className="font-semibold text-foreground">You asked:</span> {q.question}
                </div>

                {q.status === 'REPLIED' || q.status === 'CLOSED' ? (
                  <div className="text-xs text-foreground bg-primary/10 p-2 rounded-md border border-primary/20">
                    <span className="font-semibold">HR Reply:</span> {q.reply || 'No reply text provided.'}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic">
                    Waiting for HR to reply...
                  </div>
                )}
                
                <div className="text-[10px] text-muted-foreground text-right">
                  Submitted: {new Date(q.createdAt).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
