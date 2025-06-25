import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './utils/AuthContext';
import { useNotification } from './utils/NotificationContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import MyCookbook from './components/MyCookbook';
import './App.css';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, login } = useAuth();
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    //  either redirect to a login page or trigger the Auth0 login
    login();
    return null;
  }
  
  return children;
};

const App = () => {
  const { isAuthenticated, user } = useAuth();
  const { addNotification } = useNotification();
  const [prevIsAuthenticated, setPrevIsAuthenticated] = useState(false);
  
  // Track login/logout notifications
  useEffect(() => {
    // If we've just logged in
    if (isAuthenticated && user) {
      // Check if we've already shown the welcome message for this session
      const hasShownWelcome = sessionStorage.getItem('hasShownWelcome') === 'true';
      const currentUserId = user.sub || user.email;
      const lastLoggedInUser = sessionStorage.getItem('lastLoggedInUser');
      
      // Show welcome message only once per session or if a different user logs in
      if (!hasShownWelcome || lastLoggedInUser !== currentUserId) {
        const welcomeMsg = user?.name 
          ? `Welcome, ${user.name}! 👋` 
          : 'Successfully logged in! 👋';
        addNotification(welcomeMsg, 'info');
        
        // Mark that we've shown the welcome message for this session and user
        sessionStorage.setItem('hasShownWelcome', 'true');
        sessionStorage.setItem('lastLoggedInUser', currentUserId);
      }
    } 
    
    // Handle logout notification
    if (prevIsAuthenticated && !isAuthenticated) {
      addNotification('You have been logged out. See you soon! 👋', 'info');
      // Clear session storage on logout
      sessionStorage.removeItem('hasShownWelcome');
      sessionStorage.removeItem('lastLoggedInUser');
    }
    
    // Update previous authentication state
    setPrevIsAuthenticated(isAuthenticated);
  }, [isAuthenticated, user, addNotification]);
  
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
      <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route 
              path="/cookbook" 
              element={
                <ProtectedRoute>
                  <MyCookbook />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
      </main>
            </div>
    </Router>
  );
};

export default App;
