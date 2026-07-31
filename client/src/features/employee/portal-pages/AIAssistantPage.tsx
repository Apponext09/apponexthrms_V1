import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api';
import { Sparkles, Send, Bot, User, Loader2, CheckCircle2, ArrowRight, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useAiChatStore, ChatMessage } from '../store/aiChatStore';

const renderMarkdown = (text: string, isUser: boolean) => {
  // Pre-process text to fix common AI formatting quirks
  let cleanText = text
    .replace(/\]\s*\n\s*\(/g, '](') // Fix newlines between ] and ( in links
    .replace(/\*\*(\[[^\]]+\]\([^)]+\))\*\*/g, '$1') // Strip ** around links: **[text](url)** -> [text](url)
    .replace(/\[\*\*(.*?)\*\*\]\((.*?)\)/g, '[$1]($2)'); // Strip ** inside links: [**text**](url) -> [text](url)

  const lines = cleanText.split('\n');
  
  return lines.map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-2" />;
    
    let el = 'p';
    let className = 'my-1 leading-relaxed';
    let content = line;

    if (line.startsWith('### ')) {
      el = 'h3'; className = 'text-sm font-bold mt-3 mb-1 text-violet-700'; content = line.substring(4);
    } else if (line.startsWith('## ')) {
      el = 'h2'; className = 'text-base font-bold mt-3 mb-1 text-violet-700'; content = line.substring(3);
    } else if (line.startsWith('# ')) {
      el = 'h1'; className = 'text-lg font-bold mt-3 mb-1 text-violet-700'; content = line.substring(2);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      el = 'li'; className = 'ml-4 list-disc mt-1'; content = line.substring(2);
    } else if (/^\d+\.\s/.test(line)) {
      el = 'li'; className = 'ml-4 list-decimal mt-1'; content = line.replace(/^\d+\.\s/, '');
    }

    const tokens: React.ReactNode[] = [];
    const inlineRegex = /(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g;
    let lastIndex = 0;
    let match;

    while ((match = inlineRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        tokens.push(content.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        tokens.push(<strong key={match.index} className="font-bold">{token.substring(2, token.length - 2)}</strong>);
      } else if (token.startsWith('*') && token.endsWith('*')) {
        tokens.push(<em key={match.index}>{token.substring(1, token.length - 1)}</em>);
      } else if (token.startsWith('[')) {
        const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
        if (linkMatch) {
          tokens.push(
            <Link 
              to={linkMatch[2]} 
              key={match.index} 
              className={`font-bold underline ${isUser ? 'text-violet-200 hover:text-white' : 'text-violet-600 hover:text-violet-800'}`}
            >
              {linkMatch[1]}
            </Link>
          );
        }
      }
      lastIndex = inlineRegex.lastIndex;
    }
    
    if (lastIndex < content.length) {
      tokens.push(content.substring(lastIndex));
    }

    const Tag = el as keyof JSX.IntrinsicElements;
    return <Tag key={i} className={className}>{tokens.length > 0 ? tokens : content}</Tag>;
  });
};

interface LeaveType {
  id: number;
  leave_name: string;
  leave_code: string;
}

export default function AIAssistantPage() {
  const { messages, addMessage, updateMessage, clearChat } = useAiChatStore();

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
    
    addMessage(userMsg);
    setInput('');
    setLoading(true);

    try {
      // 1. Build chat history in the format the server expects
      const history = messages
        .filter(m => m.id !== 1) // skip welcome message
        .map(m => ({ sender: m.sender, text: m.text }));

      // Add a placeholder message for the AI response
      const aiMessageId = Date.now() + 1;
      addMessage({
        id: aiMessageId,
        sender: 'ai',
        text: '', // Start empty
      });

      // 2. Call AI Chat API using fetch for streaming
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${apiClient.defaults.baseURL}/leaves/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMessageText,
          history
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch AI response');
      }

      if (!response.body) {
        throw new Error('ReadableStream not yet supported in this browser.');
      }

      // 3. Process the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let aiText = '';
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        let eolIndex;
        while ((eolIndex = buffer.indexOf('\n\n')) >= 0) {
          const chunkStr = buffer.slice(0, eolIndex).trim();
          buffer = buffer.slice(eolIndex + 2);
          
          if (chunkStr.startsWith('data: ')) {
            const dataStr = chunkStr.substring(6).trim();
            if (dataStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                aiText += data.text;
                useAiChatStore.getState().updateMessage(aiMessageId, { text: aiText });
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }
            } catch (e) {
              console.error('Error parsing SSE chunk:', e, dataStr);
            }
          }
        }
      }

      let prefillData = undefined;

      // 4. If message looks like a leave request, try parsing it after text stream finishes
      const lower = userMessageText.toLowerCase();
      if (lower.includes('apply') || lower.includes('leave') || lower.includes('छुट्टी') || lower.includes('tomorrow') || lower.includes('sick')) {
        const parseRes = await apiClient.post('/leaves/ai/parse', { message: userMessageText }).catch(() => null);
        if (parseRes?.data?.success && parseRes.data.data) {
          prefillData = parseRes.data.data;
          useAiChatStore.getState().updateMessage(aiMessageId, { prefill: prefillData });
        }
      }

    } catch (err: any) {
      toast.error('Failed to get response from AI Assistant');
      addMessage({
        id: Date.now() + 1,
        sender: 'ai',
        text: "I experienced an error connecting to the AI helper. Please try again."
      });
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
        updateMessage(msgId, {
          prefill: { ...prefill, submitted: true }
        });
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
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs font-semibold rounded-full bg-background/50 hover:bg-muted"
            onClick={() => {
              clearChat();
            }}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> New Chat
          </Button>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-600 border border-violet-500/20 text-[10px] font-extrabold shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-violet-500 animate-pulse" /> Live Gemini Agent
          </div>
        </div>
      </div>

      {/* Chat Messages Card */}
      <Card className="flex-1 border-2 border-violet-500/10 rounded-[2rem] shadow-lg flex flex-col overflow-hidden min-h-0 bg-gradient-to-b from-card to-card/50 backdrop-blur-xl">
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
                  {renderMarkdown(m.text, m.sender === 'user')}
                  {m.sender === 'ai' && !m.text && (
                    <span className="flex items-center gap-1 text-muted-foreground/60">
                      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                    </span>
                  )}
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
