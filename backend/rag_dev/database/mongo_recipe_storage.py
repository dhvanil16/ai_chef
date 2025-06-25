#MongoDB recipe storage backend.

import uuid
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from pymongo import MongoClient
import logging

from database.config import MONGO_URI, DB_NAME, RECIPES_COLLECTION

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mongo_recipe_storage")

# Initialize MongoDB client and connect to the database
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
recipes_collection = db[RECIPES_COLLECTION]

# Create indexes for efficient queries
recipes_collection.create_index("user_id")
recipes_collection.create_index([("user_id", 1), ("id", 1)], unique=True)

class Recipe:
    # Recipe model for storage and retrieval
    def __init__(
        self,
        recipe_name: str,
        ingredients: List[str],
        instructions: List[str],
        cooking_tips: Optional[List[str]] = None,
        id: Optional[str] = None,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
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
        self.user_email = user_email
        self.is_favorite = is_favorite
        self.saved_date = saved_date or datetime.now().isoformat()  
        self.is_shared = is_shared
    
    def to_dict(self) -> Dict[str, Any]:
     
        return {
            "id": self.id,
            "recipe_name": self.recipe_name,
            "ingredients": self.ingredients,
            "instructions": self.instructions,
            "cooking_tips": self.cooking_tips,
            "user_id": self.user_id,
            "user_email": self.user_email,
            "is_favorite": self.is_favorite,
            "saved_date": self.saved_date,
            "is_shared": self.is_shared
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Recipe':

        return cls(
            id=data.get("id"),
            recipe_name=data.get("recipe_name"),
            ingredients=data.get("ingredients", []),
            instructions=data.get("instructions", []),
            cooking_tips=data.get("cooking_tips", []),
            user_id=data.get("user_id"),
            user_email=data.get("user_email"),
            is_favorite=data.get("is_favorite", False),
            saved_date=data.get("saved_date"),
            is_shared=data.get("is_shared", False)
        )


def save_recipe(recipe: Recipe) -> Recipe:

    if not recipe.user_id:
        raise ValueError("User ID is required to save a recipe")
    
    try:
        # Convert recipe to dictionary
        recipe_dict = recipe.to_dict()
        
        # Check for potential duplicate recipes 
        # This prevents accidental double-saving of the same recipe
        current_time = datetime.now()
        five_minutes_ago = (current_time - timedelta(minutes=5)).isoformat()
        
        # Look for recently saved recipes with the same name
        potential_duplicates = recipes_collection.find({
            "user_id": recipe.user_id,
            "recipe_name": recipe.recipe_name,
            "saved_date": {"$gte": five_minutes_ago}
        })
        
        duplicates = list(potential_duplicates)
        if duplicates:
            logger.warning(f"Potential duplicate recipe detected: {recipe.recipe_name}")
            
            # If there's a duplicate, update its timestamp and return it
            existing_recipe = Recipe.from_dict(duplicates[0])
            logger.info(f"Using existing recipe: {existing_recipe.id}")
            return existing_recipe
        
        # If no duplicate found, insert or update recipe in MongoDB
        # Using upsert=True to either insert a new document or update an existing one
        result = recipes_collection.update_one(
            {"id": recipe.id, "user_id": recipe.user_id}, 
            {"$set": recipe_dict},
            upsert=True
        )
        
        logger.info(f"Recipe saved: {recipe.recipe_name} with ID {recipe.id}")
        return recipe
    except Exception as e:
        logger.error(f"Error saving recipe: {e}")
        raise


def get_user_recipes(user_id: str) -> List[Recipe]:

    try:
        # Find all recipes for this user
        cursor = recipes_collection.find({"user_id": user_id})
        
        # Convert to Recipe objects
        recipes = [Recipe.from_dict(doc) for doc in cursor]
        
        # Sort by saved date (newest first)
        recipes.sort(key=lambda r: r.saved_date, reverse=True)
        
        logger.info(f"Retrieved {len(recipes)} recipes for user {user_id}")
        return recipes
    except Exception as e:
        logger.error(f"Error retrieving recipes: {e}")
        return []


def get_recipe_by_id(user_id: str, recipe_id: str) -> Optional[Recipe]:

    try:
        # Find recipe by ID and user_id
        doc = recipes_collection.find_one({"id": recipe_id, "user_id": user_id})
        
        if doc:
            logger.info(f"Retrieved recipe {recipe_id}")
            return Recipe.from_dict(doc)
        else:
            logger.warning(f"Recipe {recipe_id} not found for user {user_id}")
            return None
    except Exception as e:
        logger.error(f"Error retrieving recipe {recipe_id}: {e}")
        return None


def update_recipe(recipe: Recipe) -> Recipe:

    if not recipe.user_id or not recipe.id:
        raise ValueError("User ID and Recipe ID are required to update a recipe")
    
    try:
        # Convert recipe to dictionary
        recipe_dict = recipe.to_dict()
        
        # Update recipe in MongoDB
        result = recipes_collection.update_one(
            {"id": recipe.id, "user_id": recipe.user_id},
            {"$set": recipe_dict}
        )
        
        if result.matched_count == 0:
            logger.warning(f"Recipe {recipe.id} not found for update")
            raise ValueError(f"Recipe with ID {recipe.id} not found")
        
        logger.info(f"Recipe {recipe.id} updated")
        return recipe
    except Exception as e:
        logger.error(f"Error updating recipe {recipe.id}: {e}")
        raise


def delete_recipe(user_id: str, recipe_id: str) -> bool:

    try:
        # Delete recipe from MongoDB
        result = recipes_collection.delete_one({"id": recipe_id, "user_id": user_id})
        
        if result.deleted_count == 0:
            logger.warning(f"Recipe {recipe_id} not found for deletion")
            return False
        
        logger.info(f"Recipe {recipe_id} deleted")
        return True
    except Exception as e:
        logger.error(f"Error deleting recipe {recipe_id}: {e}")
        return False


def toggle_favorite(user_id: str, recipe_id: str, is_favorite: bool) -> Optional[Recipe]:

    try:
        # Find the recipe in MongoDB
        result = recipes_collection.find_one({"user_id": user_id, "id": recipe_id})
        if not result:
            logger.warning(f"Recipe {recipe_id} not found for user {user_id}")
            return None
        
        # Update favorite status
        recipes_collection.update_one(
            {"user_id": user_id, "id": recipe_id},
            {"$set": {"is_favorite": is_favorite}}
        )
        
        # Get updated recipe
        updated_result = recipes_collection.find_one({"user_id": user_id, "id": recipe_id})
        return Recipe.from_dict(updated_result)
    except Exception as e:
        logger.error(f"Error toggling favorite status: {e}")
        return None


def toggle_shared(user_id: str, recipe_id: str, is_shared: bool) -> Optional[Recipe]:

    try:
        # Find the recipe in MongoDB
        result = recipes_collection.find_one({"user_id": user_id, "id": recipe_id})
        if not result:
            logger.warning(f"Recipe {recipe_id} not found for user {user_id}")
            return None
        
        # Update shared status
        recipes_collection.update_one(
            {"user_id": user_id, "id": recipe_id},
            {"$set": {"is_shared": is_shared}}
        )
        
        # Get updated recipe
        updated_result = recipes_collection.find_one({"user_id": user_id, "id": recipe_id})
        return Recipe.from_dict(updated_result)
    except Exception as e:
        logger.error(f"Error toggling shared status: {e}")
        return None


def get_shared_recipes() -> List[Recipe]:

    try:
        # Find all shared recipes
        cursor = recipes_collection.find({"is_shared": True})
        
        # Convert to Recipe objects
        recipes = [Recipe.from_dict(doc) for doc in cursor]
        
        # Sort by saved date (newest first)
        recipes.sort(key=lambda x: x.saved_date, reverse=True)
        
        return recipes
    except Exception as e:
        logger.error(f"Error getting shared recipes: {e}")
        return [] 