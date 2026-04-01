import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageSquare, FiX, FiSend, FiLoader } from 'react-icons/fi';

const AIChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your energy trading AI assistant. How can I help you today?",
      sender: 'ai',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponses = [
        "Based on current market trends, I recommend increasing your solar portfolio exposure by 10-15%. The forecast shows favorable conditions for the next 48 hours.",
        "I've analyzed your portfolio and identified an opportunity to optimize your carbon credit holdings. Consider diversifying into wind energy projects for better risk-adjusted returns.",
        "Your contract negotiations for the upcoming quarter look strong. I suggest including a price adjustment clause to protect against volatility.",
        "Market volatility is currently low-medium. This presents a good opportunity to execute planned trades with reduced risk exposure.",
        "I've detected unusual patterns in regional energy pricing. Recommend monitoring hydro generation in the Pacific Northwest for arbitrage opportunities."
      ];

      const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];

      const aiMessage = {
        id: messages.length + 2,
        text: randomResponse,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 right-6 w-96 h-96 glass z-50 rounded-2xl border border-slate-700 shadow-2xl"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">AI</span>
                  </div>
                  <span className="font-medium">Energy Trading AI</span>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-700 transition-colors"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender === 'ai' ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg ${
                        message.sender === 'ai'
                          ? 'bg-slate-700/50 text-slate-100'
                          : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-700/50 text-slate-100 px-3 py-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <FiLoader className="animate-spin w-4 h-4" />
                        <span className="text-sm">Analyzing...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-slate-700">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about market trends..."
                    className="flex-1 px-3 py-2 text-sm bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputValue.trim()}
                    className="p-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    <FiSend className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg z-40 pulse"
      >
        {isOpen ? (
          <FiX className="w-6 h-6 text-white" />
        ) : (
          <FiMessageSquare className="w-6 h-6 text-white" />
        )}
      </motion.button>
    </>
  );
};

export default AIChatWidget;