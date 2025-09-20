import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { MessageCircle, AlertTriangle } from 'lucide-react';
import DualChatbot from '../components/DualChatbot';

const Chatbot = () => {
  const { t } = useTranslation();
  const { userProfile } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
            <MessageCircle className="w-8 h-8 text-blue-500" />
            <span>{t('chatbot.title')}</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Get instant symptom analysis and medical guidance
          </p>
        </div>
      </div>

      {/* Network Status Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-blue-700 dark:text-blue-300">
            Smart chatbot automatically adapts to your network connection for the best experience
          </span>
        </div>
      </div>

      {/* Chatbot Interface */}
      <div className="glass-card p-0 overflow-hidden">
        <DualChatbot
          isOpen={true}
          onClose={() => {}}
          userProfile={userProfile}
          className="h-[600px]"
          isFloating={false}
        />
      </div>

      {/* Features Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <span className="text-green-600 dark:text-green-400 text-lg">🚀</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              AI-Powered Mode
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            When you have a good internet connection, enjoy advanced AI-powered symptom analysis with detailed insights and personalized recommendations.
          </p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <span className="text-orange-600 dark:text-orange-400 text-lg">📡</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Offline Mode
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            When connection is slow or offline, use our reliable rule-based chatbot that works with local data for instant symptom matching.
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
              Important Disclaimer
            </h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              This chatbot is for informational purposes only and does not provide medical advice, diagnosis, or treatment. 
              Always consult with a qualified healthcare professional for medical concerns. In case of emergency, call emergency services immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;