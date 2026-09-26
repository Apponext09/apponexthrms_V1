import React, { useEffect, useState } from 'react';
import { policiesApi } from '../api/policiesApi';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export const AdminPolicyQueriesPage: React.FC = () => {
  const [queries, setQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [replyText, setReplyText] = useState<{ [key: number]: string }>({});
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  const fetchQueries = async () => {
    setLoading(true);
    try {
      const data = await policiesApi.getAdminQueries(statusFilter === 'all' ? undefined : statusFilter);
      setQueries(data);
    } catch (error) {
      console.error('Failed to load admin queries', error);
      toast.error('Failed to load queries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueries();
  }, [statusFilter]);

  const handleReplySubmit = async (queryId: number) => {
    const text = replyText[queryId];
    if (!text || !text.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }

    setReplyingTo(queryId);
    try {
      await policiesApi.replyToQuery(queryId, {
        reply: text.trim(),
        status: 'REPLIED'
      });
      toast.success('Reply sent successfully');
      setReplyText(prev => ({ ...prev, [queryId]: '' }));
      fetchQueries();
    } catch (error) {
      toast.error('Failed to send reply');
    } finally {
      setReplyingTo(null);
    }
  };

  const markClosed = async (queryId: number) => {
    if (!window.confirm('Mark this query as CLOSED?')) return;
    try {
      await policiesApi.replyToQuery(queryId, {
        reply: queries.find(q => q.id === queryId)?.reply || '',
        status: 'CLOSED'
      });
      toast.success('Query closed');
      fetchQueries();
    } catch (error) {
      toast.error('Failed to close query');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-5 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" /> Policy Queries Management
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Review and respond to questions asked by employees regarding company policies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={fetchQueries} className="h-8 text-xs font-bold gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto">
        {['all', 'OPEN', 'REPLIED', 'CLOSED'].map((st) => (
          <Button
            key={st}
            type="button"
            variant={statusFilter === st ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(st)}
            className="h-8 rounded-lg text-xs font-bold capitalize"
          >
            {st}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-xl">
          <div className="h-9 w-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : queries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-card border border-border rounded-xl space-y-3 text-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground" />
          <h3 className="text-sm font-bold text-foreground">No Queries Found</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {queries.map((q) => (
            <Card key={q.id} className="border-border/80 shadow-2xs">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <div>
                    <div className="font-bold text-sm">Policy: {q.policyTitle || q.policyDocumentId} (v{q.policyVersion || '1.0'})</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Submitted by: <span className="font-semibold text-foreground">{q.userName || q.userEmail || `User ID ${q.userId}`}</span> 
                      {q.roleName ? ` • Role: ${q.roleName}` : ''}
                      <span className="ml-1">• {new Date(q.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <Badge variant={q.status === 'OPEN' ? 'destructive' : q.status === 'REPLIED' ? 'secondary' : 'outline'}>
                    {q.status}
                  </Badge>
                </div>

                <div className="bg-muted/30 p-3 rounded-md text-sm border border-border/40 shadow-inner">
                  <span className="font-bold text-muted-foreground mr-2">Q:</span>
                  {q.question}
                </div>

                {q.status === 'REPLIED' || q.status === 'CLOSED' ? (
                  <div className="bg-primary/5 p-3 rounded-md text-sm border border-primary/20">
                    <span className="font-bold text-primary mr-2">A:</span>
                    {q.reply}
                    <div className="text-[10px] text-muted-foreground mt-2 text-right">
                      Replied by Admin ID: {q.repliedByUserId} on {new Date(q.repliedAt).toLocaleString()}
                    </div>
                  </div>
                ) : null}

                {q.status !== 'CLOSED' && (
                  <div className="mt-4 space-y-2">
                    <Textarea 
                      placeholder="Type your reply to the employee here..."
                      className="min-h-[80px] resize-y text-sm"
                      value={replyText[q.id] || ''}
                      onChange={(e) => setReplyText(prev => ({...prev, [q.id]: e.target.value}))}
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => markClosed(q.id)} className="h-8">
                        Mark as Closed
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleReplySubmit(q.id)} 
                        disabled={replyingTo === q.id || !(replyText[q.id]?.trim())}
                        className="h-8 gap-1.5"
                      >
                        <Send className="w-3 h-3" />
                        {replyingTo === q.id ? 'Sending...' : 'Send Reply'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
