// My Cookbook Component.

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../utils/AuthContext';
import { getUserRecipes, deleteRecipe, toggleFavorite, saveRecipe, toggleShared, getCommunityRecipes } from '../utils/api';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import ChefAssistant from './ChefAssistant';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useNotification } from '../utils/NotificationContext';

// Recipe Detail Component
const RecipeDetail = ({ recipe, onClose }) => {
  const { filter } = React.useContext(RecipeContext);
  const isCommunityView = filter === 'community';
  
  // Extract email from user_id if it's an OAuth ID
  const displayUser = () => {
    if (!recipe.user_id) return 'Unknown user';
    
    // If we have the email directly, use it
    if (recipe.user_email) {
      return recipe.user_email;
    }
    
    // Otherwise, try to extract from OAuth ID
    if (recipe.user_id.includes('|')) {
      return recipe.user_id.split('|')[0];
    }
    
    return recipe.user_id;
  };
  
  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5">
          <div className="flex justify-between items-start mb-3">
            <h2 className="text-2xl font-bold text-gray-800">{recipe.recipe_name}</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mb-4 text-xs text-gray-500">
            {isCommunityView ? 
              `Shared by ${displayUser()} on ${format(new Date(recipe.saved_date), 'MMM d, yyyy')}` : 
              `Saved on ${format(new Date(recipe.saved_date), 'MMM d, yyyy')}`
            }
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Ingredients</h3>
            <ul className="space-y-1">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span className="text-sm">{ingredient}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Instructions</h3>
            <ol className="space-y-3">
              {recipe.instructions.map((step, index) => (
                <li key={index} className="pl-2">
                  <div className="flex text-sm">
                    <span className="font-semibold text-orange-500 mr-2">{index + 1}.</span>
                    <span>{step}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          
          {recipe.cooking_tips && recipe.cooking_tips.length > 0 && (
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Tips</h3>
              <ul className="space-y-1 bg-orange-50 p-3 rounded-lg">
                {recipe.cooking_tips.map((tip, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-orange-500 mr-2">💡</span>
                    <span className="text-sm">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="mt-5 text-center">
            <button 
              onClick={onClose}
              className="px-5 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-400 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecipeContext = React.createContext();

const RecipeItem = ({ recipe, onDelete, onToggleFavorite, onToggleShared, onClick, onAssistantClick }) => {
  const { filter } = React.useContext(RecipeContext);
  const date = new Date(recipe.saved_date);
  const formattedDate = format(date, 'MMM d, yyyy');
  const [showSharePopup, setShowSharePopup] = useState(false);
  const isCommunityView = filter === 'community';
  const isFavoritesView = filter === 'favorites';
  const { addNotification } = useNotification();

  // Format recipe for sharing
  const formatRecipe = () => {
    const formattedIngredients = recipe.ingredients.map(ing => `• ${ing}`).join('\n');
    const formattedInstructions = recipe.instructions.map((step, index) => `${index + 1}. ${step}`).join('\n');
    const formattedTips = recipe.cooking_tips && recipe.cooking_tips.length > 0 
      ? `\n\nTIPS:\n${recipe.cooking_tips.map(tip => `• ${tip}`).join('\n')}` 
      : '';
    
    return `${recipe.recipe_name}\n\nINGREDIENTS:\n${formattedIngredients}\n\nINSTRUCTIONS:\n${formattedInstructions}${formattedTips}\n\nShared from AI Chef`;
  };

  // Helper function to copy text to clipboard
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy:', err);
      return false;
    }
  };

  // Helper function to detect mobile device
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const handleShare = (e) => {
    e.stopPropagation();
    setShowSharePopup(true);
  };

  const closeSharePopup = (e) => {
    if (e) e.stopPropagation();
    setShowSharePopup(false);
  };

  const shareToSocialMedia = async (platform, e) => {
    e.stopPropagation();
    const recipeText = formatRecipe();
    
    try {
      switch (platform) {
        case 'whatsapp': {
          const whatsappText = encodeURIComponent(recipeText);
          const whatsappUrl = isMobile()
            ? `whatsapp://send?text=${whatsappText}`
            : `https://web.whatsapp.com/send?text=${whatsappText}`;
          
          // First copy to clipboard as backup
          await copyToClipboard(recipeText);
          
          // Try to open WhatsApp
          window.open(whatsappUrl, '_blank');
          addNotification('Opening WhatsApp... Recipe copied to clipboard as well!', 'success');
          break;
        }
        
        case 'facebook': {
          // Facebook sharing dialog
          const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(recipeText)}`;
          const width = 550;
          const height = 450;
          const left = (window.screen.width - width) / 2;
          const top = (window.screen.height - height) / 2;
          
          window.open(
            fbUrl,
            'facebook-share-dialog',
            `width=${width},height=${height},left=${left},top=${top}`
          );
          
          // Copy to clipboard as backup
          await copyToClipboard(recipeText);
          addNotification('Opening Facebook... Recipe copied to clipboard as well!', 'success');
          break;
        }
        
        case 'instagram': {
          // Instagram doesn't support direct sharing, so we'll copy to clipboard
          const success = await copyToClipboard(recipeText);
          if (success) {
            addNotification('Recipe copied! You can now paste it into Instagram', 'success');
          } else {
            addNotification('Failed to copy recipe. Please try again.', 'error');
          }
          break;
        }
        
        case 'clipboard': {
          const success = await copyToClipboard(recipeText);
          if (success) {
            addNotification('Recipe copied to clipboard! 📋', 'success');
          } else {
            addNotification('Failed to copy recipe. Please try again.', 'error');
          }
          break;
        }
      }
    } catch (error) {
      console.error('Sharing failed:', error);
      addNotification('Failed to share recipe. Please try copying instead.', 'error');
      
      // Attempt to copy as fallback
      try {
        await copyToClipboard(recipeText);
        addNotification('Recipe copied to clipboard as fallback!', 'info');
      } catch (clipboardError) {
        addNotification('All sharing methods failed. Please try again.', 'error');
      }
    }
    
    closeSharePopup(e);
  };

  // Extract email from user_id if it's an OAuth ID
  const displayUser = () => {
    if (!recipe.user_id) return 'Unknown user';
    
    if (recipe.user_email) {
      return recipe.user_email;
    }
    
    // Extract email ID
    if (recipe.user_id.includes('|')) {
      return recipe.user_id.split('|')[0];
    }
    
    return recipe.user_id;
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md hover:border-orange-200 hover:-translate-y-1 transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-gray-800">{recipe.recipe_name}</h3>
          {/* Action Icons */}
          <div className="flex space-x-3 items-center" onClick={e => e.stopPropagation()}>
            {/* Play button (Chef Assistant) - always visible */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onAssistantClick(recipe);
              }}
              className="text-gray-400 hover:text-green-500 transform transition-transform hover:scale-110"
              title="Start cooking assistant"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            
            {/* Only show these buttons if NOT in community view */}
            {!isCommunityView && (
              <>
                <button 
                  onClick={() => onToggleFavorite(recipe.id, !recipe.is_favorite)}
                  className={`text-gray-400 hover:text-red-500 transform transition-transform hover:scale-110 ${recipe.is_favorite ? 'text-red-500' : ''}`}
                  title={recipe.is_favorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </button>
                {!isFavoritesView && (
                  <>
                    <button 
                      onClick={() => onToggleShared(recipe.id, !recipe.is_shared)}
                      className={`text-gray-400 hover:text-orange-500 transform transition-transform hover:scale-110 ${recipe.is_shared ? 'text-orange-500' : ''}`}
                      title={recipe.is_shared ? "Remove from community" : "Share with community"}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </button>
                    <button 
                      onClick={handleShare}
                      className="text-gray-400 hover:text-blue-500 transform transition-transform hover:scale-110"
                      title="Share recipe on social media"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => onDelete(recipe.id)}
                      className="text-gray-400 hover:text-red-500 transform transition-transform hover:scale-110"
                      title="Delete recipe"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Share Popup */}
        {showSharePopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeSharePopup}>
            <div className="bg-white rounded-lg p-6 w-80 shadow-xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Share Recipe</h3>
              
              <div className="flex justify-around mb-6">
                {/* WhatsApp */}
                <button 
                  onClick={(e) => shareToSocialMedia('whatsapp', e)}
                  className="flex flex-col items-center"
                >
                  <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mb-2 hover:bg-green-600">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"></path>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 6.628 5.373 12 12 12 6.628 0 12-5.373 12-12 0-6.628-5.373-12-12-12zm.029 18.88a7.947 7.947 0 01-3.76-.976L4 18.672l1.784-4.201c-.696-1.201-1.099-2.579-1.099-4.042C4.685 6.253 7.957 3 12 3s7.315 3.253 7.315 7.429c0 4.176-3.272 7.429-7.315 7.429-.269 0-.534-.014-.8-.038z"></path>
                    </svg>
                  </div>
                  <span className="text-sm">WhatsApp</span>
                </button>
                
                {/* Facebook */}
                <button 
                  onClick={(e) => shareToSocialMedia('facebook', e)}
                  className="flex flex-col items-center"
                >
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mb-2 hover:bg-blue-700">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13.397 20.997v-8.196h2.765l.411-3.209h-3.176V7.548c0-.926.258-1.56 1.587-1.56h1.684v-2.86c-.82-.113-1.649-.33-2.815-.33-2.757 0-4.632 1.65-4.632 4.7v2.62H6.442v3.21h2.78v8.196h4.175z"></path>
                    </svg>
                  </div>
                  <span className="text-sm">Facebook</span>
                </button>
                
                {/* Instagram */}
                <button 
                  onClick={(e) => shareToSocialMedia('instagram', e)}
                  className="flex flex-col items-center"
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white rounded-full flex items-center justify-center mb-2 hover:opacity-90">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"></path>
                    </svg>
                  </div>
                  <span className="text-sm">Instagram</span>
                </button>
                
                {/* Clipboard */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const recipeText = formatRecipe();
                    copyToClipboard(recipeText);
                  }}
                  className="flex flex-col items-center"
                >
                  <div className="w-12 h-12 bg-gray-600 text-white rounded-full flex items-center justify-center mb-2 hover:bg-gray-700">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </div>
                  <span className="text-sm">Copy</span>
                </button>
              </div>
              
              <button 
                onClick={closeSharePopup}
                className="w-full py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        
        <div className="text-xs text-gray-500 mb-2">
          {isCommunityView ? 
            `Shared by ${displayUser()} on ${formattedDate}` : 
            `Saved on ${formattedDate}`
          }
        </div>
        
        {/* Info Tags */}
        <div className="flex flex-wrap gap-2 mt-2">
          <div className="flex items-center text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
            <svg className="w-3.5 h-3.5 mr-1.5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
            </svg>
            {recipe.ingredients.length} ingredients
          </div>
          <div className="flex items-center text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
            <svg className="w-3.5 h-3.5 mr-1.5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
             </svg>
            {recipe.instructions.length} steps
          </div>
        </div>
      </div>
    </div>
  );
};

const MyCookbook = () => {
  const [recipes, setRecipes] = useState([]);
  const [communityRecipes, setCommunityRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCommunityLoading, setIsCommunityLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [assistantRecipe, setAssistantRecipe] = useState(null);
  const { isAuthenticated, login, getToken, user } = useAuth();
  const { addNotification } = useNotification();

  // --- STATE FOR FILTERS & SORTING ---
  const [ingredientCountFilter, setIngredientCountFilter] = useState('any');
  const [stepCountFilter, setStepCountFilter] = useState('any');
  const [sortBy, setSortBy] = useState('default');

  // Function to clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setIngredientCountFilter('any');
    setStepCountFilter('any');
    setSortBy('default');
    
    // Show feedback to user
    addNotification('Filters cleared', 'info');
  };

  // Check for pending recipe and save it if user is authenticated
  useEffect(() => {
    const checkPendingRecipe = async () => {
      if (isAuthenticated) {
        const pendingRecipe = localStorage.getItem('pendingRecipe');
        const pendingSaveRedirect = localStorage.getItem('pendingSaveRedirect');
        
        if (pendingRecipe && pendingSaveRedirect === 'true') {
          try {
            // Parse the recipe from localStorage
            const recipeData = JSON.parse(pendingRecipe);
            
            // Get the token
            const token = await getToken();
            
            // Save the recipe
            await saveRecipe(recipeData, token);
            
            // Clear all pending recipe data
            localStorage.removeItem('pendingRecipe');
            localStorage.removeItem('pendingSaveRedirect');
            
            // Set success message
            addNotification('Recipe saved successfully!');
            
            // Refresh recipes
            fetchRecipes();
          } catch (err) {
            console.error('Error saving pending recipe:', err);
          }
        }
      }
    };
    
    checkPendingRecipe();
  }, [isAuthenticated]);

  // Add login/logout notifications based on auth state changes
  useEffect(() => {
    // Check URL parameters
    const queryParams = new URLSearchParams(window.location.search);
    
    // Handle saved recipe notification only
    if (queryParams.get('saved') === 'true') {
      addNotification('Recipe saved successfully! 📚', 'success');
      // Remove parameter from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Clear any pending recipe data to avoid double saves
      localStorage.removeItem('pendingRecipe');
      localStorage.removeItem('pendingSaveRedirect');
    }
  }, []);
  
  // Handle filter change from sidebar
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setShowSidebar(false);
  };
  
  // Fetch user's recipes
  const fetchRecipes = async () => {
    if (!isAuthenticated) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const token = await getToken();
      const userRecipes = await getUserRecipes(token);
      
      setRecipes(userRecipes);
    } catch (err) {
      console.error('Error fetching recipes:', err);
      addNotification('Failed to load your recipes. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle recipe deletion
  const handleDelete = async (recipeId) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      try {
        const token = await getToken();
        const result = await deleteRecipe(recipeId, token);
        
        // Remove recipe from state immediately to provide feedback
        setRecipes(recipes.filter(recipe => recipe.id !== recipeId));
        
        // Show success message
        addNotification('Recipe deleted successfully!');
      } catch (err) {
        console.error('Error deleting recipe:', err);
        addNotification('Failed to delete recipe. Please try again.', 'error');
        // Refresh recipes to ensure UI is in sync with server state
        fetchRecipes();
      }
    }
  };
  
  // Handle toggling favorite status
  const handleToggleFavorite = async (recipeId, isFavorite) => {
    try {
      const token = await getToken();
      await toggleFavorite(recipeId, isFavorite, token);
      
      // Update recipes in state
      setRecipes(recipes.map(recipe => {
        if (recipe.id === recipeId) {
          return { ...recipe, is_favorite: isFavorite };
        }
        return recipe;
      }));
      
      // Show success message
      addNotification(isFavorite ? 'Added to favorites! ❤️' : 'Removed from favorites');
    } catch (err) {
      console.error('Error toggling favorite:', err);
      addNotification('Failed to update favorite status', 'error');
    }
  };
  
  const handleToggleShared = async (recipeId, isShared) => {
    try {
      const token = await getToken();
      await toggleShared(recipeId, isShared, token);
      
      // Update recipes in state
      setRecipes(recipes.map(recipe => {
        if (recipe.id === recipeId) {
          return { ...recipe, is_shared: isShared };
        }
        return recipe;
      }));
      
      // Refresh community recipes if sharing is enabled
      if (isShared) {
        await fetchCommunityRecipes();
      } else {
        // If unsharing, filter out this recipe from community recipes
        setCommunityRecipes(communityRecipes.filter(recipe => recipe.id !== recipeId));
      }
      
      // Show success message
      addNotification(isShared ? 'Recipe shared with community! 🌎' : 'Recipe removed from community');
    } catch (err) {
      console.error('Error toggling shared status:', err);
      addNotification('Failed to update shared status', 'error');
    }
  };
  
  // Handle recipe click
  const handleRecipeClick = (recipe) => {
    setSelectedRecipe(recipe);
  };
  
  // Fetch community recipes
  const fetchCommunityRecipes = async () => {
    try {
      setIsCommunityLoading(true);
      setError(null);
      
      const communityRecipes = await getCommunityRecipes();
      
      setCommunityRecipes(communityRecipes);
    } catch (err) {
      console.error('Error fetching community recipes:', err);
      addNotification('Failed to load community recipes. Please try again.', 'error');
    } finally {
      setIsCommunityLoading(false);
    }
  };
  
  // --- FILTERING AND SORTING LOGIC ---
  const filteredRecipes = (filter === 'community' ? communityRecipes : recipes)
    .filter(recipe => {
      // Sidebar Filter (All/Favorites)
      const matchesSidebarFilter = filter === 'all' || 
                                 filter === 'community' || 
                                 (filter === 'favorites' && recipe.is_favorite);

      // Search Term Filter
      const matchesSearch = searchTerm === '' || 
        recipe.recipe_name.toLowerCase().includes(searchTerm.toLowerCase());

      // Ingredient Count Filter
      const matchesIngredientCount = () => {
        if (ingredientCountFilter === 'any') return true;
        const count = recipe.ingredients.length;
        if (ingredientCountFilter === '<10') return count < 10;
        if (ingredientCountFilter === '10-20') return count >= 10 && count <= 20;
        if (ingredientCountFilter === '>20') return count > 20;
        return true;
      };

      // Step Count Filter
      const matchesStepCount = () => {
        if (stepCountFilter === 'any') return true;
        const count = recipe.instructions.length;
        if (stepCountFilter === '<10') return count < 10;
        if (stepCountFilter === '10-20') return count >= 10 && count <= 20;
        if (stepCountFilter === '>20') return count > 20;
        return true;
      };

      return matchesSidebarFilter && 
             matchesSearch && 
             matchesIngredientCount() && 
             matchesStepCount();
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.saved_date) - new Date(a.saved_date);
      }
      if (sortBy === 'oldest') {
        return new Date(a.saved_date) - new Date(b.saved_date);
      }
      return 0;
    });
  
  // Load recipes when component mounts or auth status changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchRecipes();
    }
    
    // Fetch community recipes regardless of authentication
    fetchCommunityRecipes();
  }, [isAuthenticated]);
  
  const handleAssistantClick = (recipe) => {
    setAssistantRecipe(recipe);
  };

  const handleCloseAssistant = () => {
    setAssistantRecipe(null);
  };
  
  // If user is not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <div className="text-center py-20 px-4">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8 border border-orange-100">
          <svg className="mx-auto h-16 w-16 text-orange-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Sign In to View Your Recipes</h2>
          <p className="text-gray-600 mb-6">Please sign in to access your saved recipes and personalized cookbook.</p>
          <button 
            onClick={() => login()}
            className="w-full px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-400 transition-colors shadow-md"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left sidebar fixed panel */}
      <div className="bg-white w-64 border-r border-gray-200 min-h-screen shadow-sm flex flex-col">
        <div className="p-6 flex-grow">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Menu</h2>
          
          <nav>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => handleFilterChange('all')}
                  className={`w-full text-left px-4 py-2.5 rounded-lg transition-colors duration-200 flex items-center ${filter === 'all' 
                    ? 'bg-orange-100 text-orange-600 font-semibold border-l-4 border-orange-500' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                  All Recipes
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleFilterChange('favorites')}
                  className={`w-full text-left px-4 py-2.5 rounded-lg transition-colors duration-200 flex items-center ${filter === 'favorites' 
                    ? 'bg-orange-100 text-orange-600 font-semibold border-l-4 border-orange-500' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                >
                   <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                   </svg>
                  Favorites
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleFilterChange('community')}
                  className={`w-full text-left px-4 py-2.5 rounded-lg transition-colors duration-200 flex items-center ${filter === 'community' 
                    ? 'bg-orange-100 text-orange-600 font-semibold border-l-4 border-orange-500' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Community
                </button>
              </li>
            </ul>
          </nav>
        </div>
        {/* Optional: Add a section at the bottom of the sidebar if needed */}
      </div>
      
      {/* Main content area - takes remaining space */}
      <RecipeContext.Provider value={{ filter }}>
        <div className="flex-1 p-6 overflow-auto">
          {/* Recipe Detail Modal */}
          {selectedRecipe && (
            <RecipeDetail 
              recipe={selectedRecipe} 
              onClose={() => setSelectedRecipe(null)}
            />
          )}
          
          {/* Chef Assistant Modal */}
          {assistantRecipe && (
            <ChefAssistant 
              recipe={assistantRecipe}
              onClose={handleCloseAssistant}
            />
          )}
          
          <div className="max-w-4xl mx-auto">
            <div className="flex items-baseline justify-between mb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {filter === 'community' ? 'Community Recipes' : 'My Recipes'}
              </h1>
              {/* Display recipe count only when not loading and recipes exist */}
              {!(filter === 'community' ? isCommunityLoading : isLoading) && filteredRecipes.length > 0 && (
                <span className="text-sm text-gray-500 font-medium">
                  ({filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''})
                </span>
              )}
            </div>
            
            <p className="text-gray-600 mb-6">
              {filter === 'community' 
                ? 'Explore recipes shared by the community' 
                : `Welcome back, ${recipes[0]?.user_name || 'Chef'}! Here are all your saved recipes.`}
            </p>
            
            {/* --- SEARCH AND FILTER ROW --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 items-end">
              {/* Search bar */}
              <div>
                <label htmlFor="search-recipes" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    id="search-recipes"
                    type="text"
                    placeholder="Search recipes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Ingredient Count Filter */}
              <div>
                <label htmlFor="filter-ingredients" className="block text-sm font-medium text-gray-700 mb-1">Ingredients</label>
                <select 
                  id="filter-ingredients"
                  value={ingredientCountFilter}
                  onChange={(e) => setIngredientCountFilter(e.target.value)}
                  className="pl-3 pr-8 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                >
                  <option value="any">Any Count</option>
                  <option value="<10">Less than 10</option>
                  <option value="10-20">10-20</option>
                  <option value=">20">More than 20</option>
                </select>
              </div>

              {/* Step Count Filter */}
              <div>
                <label htmlFor="filter-steps" className="block text-sm font-medium text-gray-700 mb-1">Steps</label>
                <select 
                  id="filter-steps"
                  value={stepCountFilter}
                  onChange={(e) => setStepCountFilter(e.target.value)}
                  className="pl-3 pr-8 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                >
                  <option value="any">Any Count</option>
                  <option value="<10">Less than 10</option>
                  <option value="10-20">10-20</option>
                  <option value=">20">More than 20</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <div className="flex gap-2">
                  <select 
                    id="sort-by"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex-grow pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  >
                    <option value="default">Default</option>
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                  
                  {/* Clear Filters Button (X icon) */}
                  <button
                    onClick={clearAllFilters}
                    className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    title="Clear Filters"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Loading, error, or empty states / Recipe Grid */}
            {(filter === 'community' ? isCommunityLoading : isLoading) ? (
              <div className="grid gap-6">
                {Array(5).fill().map((_, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                    <div className="flex justify-between items-start mb-4">
                      <Skeleton width="75%" height={24} />
                      <div className="flex space-x-2">
                        <Skeleton circle width={20} height={20} />
                        <Skeleton circle width={20} height={20} />
                        <Skeleton circle width={20} height={20} />
                      </div>
                    </div>
                    <Skeleton width="33%" height={12} className="mb-4" />
                    <div className="flex gap-2 mt-3">
                      <Skeleton width={112} height={20} borderRadius={9999} />
                      <Skeleton width={96} height={20} borderRadius={9999} />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredRecipes.length === 0 ? (
              <div className="text-center py-8">
                <div>
                  <svg className="mx-auto h-16 w-16 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="mt-4 text-xl font-medium text-gray-700">
                    {filter === 'favorites' 
                      ? "No favorite recipes yet" 
                      : filter === 'community'
                        ? "No recipes have been shared with the community yet"
                        : searchTerm 
                          ? "No recipes match your search" 
                          : "No recipes yet"}
                  </h3>
                  <p className="mt-2 text-gray-500">
                    {filter === 'favorites' 
                      ? "Click the heart icon on your recipes to add them to favorites." 
                      : filter === 'community'
                        ? "Be the first to share a recipe with the community!"
                        : searchTerm 
                          ? "Try a different search term or clear your search." 
                          : "Generate a recipe and click 'Save Recipe' to add it here."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-6">
                {filteredRecipes.map(recipe => (
                  <RecipeItem 
                    key={recipe.id} 
                    recipe={recipe} 
                    onDelete={filter !== 'community' ? handleDelete : undefined}
                    onToggleFavorite={filter !== 'community' ? handleToggleFavorite : undefined}
                    onToggleShared={filter !== 'community' ? handleToggleShared : undefined}
                    onClick={() => handleRecipeClick(recipe)}
                    onAssistantClick={handleAssistantClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </RecipeContext.Provider>
    </div>
  );
};

export default MyCookbook; 