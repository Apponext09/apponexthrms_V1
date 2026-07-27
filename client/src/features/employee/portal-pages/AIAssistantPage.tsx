import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api';
import { Sparkles, Send, Bot, User, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface ChatMessage {
  id: number;
  sender: 'ai' | 'user';
  text: string;
  prefill?: {
    startDate: string;
    endDate: string;
    leaveTypeCode: string;
    reason: string;
    submitted?: boolean;
  };
}

interface LeaveType {
  id: number;
  leave_name: string;
  leave_code: string;
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, sender: 'ai', text: 'Hello! I am your AI HR Assistant. You can ask me any queries regarding company leave policies, and I can also parse your sentences to apply for leave! Try saying: "Apply sick leave tomorrow".' },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch leave types on load for mapping codes to IDs
    apiClient.get('/leaves/types')
      .then(res => {
        if (res.data?.data) {
          setLeaveTypes(res.data.data);
        }
      })
      .catch(err => console.error('Failed to load leave types', err));
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessageText = input.trim();
    const userMsgId = Date.now();
    const userMsg: ChatMessage = { id: userMsgId, sender: 'user', text: userMessageText };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // 1. Build chat history in the format the server expects
      const history = messages
        .filter(m => m.id !== 1) // skip welcome message
        .map(m => ({ sender: m.sender, text: m.text }));

      // 2. Call AI Chat API
      const chatRes = await apiClient.post('/leaves/ai/chat', {
        message: userMessageText,
        history
      });

      const replyText = chatRes.data?.reply || "I am processing your query...";
      let prefillData = undefined;

      // 3. If message looks like a leave request, try parsing it
      const lower = userMessageText.toLowerCase();
      if (lower.includes('apply') || lower.includes('leave') || lower.includes('छुट्टी') || lower.includes('tomorrow') || lower.includes('sick')) {
        const parseRes = await apiClient.post('/leaves/ai/parse', { message: userMessageText }).catch(() => null);
        if (parseRes?.data?.success && parseRes.data.data) {
          prefillData = parseRes.data.data;
        }
      }

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: replyText,
        prefill: prefillData
      }]);
    } catch (err: any) {
      toast.error('Failed to get response from AI Assistant');
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: "I experienced an error connecting to the AI helper. Please try again."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSubmit = async (msgId: number, prefill: any) => {
    try {
      // Find the leave type ID from the code
      const matchingType = leaveTypes.find(t => t.leave_code.toUpperCase() === prefill.leaveTypeCode.toUpperCase());
      if (!matchingType) {
        toast.error(`Leave code '${prefill.leaveTypeCode}' is not configured in this organization.`);
        return;
      }

      // Submit the leave application
      const res = await apiClient.post('/leaves/applications', {
        leaveTypeId: matchingType.id,
        startDate: prefill.startDate,
        endDate: prefill.endDate,
        reason: prefill.reason || 'Requested via AI Chat Assistant',
      });

      if (res.data?.success || res.status === 201) {
        toast.success('Leave application submitted successfully!');
        
        // Update message prefill card state to "submitted"
        setMessages(prev => prev.map(m => {
          if (m.id === msgId && m.prefill) {
            return {
              ...m,
              prefill: { ...m.prefill, submitted: true }
            };
          }
          return m;
        }));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit leave request');
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto flex flex-col h-[calc(100vh-140px)]">
      <div className="pb-3 border-b flex-shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <Bot className="w-5 h-5 text-violet-600" /> AI HR Assistant
          </h2>
          <p className="text-xs text-muted-foreground">Ask policy queries, check rules, or request leaves directly in natural language.</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-600 border border-violet-500/20 text-[10px] font-extrabold">
          <Sparkles className="w-3.5 h-3.5 text-violet-500 animate-pulse" /> Live Gemini Agent
        </div>
      </div>

      {/* Chat Messages Card */}
      <Card className="flex-1 border rounded-3xl shadow-md flex flex-col overflow-hidden min-h-0 bg-card/50 backdrop-blur-sm">
        <CardContent className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
          {messages.map((m) => (
            <div 
              key={m.id} 
              className={`flex items-start gap-3 max-w-[85%] ${
                m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-sm ${
                m.sender === 'user' ? 'bg-violet-600 border-violet-700 text-white' : 'bg-card text-foreground'
              }`}>
                {m.sender === 'user' ? <User className="w-4.5 h-4.5" /> : <Bot className="w-4.5 h-4.5 text-violet-600" />}
              </div>
              <div className="space-y-2">
                <div className={`p-3.5 rounded-2xl text-xs leading-relaxed border shadow-sm ${
                  m.sender === 'user'
                    ? 'bg-violet-600 border-violet-700 text-white rounded-tr-none'
                    : 'bg-card text-foreground rounded-tl-none'
                }`}>
                  {m.text}
                </div>

                {/* Prefill Application Proposal Card */}
                {m.prefill && (
                  <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/20 shadow-sm max-w-sm space-y-3">
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <span className="text-[10px] font-extrabold uppercase text-violet-600 tracking-wider">Leave Application Prefill</span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-700">
                        {m.prefill.leaveTypeCode}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Start Date:</span>
                        <span className="font-semibold text-foreground">{m.prefill.startDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">End Date:</span>
                        <span className="font-semibold text-foreground">{m.prefill.endDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Reason:</span>
                        <span className="font-semibold text-foreground italic truncate max-w-[150px]">"{m.prefill.reason || 'None'}"</span>
                      </div>
                    </div>

                    {m.prefill.submitted ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 font-extrabold text-[11px] bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 justify-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Request Submitted Successfully!
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleConfirmSubmit(m.id, m.prefill)}
                        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-[11px] h-9 rounded-xl shadow-md gap-1.5"
                      >
                        Confirm & Submit Request <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 border bg-card text-foreground shadow-sm">
                <Bot className="w-4.5 h-4.5 text-violet-600" />
              </div>
              <div className="bg-card border p-3.5 rounded-2xl text-xs rounded-tl-none shadow-sm flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-violet-600 animate-spin" />
                <span>AI HR is reviewing rules and typing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input Bar */}
        <div className="p-3 border-t bg-card flex-shrink-0">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              placeholder="Ask a policy rule or say 'Apply casual leave on Friday'..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="h-10 text-xs rounded-xl focus-visible:ring-violet-500"
            />
            <Button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="bg-violet-600 hover:bg-violet-700 text-white font-bold h-10 px-4 rounded-xl shadow-md disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
