// Component for generating recipe based on user's prefrences.

import React, { useState } from 'react';
import axios from 'axios';
import RecipeCard from './RecipeCard';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useNotification } from '../utils/NotificationContext';

const PreferenceRecipe = () => {
  // Form state variables for recipe preferences
  const [ingredients, setIngredients] = useState("");          // User's available ingredients
  const [mealType, setMealType] = useState("Breakfast");       // Type of meal (breakfast, lunch, etc.)
  const [cuisineType, setCuisineType] = useState("Italian");   // Preferred cuisine style
  const [servingSize, setServingSize] = useState(2);           // Number of servings
  const [dietaryPreference, setDietaryPreference] = useState("None");  // Dietary restrictions
  const [cookingTime, setCookingTime] = useState(30);          // Available cooking time (minutes)
  const [difficulty, setDifficulty] = useState("Easy");        // Recipe complexity

  // Result state variables
  const [suggestions, setSuggestions] = useState([]);          // List of recipe suggestions
  const [selectedRecipe, setSelectedRecipe] = useState("");    // Currently selected suggestion
  const [recipe, setRecipe] = useState(null);                  // Full recipe data when available
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);  // Loading state for suggestions
  const [loadingRecipe, setLoadingRecipe] = useState(false);            // Loading state for full recipe
  const { addNotification } = useNotification();


   // Fetch recipe suggestions from the API based on user preferences
  
  const getSuggestions = async () => {
    if (!ingredients.trim()) {
      addNotification('Please enter some ingredients first.', 'error');
      return;
    }
    setLoadingSuggestions(true);
    setSuggestions([]);
    setSelectedRecipe("");
    setRecipe(null);
    try {
      const payload = {
        ingredients,
        meal_type: mealType,
        cuisine_type: cuisineType,
        serving_size: servingSize,
        dietary_preference: dietaryPreference,
        cooking_time: cookingTime,
        difficulty,
      };
      const response = await axios.post("http://localhost:8000/recipe/suggestions", payload);
      const suggestionsData = response.data.suggestions;
      setSuggestions(suggestionsData.suggestions || []);
    } catch (error) {
      console.error("Error generating suggestions", error);
      addNotification('Failed to get recipe suggestions. Please try again.', 'error');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  
   // Fetch the full recipe for a selected suggestion
 
  const getFullRecipe = async () => {
    if (!selectedRecipe) {
      addNotification('Please select a recipe suggestion first.', 'error');
      return;
    }
    setLoadingRecipe(true);
    setRecipe(null);
    try {
      const response = await axios.post("http://localhost:8000/recipe/full", { selected_recipe: selectedRecipe });
      const recipeData = response.data.recipe;
      
      let imageUrl = null;
      try {
        const prompt = `Food photography masterpiece of ${recipeData.recipe_name}, professionally styled and plated on a modern ceramic dish. Shot with a macro lens (85mm, f/2.8) for exquisite detail, capturing textures. Dramatic, slightly angled overhead lighting (softbox from top-left) highlighting the ingredients: ${recipeData.ingredients.join(", ")}. Realistic, vibrant colors, sharp focus on the main elements with a softly blurred elegant background (e.g., dark wood table, linen napkin). Aim for photorealistic quality with appetizing appeal, 8K resolution.`;
        const imageResponse = await axios.post("http://localhost:8000/recipe/generate_image_gemini", { prompt }, { timeout: 15000 });
        if (imageResponse.data.images && imageResponse.data.images.length > 0) {
          imageUrl = `data:image/png;base64,${imageResponse.data.images[0]}`;
        }
      } catch (imageError) {
        console.error("Image generation failed:", imageError);
        addNotification('Recipe details loaded, but image creation failed.', 'info');
      }

      const recipeWithImage = { ...recipeData, imageUrl };
      setRecipe(recipeWithImage);
    } catch (error) {
      console.error("Error generating full recipe", error);
      addNotification('Failed to load the full recipe details. Please try again.', 'error');
    } finally {
      setLoadingRecipe(false);
    }
  };

  // Function to clear the form and results
  const clearForm = () => {
    // Reset form fields to defaults
    setIngredients("");
    setMealType("Breakfast");
    setCuisineType("Italian");
    setServingSize(2);
    setDietaryPreference("None");
    setCookingTime(30);
    setDifficulty("Easy");

    // Reset results
    setSuggestions([]);
    setSelectedRecipe("");
    setRecipe(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-100/40 to-rose-100/40 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-orange-100/40 to-amber-100/40 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
        </div>

        {/* Recipe Form Section */}
        <div className="relative z-10">
          <h2 className="text-4xl text-center mb-8">
            <span className="bg-gradient-to-r from-orange-600 to-rose-500 bg-clip-text text-transparent">
              Generate a Recipe Based on Your Preferences
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ingredients Input */}
            <div className="space-y-2">
              <label className="block text-gray-700 font-medium">Ingredients</label>
              <textarea
                className="w-full p-4 bg-white rounded-xl border border-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 hover:shadow-lg shadow-orange-100/50"
                rows="3"
                placeholder="e.g., chicken, garlic, lemon"
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
              />
            </div>

            {/* Meal Type Dropdown */}
            <div className="space-y-2">
              <label className="block text-gray-700 font-medium">Meal Type</label>
              <select
                className="w-full p-4 bg-white rounded-xl border border-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 hover:shadow-lg shadow-orange-100/50"
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
              >
                {["Breakfast", "Lunch", "Dinner", "Snack", "Dessert", "Any"].map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Cuisine Type Dropdown */}
            <div className="space-y-2">
              <label className="block text-gray-700 font-medium">Cuisine Type</label>
              <select
                className="w-full p-4 bg-white rounded-xl border border-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 hover:shadow-lg shadow-orange-100/50"
                value={cuisineType}
                onChange={(e) => setCuisineType(e.target.value)}
              >
                {["Italian", "Mexican", "Chinese", "Indian", "Japanese", "Thai", "American", "Mediterranean", "French", "Any"].map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Serving Size Input */}
            <div className="space-y-2">
              <label className="block text-gray-700 font-medium">Serving Size</label>
              <input
                type="number"
                min="1"
                max="10"
                className="w-full p-4 bg-white rounded-xl border border-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 hover:shadow-lg shadow-orange-100/50"
                value={servingSize}
                onChange={(e) => setServingSize(parseInt(e.target.value))}
              />
            </div>

            {/* Dietary Preference Dropdown */}
            <div className="space-y-2">
              <label className="block text-gray-700 font-medium">Dietary Preference</label>
              <select
                className="w-full p-4 bg-white rounded-xl border border-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 hover:shadow-lg shadow-orange-100/50"
                value={dietaryPreference}
                onChange={(e) => setDietaryPreference(e.target.value)}
              >
                {["None", "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Keto", "Low-Carb", "Paleo"].map(pref => (
                  <option key={pref} value={pref}>{pref}</option>
                ))}
              </select>
            </div>

            {/* Cooking Time Input */}
            <div className="space-y-2">
              <label className="block text-gray-700 font-medium">Cooking Time (minutes)</label>
              <input
                type="number"
                min="5"
                max="180"
                step="5"
                className="w-full p-4 bg-white rounded-xl border border-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 hover:shadow-lg shadow-orange-100/50"
                value={cookingTime}
                onChange={(e) => setCookingTime(parseInt(e.target.value))}
              />
            </div>

            {/* Difficulty Dropdown */}
            <div className="space-y-2">
              <label className="block text-gray-700 font-medium">Difficulty</label>
              <select
                className="w-full p-4 bg-white rounded-xl border border-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 hover:shadow-lg shadow-orange-100/50"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                {["Easy", "Medium", "Hard"].map(diff => (
                  <option key={diff} value={diff}>{diff}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Generate Suggestions Button - Styled */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={getSuggestions}
              disabled={loadingSuggestions || !ingredients.trim()}
              className="group relative inline-flex items-center justify-center px-8 py-3 text-lg font-medium text-white bg-orange-500 rounded-xl overflow-hidden transition-all duration-300 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-200/50"
            >
              {loadingSuggestions ? "Finding Ideas..." : "Generate Suggestions"} 
            </button>
          </div>

          {/* Loading Suggestions Skeleton */}
          {loadingSuggestions && (
            <div className="mt-12">
              <h3 className="text-2xl text-center mb-8">
                <span className="bg-gradient-to-r from-orange-600 to-rose-500 bg-clip-text text-transparent">
                  Generating Suggestions...
                </span>
              </h3>
              <div className="space-y-4">
                {Array(3).fill().map((_, index) => (
                  <div key={index} className="p-4 rounded-xl bg-white border border-orange-100">
                    <Skeleton height={24} width="75%" className="mb-4" />
                    <Skeleton height={16} count={2} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions Section */}
          {!loadingSuggestions && suggestions.length > 0 && (
            <div className="mt-12">
              <h3 className="text-2xl text-center mb-8">
                <span className="bg-gradient-to-r from-orange-600 to-rose-500 bg-clip-text text-transparent">
                  Recipe Suggestions
                </span>
              </h3>

              <div className="space-y-4">
                {suggestions.map((suggestion, index) => (
                  <div 
                    key={index}
                    onClick={() => setSelectedRecipe(suggestion.recipe_name)}
                    className={`p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                      selectedRecipe === suggestion.recipe_name
                        ? "bg-orange-100 border-2 border-orange-400"
                        : "bg-white border border-orange-100 hover:border-orange-300"
                    }`}
                  >
                    <h4 className="text-xl font-medium text-gray-800">{suggestion.recipe_name}</h4>
                    <p className="text-gray-600 mt-2">{suggestion.description}</p>
                  </div>
                ))}
              </div>

              {/* Get Full Recipe Button - Styled */}
              <div className="mt-8 flex justify-center">
                <button
                  onClick={getFullRecipe}
                  disabled={loadingRecipe || !selectedRecipe}
                  className="group relative inline-flex items-center justify-center px-8 py-3 text-lg font-medium text-white bg-orange-500 rounded-xl overflow-hidden transition-all duration-300 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-200/50"
                >
                  {loadingRecipe ? "Creating Recipe..." : "Get Full Recipe"} 
                </button>
              </div>
            </div>
          )}

          {/* Loading Recipe Skeleton */}
          {loadingRecipe && (
            <div className="mt-12">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="mb-4">
                  <Skeleton height={32} width="70%" className="mb-2" />
                  <Skeleton height={16} width="30%" />
                </div>
                
                <div className="mb-6">
                  <Skeleton height={24} width="40%" className="mb-3" />
                  <div className="space-y-2">
                    <Skeleton height={16} count={3} />
                  </div>
                </div>
                
                <div className="mb-6">
                  <Skeleton height={24} width="40%" className="mb-3" />
                  <div className="space-y-3">
                    <Skeleton height={16} count={4} />
                  </div>
                </div>
                
                <div className="mb-6">
                  <Skeleton height={24} width="40%" className="mb-3" />
                  <div className="space-y-2">
                    <Skeleton height={16} count={2} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Full Recipe Section */}
          {!loadingRecipe && recipe && (
            <div className="mt-12">
              <h3 className="text-2xl text-center mb-8">
                <span className="bg-gradient-to-r from-orange-600 to-rose-500 bg-clip-text text-transparent">
                  Your Recipe
                </span>
              </h3>
              
              <RecipeCard recipe={recipe} />
              
              <div className="mt-6 text-sm text-gray-700 bg-orange-50 rounded-xl p-4 border-l-4 border-orange-400">
                <div className="flex items-center mb-3">
                  <svg className="w-5 h-5 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium text-gray-800">Important Information</span>
                </div>
                <p className="mb-2">This AI recipe generator is designed for inspiration and entertainment purposes. For your safety:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Always follow proper food safety guidelines and cooking temperatures</li>
                  <li>Verify the safety and quality of all ingredients before use</li>
                  <li>If you have allergies or dietary restrictions, consult healthcare professionals</li>
                  <li>Use common sense and your best judgment when preparing any recipe</li>
                </ul>
              </div>

              {/* Create New Recipe Button */}
              <div className="mt-8 text-center">
                <button
                  onClick={clearForm}
                  className="px-6 py-3 bg-orange-100 text-orange-600 rounded-xl hover:bg-orange-200 transition-colors"
                >
                  Create New Recipe
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreferenceRecipe;
