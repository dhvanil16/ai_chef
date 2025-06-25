"""
Main Backend Server: 

This file implements the FastAPI server that handles:
1. Recipe generation from direct query, ingredients and preferences
2. Recipe retrieval and processing 
3. Integration with LLM for recipe creation

"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List
from langchain_openai import OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama import ChatOllama
from langchain_community.vectorstores import FAISS
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain.output_parsers import PydanticOutputParser
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from gemini_integration import extract_ingredients_from_image
from image_gen import router as image_gen_router

from fastapi.responses import StreamingResponse
from huggingface_hub import InferenceClient
from PIL import Image
import io
import base64

import os
from dotenv import load_dotenv

from fastapi.middleware.cors import CORSMiddleware

# Import recipe API router
from recipe_api import router as recipe_router
from assistant_api import router as assistant_router  # Import the assistant router

# Load API key from .env file
load_dotenv()

# Track LangChain project
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_ENDPOINT"] = "https://api.smith.langchain.com"
os.environ["LANGCHAIN_API_KEY"] = os.getenv("LANGCHAIN_API_KEY")
os.environ["LANGCHAIN_PROJECT"] = os.getenv("LANGCHAIN_PROJECT")
os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY")

app = FastAPI(title="AI Chef - Recipe Generator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],  # Add all possible frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,  # Cache preflight requests for 10 minutes
)

# Include recipe API router
app.include_router(recipe_router)

# Include assistant API router
app.include_router(assistant_router)

# Initialize embedding model and load FAISS vector store
embedding_model = OpenAIEmbeddings(model="text-embedding-3-small")
vector_db = FAISS.load_local("faiss_index", embedding_model, allow_dangerous_deserialization=True)
retriever = vector_db.as_retriever(search_type="similarity", search_kwargs={"k": 3})

# Load your language model (using Google Gemini Pro here)
llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro")

# ------------------------------
# Pydantic Models
# ------------------------------
class Recipe(BaseModel):
   
    #Structured representation of a complete recipe

    recipe_name: str
    ingredients: List[str]
    instructions: List[str]
    cooking_tips: List[str]

recipe_output_parser = PydanticOutputParser(pydantic_object=Recipe)

class RecipeSuggestion(BaseModel):
    #Short recipe suggestion with name and brief description
    recipe_name: str
    description: str

class RecipeSuggestions(BaseModel):
    #Container for multiple recipe suggestions
    suggestions: List[RecipeSuggestion]

suggestion_output_parser = PydanticOutputParser(pydantic_object=RecipeSuggestions)

# ------------------------------
# Helper Function for Preferences
# ------------------------------
def build_retrieval_query(ingredients, meal_type, cuisine_type, serving_size, dietary_preference, cooking_time, difficulty):
   
    #Constructs a natural language query for the retrieval system based on user preferences
    query = (
        f"Suggest a {difficulty.lower()} {meal_type.lower()} recipe in {cuisine_type.lower()} style "
        f"using {ingredients}."
    )
    if dietary_preference.strip().lower() != "none":
        query += f" Ensure the recipe is {dietary_preference.lower()} friendly."
    query += f" Target serving size is {serving_size} people and cooking time around {cooking_time} minutes."
    return query

# ------------------------------
# Include the Gemini image generation router
# ------------------------------
app.include_router(image_gen_router)

# ------------------------------
# Direct Query Endpoint 
# ------------------------------
class DirectQueryRequest(BaseModel):
    #Model for free-text recipe queries
    query: str

@app.post("/recipe/direct")
def direct_query(request: DirectQueryRequest):
    direct_prompt = """
    You are Cooking Chef, an expert culinary assistant specializing in recipe generation.

    <context>{context}</context>
    User Query: {input}

    Based on the user query and provided context, generate a complete recipe in valid JSON format.

    The JSON object MUST contain the following keys with appropriate values:
    1. "recipe_name" (string): The name of the dish
    2. "ingredients" (array of strings): Each ingredient with its measurement
    3. "instructions" (array of strings): Step-by-step cooking instructions 
    4. "cooking_tips" (array of strings): Helpful cooking advice

    Your output MUST be a valid JSON object with all four required keys. Do not include any explanations or additional text.
    """
    direct_chat_prompt = ChatPromptTemplate.from_template(direct_prompt)
    document_chain = create_stuff_documents_chain(llm, direct_chat_prompt, output_parser=recipe_output_parser)
    retrieval_chain = create_retrieval_chain(retriever, document_chain)

    result = retrieval_chain.invoke({"input": request.query})
    return {
        "recipe": result["answer"].dict(),
        "context": [doc.page_content for doc in result.get("context", [])]
    }

# ------------------------------
# Endpoint: Direct Query with Image
# ------------------------------
@app.post("/recipe/direct_with_image")
async def direct_query_with_image(
    file: UploadFile = File(...),
    user_query: str = Form(...)
):
    # Read the image bytes
    image_bytes = await file.read()
    
    # Extract ingredients from the image
    ingredients_list = extract_ingredients_from_image(image_bytes)
    
    # Combine the user's query with the extracted ingredients as additional context
    combined_input = f"{user_query} ingredients: {ingredients_list}"
    
    # Use the same prompt structure as the direct endpoint
    direct_prompt = """
    You are Cooking Chef, an expert culinary assistant specializing in recipe generation.

    <context>{context}</context>
    User Query: {input}

    Based on the user query and provided context, generate a complete recipe in valid JSON format.

    The JSON object MUST contain the following keys with appropriate values:
    1. "recipe_name" (string): The name of the dish
    2. "ingredients" (array of strings): Each ingredient with its measurement
    3. "instructions" (array of strings): Step-by-step cooking instructions 
    4. "cooking_tips" (array of strings): Helpful cooking advice

    Your output MUST be a valid JSON object with all four required keys. Do not include any extra text.
    """
    direct_chat_prompt = ChatPromptTemplate.from_template(direct_prompt)
    document_chain = create_stuff_documents_chain(llm, direct_chat_prompt, output_parser=recipe_output_parser)
    retrieval_chain = create_retrieval_chain(retriever, document_chain)

    result = retrieval_chain.invoke({"input": combined_input})
    # Return the final JSON with detected_ingredients
    return {
        "detected_ingredients": [
            ing.strip() for ing in ingredients_list.split(",") if ing.strip()
        ],
        "recipe": result["answer"].dict(),
        "context": [doc.page_content for doc in result.get("context", [])]
    }
# ------------------------------
# Recipe Suggestions Endpoint (Existing)
# ------------------------------
class RecipeSuggestionsRequest(BaseModel):
    
    #Model for structured recipe requests with specific parameters
    ingredients: str
    meal_type: str
    cuisine_type: str
    serving_size: int
    dietary_preference: str
    cooking_time: int
    difficulty: str

@app.post("/recipe/suggestions")
def recipe_suggestions(request: RecipeSuggestionsRequest):
    retrieval_query = build_retrieval_query(
        request.ingredients,
        request.meal_type,
        request.cuisine_type,
        request.serving_size,
        request.dietary_preference,
        request.cooking_time,
        request.difficulty
    )

    prompt = """
        You are Cooking Chef, an expert culinary assistant specializing in recipe generation. Your task is to generate recipe suggestions.
        
        <context>{context}</context>
        User Query: {input}

        Generate "Recipe Suggestions" based on the provided context. Populate the JSON object as follows:
        - "suggestions": An array of objects, each containing:
            - "recipe_name": A string with the name of the recipe.
            - "description": A string with a short description for the recipe.

        Ensure that the JSON output is valid and includes the "suggestions" key with at least one suggestion (if available). If no suggestions are available, output an empty array.
        """
    chat_prompt = ChatPromptTemplate.from_template(prompt)
    document_chain = create_stuff_documents_chain(llm, chat_prompt, output_parser=suggestion_output_parser)
    retrieval_chain = create_retrieval_chain(retriever, document_chain)

    result = retrieval_chain.invoke({"input": retrieval_query})

    return {
        "suggestions": result["answer"].dict(),
        "context": [doc.page_content for doc in result.get("context", [])]
    }

# ------------------------------
# Full Recipe Generation Endpoint (Existing)
# ------------------------------
class FullRecipeRequest(BaseModel):
    #Request for a full recipe based on a suggestion name
    selected_recipe: str

@app.post("/recipe/full")
def full_recipe(request: FullRecipeRequest):
    retrieval_query = f"How to make {request.selected_recipe}"

    prompt = """
    You are Cooking Chef, an expert culinary assistant specializing in recipe generation.

    <context>{context}</context>
    User Query: {input}

    Based on the user query and provided context, generate a complete recipe in valid JSON format.

    The JSON object MUST contain the following keys with appropriate values:
    1. "recipe_name" (string): The name of the dish
    2. "ingredients" (array of strings): Each ingredient with its measurement
    3. "instructions" (array of strings): Step-by-step cooking instructions 
    4. "cooking_tips" (array of strings): Helpful cooking advice

    Your output MUST be a valid JSON object with all four required keys. Do not include any extra text.
    """
    custom_chat_prompt = ChatPromptTemplate.from_template(prompt)
    document_chain = create_stuff_documents_chain(llm, custom_chat_prompt, output_parser=recipe_output_parser)
    retrieval_chain = create_retrieval_chain(retriever, document_chain)

    result = retrieval_chain.invoke({"input": retrieval_query})
    return {
        "recipe": result["answer"].dict(),
        "context": [doc.page_content for doc in result.get("context", [])]
    }

# ------------------------------
# Reload FAISS Index Endpoint (Existing)
# ------------------------------
@app.post("/reload_index")
def reload_index():
    global retriever
    new_vector_db = FAISS.load_local("faiss_index", embedding_model, allow_dangerous_deserialization=True)
    retriever = new_vector_db.as_retriever(search_type="similarity", search_kwargs={"k": 3})
    return {"status": "Index reloaded"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("chef_back:app", host="0.0.0.0", port=8000, reload=True)
