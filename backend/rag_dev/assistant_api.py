#FastAPI routes for the AI Chef Assistant.

from fastapi import APIRouter, HTTPException, status, Request, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import logging
import json
import os
import uuid

from auth import get_user, User
from database.storage_factory import get_recipe_by_id

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("assistant_api")

# Create router
router = APIRouter(prefix="/assistant", tags=["assistant"])

# Models for request and response
class AssistantRequest(BaseModel):
    message: str
    sessionId: str
    recipe: Dict[str, Any]
    currentStep: int = 0

class AssistantResponse(BaseModel):
    response: str
    currentStep: int = 0

# Recipe step tracking
recipe_sessions = {}

def process_recipe_context(session_id, message, recipe, current_step):
    
    #Process the recipe context based on user message
    # Check if session exists
    session_exists = session_id in recipe_sessions
    
    # If session exists, check if recipe has changed
    if session_exists and recipe_sessions[session_id].get("recipe", {}).get("id") != recipe.get("id"):
        # Recipe changed, force reset the session
        logger.info(f"Recipe changed in session {session_id}, resetting session state")
        session_exists = False
    
    # Initialize session data if not exists or reset needed
    if not session_exists:
        recipe_sessions[session_id] = {
            "recipe": recipe,
            "current_step": current_step,
            "stage": "intro"  # intro, ingredients, steps, finished
        }
    
    session_data = recipe_sessions[session_id]
    recipe = session_data["recipe"]
    current_step = session_data["current_step"]
    stage = session_data["stage"]
    
    # Simple intent detection
    affirmative_responses = ["yes", "yeah", "sure", "okay", "ok", "yep", "ready"]
    negative_responses = ["no", "nope", "not now", "later", "wait"]
    completion_responses = ["done", "finished", "complete", "completed", "next", "ready for next", "i'm done", "i am done", "that's done", "that is done"]
    
    message_lower = message.lower()
    
    # Check if message contains different types of responses
    is_affirmative = any(resp in message_lower for resp in affirmative_responses)
    is_negative = any(resp in message_lower for resp in negative_responses)
    is_completed = any(resp in message_lower for resp in completion_responses)
    
    # Treat completion responses as affirmative in steps stage
    if stage == "steps" and is_completed:
        is_affirmative = True
    
    # Handle different stages of the cooking process
    if stage == "intro":
        if is_affirmative:
            # Move to ingredients stage
            session_data["stage"] = "ingredients"
            ingredients_text = "\n".join([f"- {ingredient}" for ingredient in recipe["ingredients"]])
            return f"Great! Let's gather the ingredients for {recipe['recipe_name']}:\n\n{ingredients_text}\n\nDo you have all these ingredients ready?", current_step
        elif is_negative:
            return f"No problem! When you're ready to cook {recipe['recipe_name']}, just let me know.", current_step
        else:
            return f"I'm your cooking assistant for {recipe['recipe_name']}. Are you ready to start cooking?", current_step
    
    elif stage == "ingredients":
        if is_affirmative or is_completed:
            # Move to steps stage
            session_data["stage"] = "steps"
            return f"Perfect! Let's start cooking. First step: {recipe['instructions'][0]}. Let me know when you've completed this step.", 0
        elif is_negative:
            return "Take your time gathering the ingredients. Let me know when you're ready to proceed.", current_step
        else:
            ingredients_text = "\n".join([f"- {ingredient}" for ingredient in recipe["ingredients"]])
            return f"Please gather these ingredients:\n\n{ingredients_text}\n\nLet me know when you have everything ready.", current_step
    
    elif stage == "steps":
        if is_affirmative or is_completed:
            # Move to next step
            next_step = current_step + 1
            session_data["current_step"] = next_step
            
            if next_step < len(recipe["instructions"]):
                return f"Great job! Next step: {recipe['instructions'][next_step]}. Let me know when you're done.", next_step
            else:
                # All steps completed
                session_data["stage"] = "finished"
                
                cooking_tips = ""
                if recipe.get("cooking_tips") and len(recipe["cooking_tips"]) > 0:
                    cooking_tips = "\n\nHere are some tips:\n" + "\n".join([f"- {tip}" for tip in recipe["cooking_tips"]])
                
                return f"Congratulations! You've completed all the steps for {recipe['recipe_name']}. Enjoy your meal!{cooking_tips}", next_step
        elif is_negative or "repeat" in message_lower:
            # Repeat current step
            return f"Let me repeat: {recipe['instructions'][current_step]}. Let me know when you're done.", current_step
        else:
            return f"I'm waiting for you to complete the step: {recipe['instructions'][current_step]}. Have you done this?", current_step
    
    elif stage == "finished":
        if "start" in message_lower or "again" in message_lower:
            # Restart the recipe
            session_data["stage"] = "intro"
            session_data["current_step"] = 0
            return f"Let's start cooking {recipe['recipe_name']} again. Are you ready?", 0
        else:
            cooking_tips = ""
            if recipe.get("cooking_tips") and len(recipe["cooking_tips"]) > 0:
                cooking_tips = "\n\nHere are some tips:\n" + "\n".join([f"- {tip}" for tip in recipe["cooking_tips"]])
            
            return f"You've already completed all steps for {recipe['recipe_name']}. Enjoy your meal!{cooking_tips} If you want to start again, just let me know.", current_step
    
    # Default response
    return f"I'm not sure how to help with that. Would you like to continue with the recipe?", current_step

@router.post("", response_model=AssistantResponse)
async def process_assistant_message(request: Request, assistant_request: AssistantRequest):
    
    #Process a message from the AI Chef Assistant

    try:
        logger.info(f"Processing assistant message: {assistant_request.message}")
        logger.info(f"Session ID: {assistant_request.sessionId}")
        logger.info(f"Recipe: {assistant_request.recipe.get('recipe_name')} (ID: {assistant_request.recipe.get('id')})")
        logger.info(f"Current step: {assistant_request.currentStep}")
        
        response_text, new_step = process_recipe_context(
            assistant_request.sessionId,
            assistant_request.message,
            assistant_request.recipe,
            assistant_request.currentStep
        )
        
        logger.info(f"Response: {response_text}")
        logger.info(f"New step: {new_step}")
        
        return AssistantResponse(
            response=response_text,
            currentStep=new_step
        )
    
    except Exception as e:
        logger.error(f"Error processing assistant message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Assistant error: {str(e)}"
        ) 