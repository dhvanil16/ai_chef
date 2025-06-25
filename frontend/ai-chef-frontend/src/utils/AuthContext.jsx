
 // Authentication Context for AI Chef Application
 
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { saveRecipe } from './api';

// Create context to hold authentication state and functions
const AuthContext = createContext();

/**
 * Authentication Provider Component 
 * @param {Object} props 
 * @param {React.ReactNode} props.children 
 */
export const AuthProvider = ({ children }) => {
  // Get authentication state and functions from Auth0
  const {
    isAuthenticated, // Whether the user is authenticated
    loginWithRedirect, // Function to redirect to login page
    logout, // Function to log out
    user, // User profile information
    getAccessTokenSilently, // Function to get JWT token
    isLoading // Whether authentication is still loading
  } = useAuth0();
  
  // Track previous authentication state for login/logout notifications
  const [prevIsAuthenticated, setPrevIsAuthenticated] = useState(false);
  
  // Create a dummy notification function to prevent errors before NotificationContext is initialized
  const addNotification = (message, type) => {
    console.log(`Notification (${type}): ${message}`);
  };

  /**
   * Get authentication token for API calls
   * 
   * @returns {Promise<string|null>} JWT token or null if retrieval fails
   */
  const getToken = async () => {
    try {
      return await getAccessTokenSilently();
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  };
  

  useEffect(() => {
    // Only run after initial loading is complete
    if (!isLoading) {
      // If user was not authenticated before but now is, show welcome message
      if (!prevIsAuthenticated && isAuthenticated) {
        const welcomeMsg = user?.name 
          ? `Welcome, ${user.name}! 👋` 
          : 'Successfully logged in! 👋';
        addNotification(welcomeMsg, 'info');
      }
      
      // If user was authenticated before but now isn't, show logout message
      if (prevIsAuthenticated && !isAuthenticated) {
        addNotification('You have been logged out. See you soon! 👋', 'info');
      }
      
      // Update previous authentication state
      setPrevIsAuthenticated(isAuthenticated);
    }
  }, [isAuthenticated, isLoading, user]);

  // Handle pending recipes when authentication state changes
  useEffect(() => {
    
    // Check for and save any pending recipes after login
 
    const checkAndSavePendingRecipe = async () => {
      // Only proceed if the user is authenticated and auth loading is complete
      if (isAuthenticated && !isLoading) {
        try {
          // Check localStorage for pending recipe
          const pendingRecipe = localStorage.getItem('pendingRecipe');
          if (pendingRecipe) {
            console.log('Found pending recipe to save after authentication');
            const recipeData = JSON.parse(pendingRecipe);
            
            // Get authentication token
            const token = await getToken();
            
            if (token) {
              // Save the recipe to the user's account
              await saveRecipe(recipeData, token);
              // Clear the pending recipe from localStorage
              localStorage.removeItem('pendingRecipe');
              console.log('Successfully saved pending recipe');
              
              // Redirect to cookbook with success message
              window.location.href = '/cookbook?saved=true';
            }
          }
        } catch (error) {
          console.error('Error saving pending recipe:', error);
        }
      }
    };

    // Run the check when authentication state changes
    checkAndSavePendingRecipe();
  }, [isAuthenticated, isLoading]); // Re-run when these values change

  // Create the value object to be provided to consumers
  const value = {
    isAuthenticated, // Whether the user is logged in
    user,            // User profile information
    isLoading,       // Whether authentication is still loading
    login: loginWithRedirect, // Function to trigger login
    logout: () => {
      // Call Auth0 logout
      logout({ returnTo: window.location.origin });
    },
    getToken         // Function to get JWT token for API calls
  };

  // Provide the authentication context to child components
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to use authentication context 
 * @returns {Object} Authentication context with user state and functions
 * @throws {Error} If used outside of an AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 