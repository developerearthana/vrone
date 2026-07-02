"use client";

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot, X, Send, Sparkles, Loader2,
    TrendingUp, Users, Calendar, FileText,
    MessageSquare, Minimize2, Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const QUICK_ACTIONS = [
    { label: "Pipeline health", prompt: "What's my pipeline health?", icon: TrendingUp },
    { label: "Hot leads", prompt: "Show me hot leads", icon: Users },
    { label: "Deals closing soon", prompt: "What deals are closing this week?", icon: Calendar },
    { label: "Draft follow-up", prompt: "Draft a follow-up email", icon: FileText },
];

export function SalesCopilot() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Hi! I'm your Sales Copilot 🚀 I can help you with pipeline insights, lead recommendations, and drafting communications. What would you like to know?",
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen && !isMinimized) {
            inputRef.current?.focus();
        }
    }, [isOpen, isMinimized]);

    const handleSend = async (text?: string) => {
        const messageText = text || input.trim();
        if (!messageText || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: messageText,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        // Simulate AI response (in production, call /api/ai/chat)
        try {
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

            // Generate contextual response based on query
            const response = generateCopilotResponse(messageText.toLowerCase());

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I apologize, I couldn't process that request. Please try again.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Floating Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-2xl shadow-indigo-500/30 flex items-center justify-center hover:scale-110 transition-transform"
                    >
                        <Bot className="w-7 h-7" />
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className={cn(
                            "fixed z-50 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200",
                            isMinimized
                                ? "bottom-6 right-6 w-72 h-14"
                                : "bottom-6 right-6 w-96 h-[500px]"
                        )}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Sales Copilot</h3>
                                    {!isMinimized && (
                                        <p className="text-[10px] text-white/70">AI-powered sales assistant</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setIsMinimized(!isMinimized)}
                                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                    aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
                                >
                                    {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                    aria-label="Close chat"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {!isMinimized && (
                            <>
                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
                                    {messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                "flex",
                                                msg.role === 'user' ? "justify-end" : "justify-start"
                                            )}
                                        >
                                            <div className={cn(
                                                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                                                msg.role === 'user'
                                                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-md"
                                                    : "bg-white border border-gray-200 text-gray-700 rounded-bl-md shadow-sm"
                                            )}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    ))}

                                    {isLoading && (
                                        <div className="flex justify-start">
                                            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                                                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                                            </div>
                                        </div>
                                    )}

                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Quick Actions */}
                                {messages.length <= 2 && (
                                    <div className="px-4 py-2 border-t border-gray-100 bg-white">
                                        <p className="text-[10px] font-medium text-gray-400 uppercase mb-2">Quick Actions</p>
                                        <div className="flex flex-wrap gap-2">
                                            {QUICK_ACTIONS.map((action) => (
                                                <button
                                                    key={action.label}
                                                    onClick={() => handleSend(action.prompt)}
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-[11px] font-medium text-gray-600 transition-colors"
                                                >
                                                    <action.icon className="w-3 h-3" />
                                                    {action.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Input */}
                                <div className="p-3 border-t border-gray-100 bg-white">
                                    <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2">
                                        <MessageSquare className="w-4 h-4 text-gray-400" />
                                        <input
                                            ref={inputRef}
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Ask me anything..."
                                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                                            disabled={isLoading}
                                        />
                                        <button
                                            onClick={() => handleSend()}
                                            disabled={!input.trim() || isLoading}
                                            aria-label="Send message"
                                            className={cn(
                                                "p-1.5 rounded-lg transition-all",
                                                input.trim()
                                                    ? "bg-primary text-primary-foreground hover:brightness-[1.08]"
                                                    : "text-gray-300"
                                            )}
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

/**
 * Simple response generator (replace with actual API call in production)
 */
function generateCopilotResponse(query: string): string {
    if (query.includes('pipeline') || query.includes('health')) {
        return "📊 **Pipeline Health Summary**\n\n• **Active Deals**: 12 deals worth ₹45L\n• **At Risk**: 3 deals (stagnant for 2+ weeks)\n• **Forecast**: ₹18L expected this month\n\nWould you like me to show the at-risk deals?";
    }

    if (query.includes('hot') || query.includes('leads')) {
        return "🔥 **Top Hot Leads**\n\n1. **TechCorp Solutions** - Score: 92\n   → Ready for proposal\n\n2. **Global Innovations** - Score: 87\n   → Schedule demo\n\n3. **Metro Industries** - Score: 79\n   → Follow up needed\n\nWant me to draft a message for any of these?";
    }

    if (query.includes('closing') || query.includes('week')) {
        return "📅 **Deals Closing This Week**\n\n1. **Acme Corp** - ₹8.5L (Negotiation)\n2. **Beta Systems** - ₹3.2L (Proposal sent)\n3. **DataFlow Inc** - ₹12L (Final review)\n\n**Total Expected**: ₹23.7L\n\nShall I draft closing emails for these?";
    }

    if (query.includes('draft') || query.includes('email') || query.includes('follow')) {
        return "✉️ **Draft Follow-up Email**\n\nSubject: Quick follow-up on our discussion\n\n---\n\nHi [Name],\n\nI wanted to follow up on our recent conversation about [topic]. I believe we can help you achieve [specific benefit].\n\nWould you have 15 minutes this week to discuss next steps?\n\nBest regards,\n[Your name]\n\n---\n\nWant me to customize this for a specific lead?";
    }

    return "I can help you with:\n\n• **Pipeline insights** - \"What's my pipeline health?\"\n• **Lead recommendations** - \"Show me hot leads\"\n• **Deal tracking** - \"Deals closing this week\"\n• **Communication** - \"Draft a follow-up email\"\n\nWhat would you like to explore?";
}

