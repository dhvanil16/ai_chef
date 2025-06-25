// API utility functions for making authenticated requests

// Base API URL - adjust if needed
const API_BASE_URL = 'http://localhost:8000';

// Generic function to make authenticated API calls
const fetchWithAuth = async (endpoint, options = {}, token) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Special handling for 204 No Content (commonly used for DELETE operations)
    if (response.status === 204) {
      return { success: true };
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized');
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `API error: ${response.status}`);
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return { success: true };
  } catch (error) {
    console.error(`Error in API call to ${endpoint}:`, error);
    throw error;
  }
};

// Recipe-specific API functions
export const generateRecipe = async (ingredients, preferences) => {
  return fetchWithAuth('/generate', {
    method: 'POST',
    body: JSON.stringify({ ingredients, preferences })
  });
};

export const saveRecipe = async (recipe, token) => {
  // Remove the temporary ID if it exists
  const { _temp_id, ...recipeData } = recipe;
  
  return fetchWithAuth('/recipes/save', {
    method: 'POST',
    body: JSON.stringify(recipeData)
  }, token);
};

export const getUserRecipes = async (token) => {
  return fetchWithAuth('/recipes/user', {
    method: 'GET'
  }, token);
};

export const deleteRecipe = async (recipeId, token) => {
  return fetchWithAuth(`/recipes/${recipeId}`, {
    method: 'DELETE'
  }, token);
};

export const toggleFavorite = async (recipeId, isFavorite, token) => {
  return fetchWithAuth(`/recipes/${recipeId}/favorite`, {
    method: 'POST', // Changed from PUT to POST based on backend logs
    body: JSON.stringify({ is_favorite: isFavorite }),
  }, token);
};

export const toggleShared = async (recipeId, isShared, token) => {
  return fetchWithAuth(`/recipes/${recipeId}/shared`, {
    method: 'POST',
    body: JSON.stringify({ is_shared: isShared }),
  }, token);
};

export const getCommunityRecipes = async () => {
  return fetchWithAuth('/recipes/community', {
    method: 'GET'
  });
};

export const assistantChat = async (message, sessionId, recipe, currentStep) => {
  return fetchWithAuth('/assistant', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      sessionId,
      recipe,
      currentStep
    })
  });
}; 