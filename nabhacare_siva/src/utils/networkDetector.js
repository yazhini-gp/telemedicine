/**
 * Network Detection Utility
 * Detects network conditions to determine which chatbot to use
 */

export class NetworkDetector {
  constructor() {
    this.isOnline = navigator.onLine;
    this.connectionSpeed = 'unknown';
    this.lastCheck = null;
    this.checkInterval = 30000; // Check every 30 seconds
  }

  /**
   * Detect network speed by measuring download time
   */
  async detectSpeed() {
    try {
      const startTime = Date.now();
      
      // Try to fetch a small resource to measure speed
      const response = await fetch('/manifest.json', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Classify speed based on response time
      if (duration < 500) {
        this.connectionSpeed = 'fast';
      } else if (duration < 2000) {
        this.connectionSpeed = 'medium';
      } else {
        this.connectionSpeed = 'slow';
      }
      
      this.lastCheck = Date.now();
      return this.connectionSpeed;
    } catch (error) {
      console.warn('Network speed detection failed:', error);
      this.connectionSpeed = 'slow';
      return 'slow';
    }
  }

  /**
   * Check if we should use AI chatbot (good network) or rule-based (poor network)
   */
  async shouldUseAIChatbot() {
    if (!this.isOnline) {
      return false;
    }

    // If we haven't checked recently, check now
    if (!this.lastCheck || Date.now() - this.lastCheck > this.checkInterval) {
      await this.detectSpeed();
    }

    // Use AI chatbot for fast/medium connections, rule-based for slow/offline
    return this.connectionSpeed === 'fast' || this.connectionSpeed === 'medium';
  }

  /**
   * Get current network status for display
   */
  getNetworkStatus() {
    if (!this.isOnline) {
      return {
        status: 'offline',
        message: 'You are offline. Using basic chatbot.',
        icon: '📡',
        color: 'red'
      };
    }

    switch (this.connectionSpeed) {
      case 'fast':
        return {
          status: 'fast',
          message: 'Good connection. Using AI-powered chatbot.',
          icon: '🚀',
          color: 'green'
        };
      case 'medium':
        return {
          status: 'medium',
          message: 'Moderate connection. Using AI-powered chatbot.',
          icon: '📶',
          color: 'yellow'
        };
      case 'slow':
        return {
          status: 'slow',
          message: 'Slow connection. Using basic chatbot.',
          icon: '🐌',
          color: 'orange'
        };
      default:
        return {
          status: 'unknown',
          message: 'Checking connection...',
          icon: '❓',
          color: 'gray'
        };
    }
  }

  /**
   * Listen for network changes
   */
  startMonitoring() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.detectSpeed();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.connectionSpeed = 'slow';
    });

    // Periodic speed checks
    setInterval(() => {
      if (this.isOnline) {
        this.detectSpeed();
      }
    }, this.checkInterval);
  }
}

// Create a singleton instance
export const networkDetector = new NetworkDetector();
networkDetector.startMonitoring();
