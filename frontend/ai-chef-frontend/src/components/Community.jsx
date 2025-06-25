import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { getCommunityRecipes } from '../utils/api';

// Recipe Detail Component
const RecipeDetail = ({ recipe, onClose }) => {
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
            Shared by {recipe.user_id} on {format(new Date(recipe.saved_date), 'MMM d, yyyy')}
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
            <ol className="list-decimal list-inside space-y-2">
              {recipe.instructions.map((step, index) => (
                <li key={index} className="text-sm">
                  {step}
                </li>
              ))}
            </ol>
          </div>
          
          {recipe.cooking_tips && recipe.cooking_tips.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Cooking Tips</h3>
              <ul className="space-y-1">
                {recipe.cooking_tips.map((tip, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-orange-500 mr-2">•</span>
                    <span className="text-sm">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CommunityRecipeItem = ({ recipe, onClick }) => {
  const date = new Date(recipe.saved_date);
  const formattedDate = format(date, 'MMM d, yyyy');
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-gray-800">{recipe.recipe_name}</h3>
        </div>
        
        <div className="text-xs text-gray-500 mb-2">
          Shared by {recipe.user_id} on {formattedDate}
        </div>
        
        <div className="flex flex-wrap gap-2 mt-2">
          <div className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
            {recipe.ingredients.length} ingredients
          </div>
          <div className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
            {recipe.instructions.length} steps
          </div>
        </div>
      </div>
    </div>
  );
};

const Community = () => {
  const [recipes, setRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  useEffect(() => {
    const fetchCommunityRecipes = async () => {
      try {
        setIsLoading(true);
        const data = await getCommunityRecipes();
        setRecipes(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching community recipes:', err);
        setError('Failed to load community recipes. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommunityRecipes();
  }, []);

  const handleRecipeClick = (recipe) => {
    setSelectedRecipe(recipe);
  };

  const handleCloseDetail = () => {
    setSelectedRecipe(null);
  };

  // Filter recipes based on search term
  const filteredRecipes = recipes.filter(recipe => 
    recipe.recipe_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Community Recipes</h1>
          <p className="text-gray-600 mt-2">Explore recipes shared by the community</p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search recipes..."
              className="w-full p-4 pl-10 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg
              className="absolute left-3 top-4 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="spinner mx-auto h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-gray-600">Loading community recipes...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="bg-red-50 text-red-700 p-4 rounded-lg">
              {error}
            </div>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">
              {searchTerm ? 'No matching recipes found.' : 'No recipes have been shared yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecipes.map(recipe => (
              <CommunityRecipeItem
                key={recipe.id}
                recipe={recipe}
                onClick={() => handleRecipeClick(recipe)}
              />
            ))}
          </div>
        )}
      </div>
      
      {selectedRecipe && (
        <RecipeDetail
          recipe={selectedRecipe}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
};

export default Community; 