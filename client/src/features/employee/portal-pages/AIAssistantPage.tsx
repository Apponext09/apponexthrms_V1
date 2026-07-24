import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, Bot, User, Brain } from 'lucide-react';

interface ChatMessage {
  id: number;
  sender: 'ai' | 'user';
  text: string;
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, sender: 'ai', text: 'Hello! I am your AI HR Assistant. You can ask me any queries regarding company leave policies, tax structures, travel regulations, or code of conduct.' },
  ]);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: ChatMessage = { id: messages.length + 1, sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Mock AI reply matching common policy questions
    setTimeout(() => {
      let replyText = "I'm searching our company database for policy references... According to the standard guidelines, please consult settings or contact HR.";
      
      const lowerInput = input.toLowerCase();
      if (lowerInput.includes('leave') || lowerInput.includes(' छुट्टी')) {
        replyText = "According to our Annual Leave Policy 2026, employees are allotted 12 Casual Leaves and 10 Sick Leaves per year. You can apply directly through the 'Apply Leave' screen.";
      } else if (lowerInput.includes('salary') || lowerInput.includes('payslip') || lowerInput.includes('तनख्वाह')) {
        replyText = "Payslips are generated on the 1st of every month. You can download them directly from the 'Payroll & Payslips' module.";
      } else if (lowerInput.includes('reimburse') || lowerInput.includes('expense') || lowerInput.includes('bill')) {
        replyText = "Expenses must be submitted under the 'Expense & Reimbursements' page. Make sure to upload actual receipts. Reimbursement cycles run on the 10th of every month.";
      }

      const aiMsg: ChatMessage = { id: messages.length + 2, sender: 'ai', text: replyText };
      setMessages(prev => [...prev, aiMsg]);
    }, 1000);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto flex flex-col h-[calc(100vh-140px)]">
      <div className="pb-3 border-b flex-shrink-0">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Bot className="w-5 h-5 text-violet-600" /> AI HR Assistant
        </h2>
        <p className="text-xs text-muted-foreground">Ask policy queries, check configurations or request support guidelines instantly.</p>
      </div>

      {/* Chat Messages Card */}
      <Card className="flex-1 border rounded-2xl shadow-sm flex flex-col overflow-hidden min-h-0 bg-muted/10">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.map((m) => (
            <div 
              key={m.id} 
              className={`flex items-start gap-3 max-w-[85%] ${
                m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                m.sender === 'user' ? 'bg-violet-600 text-white' : 'bg-card text-foreground border shadow-sm'
              }`}>
                {m.sender === 'user' ? <User className="w-4.5 h-4.5" /> : <Bot className="w-4.5 h-4.5 text-violet-500" />}
              </div>
              <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-violet-600 text-white rounded-tr-none'
                  : 'bg-card border text-foreground rounded-tl-none shadow-sm'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input Bar */}
        <div className="p-3 border-t bg-card flex-shrink-0">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              placeholder="Ask anything about HR policy..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="h-10 text-xs"
            />
            <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white font-bold h-10 px-4 rounded-xl">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
