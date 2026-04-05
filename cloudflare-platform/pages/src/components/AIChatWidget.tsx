import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageSquare, FiX, FiSend, FiLoader } from 'react-icons/fi';
import { useThemeClasses } from '../hooks/useThemeClasses';

const AIChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm your energy trading AI assistant. How can I help you today?", sender: 'ai', timestamp: new Date() }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const tc = useThemeClasses();

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    setMessages(prev => [...prev, { id: prev.length + 1, text: inputValue, sender: 'user', timestamp: new Date() }]);
    setInputValue('');
    setIsLoading(true);
    setTimeout(() => {
      const responses = [
        "Based on current market trends, I recommend increasing your solar portfolio exposure by 10-15%.",
        "I've analyzed your portfolio and identified an opportunity to optimize your carbon credit holdings.",
        "Market volatility is currently low-medium. Good opportunity to execute planned trades.",
      ];
      setMessages(prev => [...prev, { id: prev.length + 1, text: responses[Math.floor(Math.random() * responses.length)], sender: 'ai', timestamp: new Date() }]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-24 right-6 w-96 h-[420px] z-50 rounded-2xl shadow-2xl flex flex-col ${tc.modalBg}`}>
            <div className={`flex items-center justify-between px-4 py-3 border-b ${tc.border}`}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">AI</span>
                </div>
                <span className={`font-semibold text-sm ${tc.textPrimary}`}>Energy Trading AI</span>
              </div>
              <button onClick={() => setIsOpen(false)} className={`p-1.5 rounded-lg ${tc.isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-100'}`}>
                <FiX className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === 'ai' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm ${
                    m.sender === 'ai'
                      ? tc.isDark ? 'bg-white/[0.06] text-slate-200' : 'bg-slate-100 text-slate-800'
                      : 'bg-blue-600 text-white'
                  }`}>{m.text}</div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm flex items-center gap-2 ${tc.isDark ? 'bg-white/[0.06] text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                    <FiLoader className="animate-spin w-3.5 h-3.5" /><span>Analyzing...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className={`p-3 border-t ${tc.border}`}>
              <div className="flex gap-2">
                <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  placeholder="Ask about market trends..."
                  className={`flex-1 px-3.5 py-2 text-sm rounded-xl outline-none ${tc.input}`} />
                <button onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()}
                  className="p-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white disabled:opacity-40 transition-colors">
                  <FiSend className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-600/30 z-40">
        {isOpen ? <FiX className="w-6 h-6 text-white" /> : <FiMessageSquare className="w-6 h-6 text-white" />}
      </motion.button>
    </>
  );
};

export default AIChatWidget;
