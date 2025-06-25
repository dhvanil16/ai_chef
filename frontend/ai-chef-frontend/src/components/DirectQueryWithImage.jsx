// Component for generating recipe from Image.

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import RecipeCard from './RecipeCard';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useNotification } from '../utils/NotificationContext';

const DirectQueryWithImage = () => {
  const [image, setImage] = useState(null);
  const [query, setQuery] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [recipe, setRecipe] = useState(null);
  const [detectedIngredients, setDetectedIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugContext, setDebugContext] = useState([]);

  // For speech recognition
  const [isRecording, setIsRecording] = useState(false);
  const recognition = useRef(null);

  const { addNotification } = useNotification();

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

  // Handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const imageUrl = URL.createObjectURL(file);
      setPreviewUrl(imageUrl);
    }
  };

  // Microphone recording handler
  const handleMicClick = async () => {
    // If currently recording, stop recording
    if (isRecording && recognition.current) {
      recognition.current.stop();
      setIsRecording(false);
      return;
    }

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

  // Submit handler for image and text query
  const handleSubmit = async () => {
    // Validation Check
    if (!image) {
      addNotification('Please upload an image of your ingredients.', 'error');
      return;
    }
    if (!query.trim()) {
      addNotification('Please enter a query about what you want to cook.', 'error');
      return;
    }

    setLoading(true);
    setError(null);
    setRecipe(null);
    setDetectedIngredients([]);

    try {
      // Prepare FormData with image and query
      const formData = new FormData();
      formData.append('file', image);
      formData.append('user_query', query);

      // Call the backend endpoint
      const response = await axios.post(
        "http://localhost:8000/recipe/direct_with_image",
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      // Extract generated recipe and detected ingredients
      const generatedRecipe = response.data.recipe;
      setDetectedIngredients(response.data.detected_ingredients || []);

      // Try generating the visual recipe image
      let imageUrl = null;
      try {
        const prompt = `Food photography masterpiece of ${generatedRecipe.recipe_name}, professionally styled and plated on a modern ceramic dish. Shot with a macro lens (85mm, f/2.8) for exquisite detail, capturing textures. Dramatic, slightly angled overhead lighting (softbox from top-left) highlighting the ingredients: ${generatedRecipe.ingredients.join(", ")}. Realistic, vibrant colors, sharp focus on the main elements with a softly blurred elegant background (e.g., dark wood table, linen napkin). Aim for photorealistic quality with appetizing appeal, 8K resolution.`;
        const imageResponse = await axios.post(
          "http://localhost:8000/recipe/generate_image_gemini",
          { prompt },
          { timeout: 15000 }
        );
      if (imageResponse.data.images && imageResponse.data.images.length > 0) {
          imageUrl = `data:image/png;base64,${imageResponse.data.images[0]}`;
        }
      } catch (imageError) {
        console.error("Image generation failed, continuing with recipe only:", imageError);
        addNotification('Recipe generated, but image creation failed.', 'info');
      }

      // Attach the generated image URL (or null) to the recipe object
      const recipeWithImage = { ...generatedRecipe, imageUrl };
      setRecipe(recipeWithImage);
      setDebugContext(response.data.context || []);
    } catch (err) {
      console.error("Error generating recipe", err);
      addNotification('Failed to generate recipe. Please check the image or query and try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setImage(null);
    setQuery("");
    setPreviewUrl(null);
    setRecipe(null);
    setDetectedIngredients([]);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="relative z-10">
        <h2 className="text-4xl text-center mb-8">
          <span className="bg-gradient-to-r from-orange-600 to-rose-500 bg-clip-text text-transparent">
            Generate Recipe from Image
          </span>
        </h2>
        
        {/* Image Upload Section */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-gray-700 font-medium">Upload Ingredients Image</label>
            <div 
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 ${ previewUrl ? 'border-orange-300' : 'border-gray-300 hover:border-orange-300' }`}
              onClick={() => document.getElementById('image-upload').click()}
            >
              {previewUrl ? (
                <div className="relative">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="max-h-64 mx-auto rounded"
                  />
                  <button 
                    type="button"
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImage(null);
                      setPreviewUrl(null);
                    }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">Click to upload an image of your ingredients</p>
                  <p className="mt-1 text-xs text-gray-400">The AI will analyze the image to identify ingredients</p>
                </div>
              )}
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Query Input Section with Mic Button */}
          <div className="relative mb-8">
            <textarea
              className="w-full p-6 bg-white rounded-xl border border-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-lg transition-all duration-300 hover:shadow-lg shadow-orange-100/50"
              rows="4"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What can I cook with these ingredients?"
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

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center mb-12">
            <button
              onClick={handleSubmit}
              disabled={loading || !image || !query.trim()}
              className="group relative inline-flex items-center justify-center px-8 py-3 text-lg font-medium text-white bg-orange-500 rounded-xl overflow-hidden transition-all duration-300 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-200/50"
            >
              {loading ? "Creating Recipe..." : "Generate Recipe"}
            </button>
          </div>
        </div>

        {loading && (
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
        )}

        {recipe && !loading && (
          <div className="transform transition-all duration-500 animate-fadeIn">
            {detectedIngredients.length > 0 && (
              <div className="mb-6 bg-orange-50 p-4 rounded-xl">
                <h3 className="text-lg font-medium text-orange-800 mb-2">Detected Ingredients:</h3>
                <div className="flex flex-wrap gap-2">
                  {detectedIngredients.map((ingredient, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                      {ingredient}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
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
  );
};

export default DirectQueryWithImage;
