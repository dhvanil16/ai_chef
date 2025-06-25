# Extract Ingredients From User Image.

import io
from PIL import Image
import google.generativeai as genai
import os
from dotenv import load_dotenv  # Import load_dotenv

# Load API key from .env file
load_dotenv()

# Configure Gemini API using the API key from the environment variables
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

def extract_ingredients_from_image(image_bytes: bytes) -> str:

    #Processes an image using Gemini Pro Vision to extract ingredients & Returns a comma-separated list of ingredient names.
    img = Image.open(io.BytesIO(image_bytes))
    
    # Construct the prompt for Gemini Pro Vision to extract ingredients
    prompt = (
        "Extract the list of ingredients shown in the image. "
        "Provide only a comma-separated list of ingredient names."
    )
    
    # Initialize the Gemini Pro Vision model
    model = genai.GenerativeModel('gemini-1.5-pro')
    
    # Generate response using the image and text prompt
    response = model.generate_content([prompt, img])
    
    return response.text
