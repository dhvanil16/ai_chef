import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';

const Navbar = () => {
  const { isAuthenticated, user, login, logout } = useAuth();
  const location = useLocation();
  
  // Check if the current path matches the given path
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold">
              <span className="text-gray-900">AI</span>
              <span className="text-orange-500">Chef</span>
            </span>
          </Link>
          
          {/* Navigation links - Center */}
          <div className="hidden md:flex space-x-8">
            <Link 
              to="/" 
              className={`text-base font-medium transition-colors ${isActive('/') ? 'text-orange-500' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Home
            </Link>
            
            {isAuthenticated && (
              <Link 
                to="/cookbook" 
                className={`text-base font-medium transition-colors ${isActive('/cookbook') ? 'text-orange-500' : 'text-gray-600 hover:text-gray-900'}`}
              >
                My Cookbook
              </Link>
            )}
          </div>
          
          {/* Right side - Authentication */}
          <div className="flex items-center">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                {/* Display User Name and Picture */}
                {user && (
                  <div className="flex items-center space-x-2">
                    {user.picture && (
                      <img 
                        src={user.picture} 
                        alt={user.name || 'User'} 
                        className="w-8 h-8 rounded-full object-cover border border-gray-300"
                      />
                    )}
                    <span className="text-gray-700 font-medium hidden md:block">
                      {user.name || user.email} {/* Fallback to email if name is missing */}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => login()}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
