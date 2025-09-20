import React, { useState, useEffect, useRef } from 'react';
import { networkDetector } from '../utils/networkDetector';

/**
 * Dual Chatbot Component
 * Automatically switches between AI-powered and rule-based chatbots based on network conditions
 */

const DualChatbot = ({ 
  isOpen = false, 
  onClose = () => {}, 
  userProfile = null,
  className = "",
  isFloating = false 
}) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [networkStatus, setNetworkStatus] = useState(null);
  const [symptomData, setSymptomData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Initialize chatbot based on network conditions
  useEffect(() => {
    const initializeChatbot = async () => {
      setIsLoading(true);
      
      // Check network conditions
      const shouldUseAI = await networkDetector.shouldUseAIChatbot();
      setUseAI(shouldUseAI);
      
      // Get network status for display
      const status = networkDetector.getNetworkStatus();
      setNetworkStatus(status);
      
      // Load symptom data for rule-based chatbot
      if (!shouldUseAI) {
        try {
          const response = await fetch('/medical_symptoms_500_plus.csv');
          const csvText = await response.text();
          const lines = csvText.split("\n").slice(1); // skip header
          const dataset = {};
          lines.forEach(line => {
            const [symptom, conditions] = line.split(",");
            if (symptom && conditions) {
              dataset[normalize(symptom)] = {
                name: symptom.trim(),
                conditions: conditions.split(";").map(c => c.trim())
              };
            }
          });
          setSymptomData(dataset);
        } catch (error) {
          console.error('Error loading symptom data:', error);
        }
      }
      
      // Set initial message based on chatbot type
      const initialMessage = shouldUseAI 
        ? "👋 Hi! I'm your AI-powered symptom checker. I can help analyze your symptoms and provide insights. How can I assist you today?"
        : "👋 Hi! I'm your basic symptom checker. Tell me your symptoms and I'll suggest possible causes. How can I help you today?";
      
      setMessages([{
        id: Date.now(),
        text: initialMessage,
        sender: 'bot',
        timestamp: new Date()
      }]);
      
      setIsLoading(false);
    };

    initializeChatbot();
  }, []);

  // Update network status periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      const shouldUseAI = await networkDetector.shouldUseAIChatbot();
      const status = networkDetector.getNetworkStatus();
      
      if (shouldUseAI !== useAI) {
        setUseAI(shouldUseAI);
        // Add a message about the switch
        const switchMessage = shouldUseAI 
          ? "🔄 Connection improved! Switching to AI-powered chatbot for better assistance."
          : "🔄 Connection slowed down. Switching to basic chatbot for reliable service.";
        
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: switchMessage,
          sender: 'bot',
          timestamp: new Date()
        }]);
      }
      
      setNetworkStatus(status);
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [useAI]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const normalize = (text) => {
    return text.toLowerCase().trim().replace(/[^\w\s]/g, '');
  };

  const findClosestSymptom = (userInput) => {
    const normalized = normalize(userInput);
    let bestMatch = null;
    let minDistance = Infinity;

    for (const key in symptomData) {
      const distance = levenshtein(normalized, key);
      if (distance < minDistance && distance <= 2) {
        minDistance = distance;
        bestMatch = key;
      }
    }

    if (bestMatch) {
      return symptomData[bestMatch];
    }
    return null;
  };

  const levenshtein = (a, b) => {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        if (a[i - 1] === b[j - 1]) {
          matrix[j][i] = matrix[j - 1][i - 1];
        } else {
          matrix[j][i] = Math.min(
            matrix[j - 1][i - 1] + 1,
            matrix[j][i - 1] + 1,
            matrix[j - 1][i] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  };

  const handleAIChatbot = async (userMessage) => {
    try {
      // Try to call the AI server (assuming it's running on port 3001)
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [
            ...messages.map(m => ({ role: m.sender === 'bot' ? 'assistant' : 'user', content: m.text })),
            { role: 'user', content: userMessage.text }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('AI service unavailable');
      }

      const data = await response.json();
      
      const botMessage = {
        id: Date.now() + 1,
        text: data.content,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('AI chatbot error:', error);
      // Fallback to rule-based response
      const fallbackMessage = {
        id: Date.now() + 1,
        text: "🤖 AI service is currently unavailable. Switching to basic symptom checker...",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, fallbackMessage]);
      handleRuleBasedChatbot(userMessage);
    }
  };

  const handleRuleBasedChatbot = (userMessage) => {
    // Split into multiple symptoms
    const parts = userMessage.text
      .split(/,|and|with|\+/i)
      .map(p => p.trim())
      .filter(Boolean);

    let allMatches = [];
    let notFound = [];

    parts.forEach(sym => {
      const match = findClosestSymptom(sym);
      if (match) {
        allMatches.push(`*${match.name}* → ${match.conditions.join(", ")}`);
      } else {
        notFound.push(sym);
      }
    });

    let botReply = "";
    if (allMatches.length > 0) {
      botReply += `⚠️ Based on your symptoms:\n${allMatches.join("\n")}\n\n👉 Please remember: This is not a diagnosis. If symptoms are severe or worsening, consult a doctor immediately.`;
    }
    if (notFound.length > 0) {
      botReply += `\n\n❓ I couldn't find data for: ${notFound.join(", ")}. Please consult a doctor for further advice.`;
    }
    if (allMatches.length === 0 && notFound.length === 0) {
      botReply = "❓ I didn't understand that. Please describe your symptoms clearly.";
    }
    
    const botMessage = {
      id: Date.now() + 1,
      text: botReply,
      sender: 'bot',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, botMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !userProfile) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate response delay
    setTimeout(async () => {
      if (useAI) {
        await handleAIChatbot(userMessage);
      } else {
        handleRuleBasedChatbot(userMessage);
      }
      setIsTyping(false);
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className={`${className} flex items-center justify-center p-4`}>
        <div className="loading-dots">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} ${isFloating ? 'fixed bottom-4 right-4 w-80 h-96 z-50' : 'h-full'} bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm">🤖</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {useAI ? 'AI Symptom Checker' : 'Basic Symptom Checker'}
            </h3>
            {networkStatus && (
              <div className="flex items-center space-x-1">
                <span className="text-xs">{networkStatus.icon}</span>
                <span className={`text-xs ${networkStatus.color === 'green' ? 'text-green-600' : networkStatus.color === 'yellow' ? 'text-yellow-600' : networkStatus.color === 'orange' ? 'text-orange-600' : 'text-red-600'}`}>
                  {networkStatus.status}
                </span>
              </div>
            )}
          </div>
        </div>
        {isFloating && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-3 py-2 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              <span className="text-xs opacity-70">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe your symptoms..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            disabled={isTyping}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        {networkStatus && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {networkStatus.message}
          </p>
        )}
      </div>
    </div>
  );
};

export default DualChatbot;
