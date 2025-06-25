#Storage factory: choose file or MongoDB backend.

import logging
import importlib
from typing import Any, Dict, List, Optional

from database.config import STORAGE_TYPE
from database.mongo_recipe_storage import (
    Recipe,
    save_recipe,
    get_user_recipes,
    get_recipe_by_id,
    update_recipe,
    delete_recipe,
    toggle_favorite,
    toggle_shared,
    get_shared_recipes
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("storage_factory")

def get_storage_module():
    
    if STORAGE_TYPE == "file":
        logger.info("Using file-based recipe storage")
        return importlib.import_module('database.recipe_storage')
    elif STORAGE_TYPE == "mongo":
        logger.info("Using MongoDB recipe storage")
        return importlib.import_module('database.mongo_recipe_storage')
    else:
        logger.error(f"Unknown storage type: {STORAGE_TYPE}, falling back to file storage")
        return importlib.import_module('database.recipe_storage')

# The following functions delegate to the appropriate storage implementation
# This creates a consistent API regardless of which storage backend is used

def Recipe(*args, **kwargs):
    
    #Factory function for creating Recipe objects
    module = get_storage_module()
    return module.Recipe(*args, **kwargs)

def save_recipe(recipe):
    
    #Save a recipe to the storage backend
    module = get_storage_module()
    return module.save_recipe(recipe)

def get_user_recipes(user_id):
    
    #Get all recipes for a specific user
    module = get_storage_module()
    return module.get_user_recipes(user_id)

def get_recipe_by_id(user_id, recipe_id):
    
    #Get a specific recipe by its ID
    module = get_storage_module()
    return module.get_recipe_by_id(user_id, recipe_id)

def update_recipe(recipe):
    
    #Update an existing recipe
    module = get_storage_module()
    return module.update_recipe(recipe)

def delete_recipe(user_id, recipe_id):
    
    #Delete a recipe
    module = get_storage_module()
    return module.delete_recipe(user_id, recipe_id)

def toggle_favorite(user_id, recipe_id, is_favorite):
    
    #Toggle the favorite status of a recipe
    module = get_storage_module()
    return module.toggle_favorite(user_id, recipe_id, is_favorite)

# Expose the interface (allowing for future swapping of implementations)
__all__ = [
    "Recipe",
    "save_recipe",
    "get_user_recipes",
    "get_recipe_by_id",
    "update_recipe",
    "delete_recipe",
    "toggle_favorite",
    "toggle_shared",
    "get_shared_recipes"
] 