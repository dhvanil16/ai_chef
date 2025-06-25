import os
import io
import base64
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google import genai
from google.genai import types
from PIL import Image

# import os
# import io
# import base64
# from fastapi import APIRouter, HTTPException
# from pydantic import BaseModel
# import google.generativeai as genai
# from PIL import Image

router = APIRouter()

class ImageGenerationRequest(BaseModel):
    prompt: str

@router.post("/recipe/generate_image_gemini")
def generate_recipe_image_gemini(request: ImageGenerationRequest):
    """
    Uses Imagen 3 via the Gemini API to generate images from a prompt,
    and returns the result as Base64-encoded images.
    """
    try:
        # Get the Gemini API key from the environment
        gemini_key = os.getenv("GOOGLE_API_KEY")
        if not gemini_key:
            raise HTTPException(status_code=500, detail="Missing GOOGLE_API_KEY environment variable")
        
        # Initialize the Gemini client using your API key
        client = genai.Client(api_key=gemini_key)
        
        # Use the provided prompt for generating content
        prompt = request.prompt
        
        try:
            # Use the Imagen 3 model for image generation
            response = client.models.generate_images(
                model='imagen-3.0-generate-002',  # Use specific Imagen 3 model version
                prompt=prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,  # Generate only one image
                    aspect_ratio="1:1" # Optional: Specify aspect ratio
                )
            )
        except Exception as e:
            # Handle specific API errors
            error_detail = str(e)
            print(f"Imagen API error: {error_detail}")
            raise HTTPException(status_code=500, detail=f"Imagen API error: {error_detail}")
        
        # Parse the response to extract image parts
        images_b64 = []
        
        # Check if generated_images exist
        if not hasattr(response, 'generated_images') or len(response.generated_images) == 0:
            print("No images found in the Imagen response")
            return {"text": ["No image generated"], "images": []} # Return empty image list
        
        # Process the generated image(s)
        for generated_image in response.generated_images:
            if hasattr(generated_image, 'image') and hasattr(generated_image.image, 'image_bytes'):
                try:
                    # Convert the raw image bytes into a PIL Image
                    img_bytes = generated_image.image.image_bytes
                    img_pil = Image.open(io.BytesIO(img_bytes))
                    
                    # Optionally, resize the image
                    img_pil = img_pil.resize((256, 256), resample=Image.LANCZOS)
                    
                    # Convert the PIL Image to a Base64 string
                    buf = io.BytesIO()
                    img_pil.save(buf, format="PNG")
                    image_bytes_b64 = buf.getvalue()
                    encoded_image = base64.b64encode(image_bytes_b64).decode("utf-8")
                    images_b64.append(encoded_image)
                except Exception as img_err:
                    print(f"Error processing image: {img_err}")
                    # Continue with other parts
            else:
                 print("Generated image object missing expected attributes")

        # Imagen 3 doesn't return text parts like Gemini Flash
        return {"text": [], "images": images_b64}
    
    except HTTPException as http_ex:
        # Re-raise HTTP exceptions
        raise http_ex
    except Exception as e:
        # Catch all other exceptions
        error_message = f"Unexpected error in image generation: {str(e)}"
        print(error_message)
        raise HTTPException(status_code=500, detail=error_message)
