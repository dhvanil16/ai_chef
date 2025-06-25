import React, { createContext, useContext, useState } from 'react';

// Create a context for notifications
const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // Add notification helper function
  const addNotification = (message, type = 'success') => {
    const id = Date.now();
    
    // Determine if the message is about a negative action (delete, unfavorite, etc.)
    const isNegativeAction = message.toLowerCase().includes('deleted') || 
                             message.toLowerCase().includes('removed') ||
                             message.toLowerCase().includes('failed');
    
    // If it's a negative action, use 'error' type unless explicitly specified
    const finalType = type === 'success' && isNegativeAction ? 'error' : type;
    
    setNotifications(prev => [...prev, { id, message, type: finalType }]);
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  };
  
  // Remove notification helper
  const removeNotification = (id) => {
    setNotifications(prev => prev.map(notif => 
      notif.id === id ? { ...notif, isExiting: true } : notif
    ));
    
    // After exit animation completes, remove from state
    setTimeout(() => {
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    }, 300);
  };

  // Create value object to be provided to consumers
  const value = {
    notifications,
    addNotification,
    removeNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Notification component */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-md">
        {notifications.map(notification => (
          <div 
            key={notification.id}
            className={`rounded-lg shadow-xl px-4 py-3 transform transition-all duration-300 ease-in-out 
              ${notification.isExiting ? 'animate-slideOut opacity-0' : 'animate-slideIn'} 
              ${notification.type === 'error' 
                ? 'bg-red-500 text-white' 
                : notification.type === 'info'
                  ? 'bg-blue-500 text-white'
                  : 'bg-green-500 text-white'
              } flex items-center justify-between`}
          >
            <div className="flex items-center">
              <div className="mr-3 flex-shrink-0">
                {notification.type === 'error' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : notification.type === 'info' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <button 
              onClick={() => removeNotification(notification.id)}
              className="ml-4 text-white hover:text-gray-200 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

// Custom hook to use notification context
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}; 