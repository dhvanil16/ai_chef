#File-based recipe storage backend.

import os
import json
import time
import uuid
from typing import List, Dict, Optional, Any
from datetime import datetime
from pathlib import Path

# Base directory for storing recipes
BASE_DIR = Path(os.path.dirname(os.path.abspath(__file__)))
STORAGE_DIR = BASE_DIR / "recipe_storage"
USER_RECIPES_DIR = STORAGE_DIR / "user_recipes"
SHARED_RECIPES_DIR = STORAGE_DIR / "shared_recipes"

# Ensure directories exist
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
USER_RECIPES_DIR.mkdir(parents=True, exist_ok=True)
SHARED_RECIPES_DIR.mkdir(parents=True, exist_ok=True)

class Recipe:
    #Recipe model for storage and retrieval
    def __init__(
        self,
        recipe_name: str,
        ingredients: List[str],
        instructions: List[str],
        cooking_tips: Optional[List[str]] = None,
        id: Optional[str] = None,
        user_id: Optional[str] = None,
        is_favorite: bool = False,
        saved_date: Optional[str] = None,
        is_shared: bool = False
    ):
        self.id = id or str(uuid.uuid4())
        self.recipe_name = recipe_name
        self.ingredients = ingredients
        self.instructions = instructions
        self.cooking_tips = cooking_tips or []
        self.user_id = user_id
        self.is_favorite = is_favorite
        self.saved_date = saved_date or datetime.now().isoformat()
        self.is_shared = is_shared
    
    def to_dict(self) -> Dict[str, Any]:
        #Convert recipe to dictionary for JSON serialization
        return {
            "id": self.id,
            "recipe_name": self.recipe_name,
            "ingredients": self.ingredients,
            "instructions": self.instructions,
            "cooking_tips": self.cooking_tips,
            "user_id": self.user_id,
            "is_favorite": self.is_favorite,
            "saved_date": self.saved_date,
            "is_shared": self.is_shared
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Recipe':
        #Create recipe from dictionary
        return cls(
            id=data.get("id"),
            recipe_name=data.get("recipe_name"),
            ingredients=data.get("ingredients", []),
            instructions=data.get("instructions", []),
            cooking_tips=data.get("cooking_tips", []),
            user_id=data.get("user_id"),
            is_favorite=data.get("is_favorite", False),
            saved_date=data.get("saved_date"),
            is_shared=data.get("is_shared", False)
        )


def get_user_directory(user_id: str) -> Path:
    #Get or create user's recipe directory
    safe_user_id = user_id.replace("|", "_").replace(":", "_")
    user_dir = USER_RECIPES_DIR / safe_user_id
    user_dir.mkdir(exist_ok=True)
    return user_dir


def save_recipe(recipe: Recipe) -> Recipe:
    #Save a recipe to the file system
    if not recipe.user_id:
        raise ValueError("User ID is required to save a recipe")
    
    # Get user directory
    user_dir = get_user_directory(recipe.user_id)
    
    # Create filename based on recipe name and timestamp
    safe_name = recipe.recipe_name.lower().replace(" ", "_")
    timestamp = int(time.time())
    filename = f"{safe_name}_{timestamp}.json"
    
    # Save recipe to file
    file_path = user_dir / filename
    with open(file_path, "w") as f:
        json.dump(recipe.to_dict(), f, indent=2)
    
    return recipe


def get_user_recipes(user_id: str) -> List[Recipe]:
    #Get all recipes for a user
    user_dir = get_user_directory(user_id)
    recipes = []
    
    # Read all JSON files in user directory
    for file_path in user_dir.glob("*.json"):
        try:
            with open(file_path, "r") as f:
                recipe_data = json.load(f)
                recipes.append(Recipe.from_dict(recipe_data))
        except (json.JSONDecodeError, IOError) as e:
            print(f"Error reading recipe file {file_path}: {e}")
    
    # Sort by saved date (newest first)
    recipes.sort(key=lambda r: r.saved_date, reverse=True)
    return recipes


def get_recipe_by_id(user_id: str, recipe_id: str) -> Optional[Recipe]:
    #Get a specific recipe by ID
    recipes = get_user_recipes(user_id)
    for recipe in recipes:
        if recipe.id == recipe_id:
            return recipe
    return None


def update_recipe(recipe: Recipe) -> Recipe:
    #Update an existing recipe
    if not recipe.user_id or not recipe.id:
        raise ValueError("User ID and Recipe ID are required to update a recipe")
    
    # Get all user recipes
    user_dir = get_user_directory(recipe.user_id)
    
    # Find the file containing this recipe
    recipe_file = None
    for file_path in user_dir.glob("*.json"):
        try:
            with open(file_path, "r") as f:
                data = json.load(f)
                if data.get("id") == recipe.id:
                    recipe_file = file_path
                    break
        except (json.JSONDecodeError, IOError):
            continue
    
    if not recipe_file:
        raise ValueError(f"Recipe with ID {recipe.id} not found")
    
    # Update the recipe file
    with open(recipe_file, "w") as f:
        json.dump(recipe.to_dict(), f, indent=2)
    
    return recipe


def delete_recipe(user_id: str, recipe_id: str) -> bool:
    #Delete a recipe
    user_dir = get_user_directory(user_id)
    
    # Find the file containing this recipe
    recipe_file = None
    for file_path in user_dir.glob("*.json"):
        try:
            with open(file_path, "r") as f:
                data = json.load(f)
                if data.get("id") == recipe_id:
                    recipe_file = file_path
                    break
        except (json.JSONDecodeError, IOError):
            continue
    
    if not recipe_file:
        return False
    
    # Delete the file
    os.remove(recipe_file)
    return True


def toggle_favorite(user_id: str, recipe_id: str, is_favorite: bool) -> Optional[Recipe]:
    #Toggle favorite status of a recipe
    recipe = get_recipe_by_id(user_id, recipe_id)
    if not recipe:
        return None
    
    recipe.is_favorite = is_favorite
    return update_recipe(recipe) 