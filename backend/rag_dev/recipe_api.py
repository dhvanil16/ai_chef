#FastAPI routes for recipe CRUD and community access.

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from typing import List, Optional
import logging

from auth import get_user, User
from database.storage_factory import (
    Recipe as StorageRecipe,
    save_recipe,
    get_user_recipes,
    get_recipe_by_id,
    delete_recipe,
    toggle_favorite,
    toggle_shared,
    get_shared_recipes
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("recipe_api")

# Create router
router = APIRouter(prefix="/recipes", tags=["recipes"])

# Pydantic models for API
class RecipeBase(BaseModel):
    recipe_name: str
    ingredients: List[str]
    instructions: List[str]
    cooking_tips: Optional[List[str]] = None

class RecipeCreate(RecipeBase):
    pass

class RecipeResponse(RecipeBase):
    id: str
    user_id: str
    user_email: Optional[str] = None
    is_favorite: bool
    saved_date: str
    is_shared: bool

class FavoriteUpdate(BaseModel):
    is_favorite: bool

class SharedUpdate(BaseModel):
    is_shared: bool

# API endpoints
@router.post("/save", response_model=RecipeResponse)
async def create_recipe(request: Request, recipe: RecipeCreate, user: User = Depends(get_user)):
    """Save a new recipe"""
    logger.info(f"Saving recipe: {recipe.recipe_name}")
    logger.info(f"User ID: {user.id}")
    
    # Extract additional fields if they're present in the request data
    request_data = await request.json()
    recipe_id = request_data.get('id')
    
    # Log if an ID was provided
    if recipe_id:
        logger.info(f"Recipe ID provided: {recipe_id}")
    
    # Convert API model to storage model
    storage_recipe = StorageRecipe(
        id=recipe_id,  # Use the provided ID if available
        recipe_name=recipe.recipe_name,
        ingredients=recipe.ingredients,
        instructions=recipe.instructions,
        cooking_tips=recipe.cooking_tips,
        user_id=user.id,
        user_email=user.email  # Include user email
    )
    
    # Save recipe
    saved_recipe = save_recipe(storage_recipe)
    logger.info(f"Recipe saved with ID: {saved_recipe.id}")
    
    # Convert back to API model
    return RecipeResponse(
        id=saved_recipe.id,
        recipe_name=saved_recipe.recipe_name,
        ingredients=saved_recipe.ingredients,
        instructions=saved_recipe.instructions,
        cooking_tips=saved_recipe.cooking_tips,
        user_id=saved_recipe.user_id,
        user_email=saved_recipe.user_email,
        is_favorite=saved_recipe.is_favorite,
        saved_date=saved_recipe.saved_date,
        is_shared=saved_recipe.is_shared
    )

@router.get("/user", response_model=List[RecipeResponse])
async def get_recipes(request: Request, user: User = Depends(get_user)):
    """Get all recipes for the authenticated user"""
    logger.info(f"Getting recipes for user: {user.id}")
    
    # Get recipes from storage
    recipes = get_user_recipes(user.id)
    logger.info(f"Found {len(recipes)} recipes")
    
    # Convert to API model
    return [
        RecipeResponse(
            id=recipe.id,
            recipe_name=recipe.recipe_name,
            ingredients=recipe.ingredients,
            instructions=recipe.instructions,
            cooking_tips=recipe.cooking_tips,
            user_id=recipe.user_id,
            user_email=recipe.user_email,
            is_favorite=recipe.is_favorite,
            saved_date=recipe.saved_date,
            is_shared=recipe.is_shared
        )
        for recipe in recipes
    ]

@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_recipe(recipe_id: str, user: User = Depends(get_user)):
    """Delete a recipe"""
    logger.info(f"Deleting recipe {recipe_id} for user {user.id}")
    
    # Check if recipe exists and belongs to user
    recipe = get_recipe_by_id(user.id, recipe_id)
    if not recipe:
        logger.warning(f"Recipe {recipe_id} not found for user {user.id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found"
        )
    
    # Delete recipe
    success = delete_recipe(user.id, recipe_id)
    if not success:
        logger.error(f"Failed to delete recipe {recipe_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete recipe"
        )
    
    logger.info(f"Recipe {recipe_id} deleted successfully")

@router.post("/{recipe_id}/favorite", response_model=RecipeResponse)
async def update_favorite(recipe_id: str, favorite_update: FavoriteUpdate, user: User = Depends(get_user)):
    """Toggle favorite status of a recipe"""
    logger.info(f"Toggling favorite status for recipe {recipe_id}, user {user.id}, value: {favorite_update.is_favorite}")
    
    # Update favorite status
    updated_recipe = toggle_favorite(user.id, recipe_id, favorite_update.is_favorite)
    
    if not updated_recipe:
        logger.warning(f"Recipe {recipe_id} not found for user {user.id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found"
        )
    
    logger.info(f"Recipe {recipe_id} favorite status updated to {updated_recipe.is_favorite}")
    
    # Convert to API model
    return RecipeResponse(
        id=updated_recipe.id,
        recipe_name=updated_recipe.recipe_name,
        ingredients=updated_recipe.ingredients,
        instructions=updated_recipe.instructions,
        cooking_tips=updated_recipe.cooking_tips,
        user_id=updated_recipe.user_id,
        user_email=updated_recipe.user_email,
        is_favorite=updated_recipe.is_favorite,
        saved_date=updated_recipe.saved_date,
        is_shared=updated_recipe.is_shared
    )

@router.post("/{recipe_id}/shared", response_model=RecipeResponse)
async def update_shared(recipe_id: str, shared_update: SharedUpdate, user: User = Depends(get_user)):
    """Toggle shared status of a recipe (make it visible to the community)"""
    logger.info(f"Toggling shared status for recipe {recipe_id}, user {user.id}, value: {shared_update.is_shared}")
    
    # Update shared status
    updated_recipe = toggle_shared(user.id, recipe_id, shared_update.is_shared)
    
    if not updated_recipe:
        logger.warning(f"Recipe {recipe_id} not found for user {user.id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found"
        )
    
    logger.info(f"Recipe {recipe_id} shared status updated to {updated_recipe.is_shared}")
    
    # Convert to API model
    return RecipeResponse(
        id=updated_recipe.id,
        recipe_name=updated_recipe.recipe_name,
        ingredients=updated_recipe.ingredients,
        instructions=updated_recipe.instructions,
        cooking_tips=updated_recipe.cooking_tips,
        user_id=updated_recipe.user_id,
        user_email=updated_recipe.user_email,
        is_favorite=updated_recipe.is_favorite,
        saved_date=updated_recipe.saved_date,
        is_shared=updated_recipe.is_shared
    )

@router.get("/community", response_model=List[RecipeResponse])
async def get_community_recipes():
    """Get all shared recipes from the community"""
    logger.info("Getting shared recipes from the community")
    
    # Get shared recipes from storage
    recipes = get_shared_recipes()
    logger.info(f"Found {len(recipes)} shared recipes")
    
    # Convert to API model
    return [
        RecipeResponse(
            id=recipe.id,
            recipe_name=recipe.recipe_name,
            ingredients=recipe.ingredients,
            instructions=recipe.instructions,
            cooking_tips=recipe.cooking_tips,
            user_id=recipe.user_id,
            user_email=recipe.user_email,
            is_favorite=recipe.is_favorite,
            saved_date=recipe.saved_date,
            is_shared=recipe.is_shared
        )
        for recipe in recipes
    ] 