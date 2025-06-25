// Component for generating recipe from direct query.

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import RecipeCard from './RecipeCard';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useNotification } from '../utils/NotificationContext';

const DirectQuery = () => {
  const [query, setQuery] = useState("");
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [debugContext, setDebugContext] = useState([]);
  const { addNotification } = useNotification();

  // For speech recognition
  const [isRecording, setIsRecording] = useState(false);
  const recognition = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      
      recognition.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
      };
      
      recognition.current.onend = () => {
        setIsRecording(false);
      };
    }
    
    return () => {
      if (recognition.current) {
        recognition.current.abort();
      }
    };
  }, []);


  // 1. Microphone Recording Handler
  const handleMicClick = async () => {
    // If we're already recording, stop
    if (isRecording && recognition.current) {
      recognition.current.stop();
      setIsRecording(false);
      return;
    }

    // Otherwise, start a new recording
    try {
      if (recognition.current) {
        recognition.current.start();
        setIsRecording(true);
      } else {
        console.error("Speech recognition not supported by this browser");
      }
    } catch (error) {
      console.error("Microphone access denied or error:", error);
      setIsRecording(false);
    }
  };

  // 2. Recipe Generation Handler
  const handleSubmit = async () => {
    // Check if query is empty
    if (!query.trim()) {
      addNotification('Please enter a query to generate a recipe.', 'error');
      return; // Stop execution if query is empty
    }

    setLoading(true);
    setRecipe(null); // Clear previous recipe
    try {
      // 1) Get the recipe from the direct query endpoint
      const response = await axios.post("http://localhost:8000/recipe/direct", {
        query,
      });
      const recipeData = response.data.recipe;
      let imageUrl = null;

      // 2) Try to generate an image
      try {
        // Build a more detailed prompt for the image
        const prompt = `Food photography masterpiece of ${recipeData.recipe_name}, professionally styled and plated on a modern ceramic dish. Shot with a macro lens (85mm, f/2.8) for exquisite detail, capturing textures. Dramatic, slightly angled overhead lighting (softbox from top-left) highlighting the ingredients: ${recipeData.ingredients.join(", ")}. Realistic, vibrant colors, sharp focus on the main elements with a softly blurred elegant background (e.g., dark wood table, linen napkin). Aim for photorealistic quality with appetizing appeal, 8K resolution.`;

        // Call the Gemini endpoint for the image
      const imageResponse = await axios.post(
        "http://localhost:8000/recipe/generate_image_gemini",
          { prompt },
          { timeout: 10000 } // Add timeout to prevent long waits
      );

        // Extract the Base64 image (if any)
      if (imageResponse.data.images && imageResponse.data.images.length > 0) {
        const base64String = imageResponse.data.images[0];
        imageUrl = `data:image/png;base64,${base64String}`;
        }
      } catch (imageError) {
        console.error("Image generation failed, continuing with recipe only:", imageError);
        
      }

      // 5) Attach the image to the recipe object 
      const recipeWithImage = { ...recipeData, imageUrl };

      setRecipe(recipeWithImage);
      setDebugContext(response.data.context || []);
    } catch (error) {
      console.error("Error generating recipe", error);
      addNotification('Failed to generate recipe. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Function to clear the form and results
  const clearForm = () => {
    setQuery("");
    setRecipe(null);
    setDebugContext([]);
    // If using speech recognition, ensure it's stopped
    if (recognition.current && isRecording) {
      recognition.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 relative overflow-hidden">
        {/* Title */}
        <h2 className="text-4xl text-center mb-8">
          <span className="bg-gradient-to-r from-orange-600 to-rose-500 bg-clip-text text-transparent">
            Ask AI Chef Anything
          </span>
        </h2>

        {/* Text area & mic button */}
        <div className="relative mb-8">
          <textarea
            className="w-full p-6 bg-white rounded-xl border border-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-lg transition-all duration-300 hover:shadow-lg shadow-orange-100/50"
            rows="4"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about cooking, recipes, or ingredients..."
          />
          {/* Mic Button */}
          <button
            onClick={handleMicClick}
            className="absolute top-3 right-3 p-2 text-orange-600 bg-orange-50 rounded-full hover:bg-orange-100 transition-colors"
            title="Record voice"
          >
            {isRecording ? (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
              </svg>
            )}
          </button>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center mb-12">
          <button
            onClick={handleSubmit}
            disabled={loading || !query.trim()}
            className="group relative inline-flex items-center justify-center px-8 py-3 text-lg font-medium text-white bg-orange-500 rounded-xl overflow-hidden transition-all duration-300 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-200/50"
          >
            {loading ? "Creating Recipe..." : "Generate Recipe"}
          </button>
        </div>

        {/* Show loading state or recipe */}
        {loading ? (
          <div className="py-8">
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
        ) : recipe ? (
          <div className="transform transition-all duration-500 animate-fadeIn">
            <RecipeCard recipe={recipe} />
            <div className="mt-6 text-sm text-gray-700 bg-orange-50 rounded-xl p-4 border-l-4 border-orange-400">
              <div className="flex items-center mb-3">
                <svg
                  className="w-5 h-5 mr-2 text-orange-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
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
        ) : null}
      </div>
    </div>
  );
};

export default DirectQuery;
