import React, { useState } from 'react';
import { useAuth } from '../utils/AuthContext';
import { useNotification } from '../utils/NotificationContext';
import { saveRecipe } from '../utils/api';

const RecipeCard = ({ recipe }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('ingredients');
  const { isAuthenticated, login, getToken } = useAuth();
  const { addNotification } = useNotification();

  const handleSave = async () => {
    // If not authenticated, store recipe and redirect to login
    if (!isAuthenticated) {
      const recipeWithId = {
        ...recipe,
        _temp_id: Date.now().toString(),
      };
      localStorage.setItem('pendingRecipe', JSON.stringify(recipeWithId));
      localStorage.setItem('pendingSaveRedirect', 'true');
      
      // Notify user they need to login
      addNotification('Please log in to save your recipe', 'info');
      login();
      return;
    }

    try {
      setIsSaving(true);

      const token = await getToken();
      await saveRecipe(recipe, token);

      // Show success notification with action button style
      addNotification('Recipe saved to your cookbook! 📚', 'success');
      
      // Redirect to the cookbook page
      window.location.href = '/cookbook';
    } catch (error) {
      console.error('Error saving recipe:', error);
      addNotification('Failed to save recipe. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 p-6">
  {/* Top Section: Image on the Left, Centered Title & Stats on the Right */}
  <div className="flex flex-col md:flex-row items-center justify-center gap-6">
    {/* AI-Generated Image (left) or Placeholder */}
    <div className="md:w-1/3">
      {recipe.imageUrl ? (
        <img
          src={recipe.imageUrl}
          alt={recipe.recipe_name}
          className="w-full h-auto object-cover rounded-md shadow-md"
        />
      ) : (
        <div className="w-full aspect-square bg-gradient-to-br from-orange-100 to-orange-200 rounded-md shadow-md flex items-center justify-center">
          <svg className="w-16 h-16 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
      )}
    </div>
    {/* Recipe Name & Stats (right) */}
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      {/* Recipe Title */}
      <h2 className="text-3xl font-bold mb-4">{recipe.recipe_name}</h2>
      {/* Stats (Ingredients, Steps, Tips) with Icons */}
      <div className="flex justify-center space-x-6 md:space-x-8 text-sm text-gray-600">
        {/* Ingredients Stat */}
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
          </svg>
          <span>{recipe.ingredients.length} Ingredients</span>
        </div>
        {/* Steps Stat */}
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <span>{recipe.instructions.length} Steps</span>
        </div>
        {/* Tips Stat */}
        {recipe.cooking_tips && recipe.cooking_tips.length > 0 && (
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>{recipe.cooking_tips.length} Tips</span>
          </div>
        )}
      </div>
    </div>
  </div>

      {/* Tabs Section */}
      <div className="border-b border-gray-200 mt-6">
        <nav className="flex">
          <button
            onClick={() => setActiveTab('ingredients')}
            className={`relative py-4 px-6 font-medium text-center w-1/3 ${
              activeTab === 'ingredients'
                ? 'text-orange-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Ingredients
            {activeTab === 'ingredients' && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-orange-500"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('instructions')}
            className={`relative py-4 px-6 font-medium text-center w-1/3 ${
              activeTab === 'instructions'
                ? 'text-orange-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Instructions
            {activeTab === 'instructions' && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-orange-500"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('tips')}
            className={`relative py-4 px-6 font-medium text-center w-1/3 ${
              activeTab === 'tips'
                ? 'text-orange-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Chef's Tips
            {activeTab === 'tips' && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-orange-500"></div>
            )}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'ingredients' && (
          <div className={`${recipe.ingredients.length >= 10 ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}`}>
            {recipe.ingredients.map((ingredient, index) => (
              <div
                key={index}
                className="flex items-center bg-orange-50 p-4 rounded-lg"
              >
                <div className="flex-shrink-0 h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-orange-500 font-medium">{index + 1}</span>
                </div>
                <span className="text-gray-800">{ingredient}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'instructions' && (
          <div className="space-y-4">
            {recipe.instructions.map((instruction, index) => (
              <div
                key={index}
                className="flex items-start bg-orange-50 p-4 rounded-lg"
              >
                <div className="flex-shrink-0 h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-orange-500 font-medium">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="text-gray-800">{instruction}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'tips' && (
          <div className="space-y-4">
            {recipe.cooking_tips && recipe.cooking_tips.length > 0 ? (
              recipe.cooking_tips.map((tip, index) => (
                <div
                  key={index}
                  className="flex items-start bg-orange-50 p-4 rounded-lg"
                >
                  <div className="flex-shrink-0 h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                    <span className="text-orange-500 font-medium">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800">{tip}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <p className="text-gray-500">
                  No cooking tips available for this recipe.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save Button & Messages */}
      <div className="mt-6">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-colors disabled:bg-gray-400 flex justify-center font-medium"
        >
          {isSaving ? (
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : isAuthenticated
          ? 'Save Recipe'
          : 'Sign In to Save'}
        </button>
      </div>
    </div>
  );
};

export default RecipeCard;
