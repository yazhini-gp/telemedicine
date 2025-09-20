/**
 * Status Banner Component
 * Technology: React Hooks, Tailwind CSS, Lucide Icons
 * 
 * Shows offline/online status and sync information
 */

import React from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

const StatusBanner = () => {
  const { isOnline, syncStatus, manualSync } = useNetworkStatus();

  // Don't show banner if online and no sync activity
  if (isOnline && !syncStatus.inProgress && !syncStatus.error && !syncStatus.lastSyncTime) {
    return null;
  }

  const getBannerContent = () => {
    if (!isOnline) {
      return {
        icon: <WifiOff className="w-5 h-5" />,
        message: "📴 You are offline. Records may be outdated.",
        bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
        borderColor: "border-yellow-200 dark:border-yellow-800",
        textColor: "text-yellow-800 dark:text-yellow-200",
        iconColor: "text-yellow-600 dark:text-yellow-400"
      };
    }

    if (syncStatus.inProgress) {
      return {
        icon: <RefreshCw className="w-5 h-5 animate-spin" />,
        message: "🔄 Syncing records...",
        bgColor: "bg-blue-50 dark:bg-blue-900/20",
        borderColor: "border-blue-200 dark:border-blue-800",
        textColor: "text-blue-800 dark:text-blue-200",
        iconColor: "text-blue-600 dark:text-blue-400"
      };
    }

    if (syncStatus.error) {
      return {
        icon: <AlertCircle className="w-5 h-5" />,
        message: `❌ Sync failed: ${syncStatus.error}`,
        bgColor: "bg-red-50 dark:bg-red-900/20",
        borderColor: "border-red-200 dark:border-red-800",
        textColor: "text-red-800 dark:text-red-200",
        iconColor: "text-red-600 dark:text-red-400",
        showRetry: true
      };
    }

    if (syncStatus.lastSyncTime) {
      const lastSync = new Date(syncStatus.lastSyncTime);
      const timeAgo = getTimeAgo(lastSync);
      
      return {
        icon: <CheckCircle className="w-5 h-5" />,
        message: `✅ Online – Records synced ${timeAgo}`,
        bgColor: "bg-green-50 dark:bg-green-900/20",
        borderColor: "border-green-200 dark:border-green-800",
        textColor: "text-green-800 dark:text-green-200",
        iconColor: "text-green-600 dark:text-green-400",
        showRefresh: true
      };
    }

    return null;
  };

  const bannerContent = getBannerContent();
  if (!bannerContent) return null;

  const handleRetry = () => {
    manualSync();
  };

  const handleRefresh = () => {
    manualSync();
  };

  return (
    <div className={`${bannerContent.bgColor} ${bannerContent.borderColor} border-b px-4 py-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={bannerContent.iconColor}>
            {bannerContent.icon}
          </div>
          <p className={`text-sm font-medium ${bannerContent.textColor}`}>
            {bannerContent.message}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {bannerContent.showRetry && (
            <button
              onClick={handleRetry}
              className={`text-sm font-medium ${bannerContent.textColor} hover:underline`}
            >
              Retry
            </button>
          )}
          
          {bannerContent.showRefresh && (
            <button
              onClick={handleRefresh}
              className={`text-sm font-medium ${bannerContent.textColor} hover:underline flex items-center space-x-1`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to get time ago string
const getTimeAgo = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
};

export default StatusBanner;
