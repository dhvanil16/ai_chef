import streamlit as st
import requests
import re
import base64
import io

st.set_page_config(page_title="AI Chef PoC", layout="wide")
st.title("🍳 AI Chef: Recipe Generator Proof-of-Concept")

# Add three tabs: Direct Query, Preference-Based Recipe, and Image-based Recipe
tabs = ["Direct Query", "Preference-Based Recipe", "Image-based Recipe"]
active_tab = st.sidebar.radio("Select Query Method", tabs)

# # -----------------------
# # 1) DIRECT QUERY TAB
# # -----------------------
# if active_tab == "Direct Query":
#     st.header("Direct Query")
#     query = st.text_area("Enter your cooking query", "What would you like to have today?")
    
#     if st.button("Generate Recipe (Direct Query)"):
#         with st.spinner("Generating recipe..."):
#             # Call the recipe generation endpoint
#             response = requests.post(
#                 "http://localhost:8000/recipe/direct", 
#                 json={"query": query}
#             )

#             if response.ok:
#                 data = response.json()
#                 recipe = data["recipe"]

#                 # Display the recipe details
#                 st.subheader(f"🍽️ {recipe['recipe_name']}")
#                 st.markdown("**Ingredients:**")
#                 for ingredient in recipe["ingredients"]:
#                     st.write(f"- {ingredient}")

#                 st.markdown("**Instructions:**")
#                 for i, step in enumerate(recipe["instructions"], start=1):
#                     st.write(f"{i}. {step}")

#                 st.markdown("**Cooking Tips:**")
#                 for tip in recipe["cooking_tips"]:
#                     st.write(f"- {tip}")

#                 with st.expander("Retrieved Chunks (Debug Info)"):
#                     for chunk in data.get("context", []):
#                         st.write(chunk)

#                 # Use the recipe name to create an image generation prompt.
#                 prompt = f"A delicious plate of {recipe['recipe_name']}"

#                 # Call your image generation endpoint
#                 image_response = requests.post(
#                     "http://localhost:8000/recipe/generate_image",
#                     json={"prompt": prompt}
#                 )

#                 if image_response.ok:
#                     # Parse the JSON response to get the Base64-encoded image
#                     data_img = image_response.json()
#                     encoded_image = data_img["image"]  # Base64 string

#                     # print("Response text:", image_response.text)

#                     # Decode the Base64 string back into raw bytes
#                     decoded_image = base64.b64decode(encoded_image)
#                     image_bytes = io.BytesIO(decoded_image)

#                     # Display the image with a caption
#                     st.image(image_bytes, caption=f"AI-generated image for {recipe['recipe_name']}")
#                 else:
#                     st.error(f"Error generating image: {image_response.text}")

#             else:
#                 st.error("Error generating recipe.")
#     else:
#         st.write("Enter a query and click the button to generate a recipe.")

# -----------------------
# 1) DIRECT QUERY TAB
# -----------------------
if active_tab == "Direct Query":
    st.header("Direct Query")
    query = st.text_area("Enter your cooking query", "What would you like to have today?")
    
    if st.button("Generate Recipe (Direct Query)"):
        with st.spinner("Generating recipe..."):
            # Call the recipe generation endpoint
            response = requests.post(
                "http://localhost:8000/recipe/direct", 
                json={"query": query}
            )

            if response.ok:
                data = response.json()
                recipe = data["recipe"]

                # Display the recipe details
                st.subheader(f"🍽️ {recipe['recipe_name']}")
                st.markdown("**Ingredients:**")
                for ingredient in recipe["ingredients"]:
                    st.write(f"- {ingredient}")

                st.markdown("**Instructions:**")
                for i, step in enumerate(recipe["instructions"], start=1):
                    st.write(f"{i}. {step}")

                st.markdown("**Cooking Tips:**")
                for tip in recipe["cooking_tips"]:
                    st.write(f"- {tip}")

                with st.expander("Retrieved Chunks (Debug Info)"):
                    for chunk in data.get("context", []):
                        st.write(chunk)

                # Use the recipe name to form a prompt for image generation via Gemini.
                # prompt = f"Generate a Image of a delicious plate of {recipe['recipe_name']}. Which is made from {recipe["ingredients"]}. Make this image realastic"
                # prompt = (
                #             f"Capture a mouthwatering plate of {recipe['recipe_name']} in a professional food photography style. "
                #             f"Arrange the dish with meticulous plating on a clean, modern tabletop. Use soft, natural lighting and "
                #             f"a shallow depth of field to subtly blur the background, drawing focus to the dish. Add a subtle AI-art flair—"
                #             f"such as a faint painterly glow or delicate highlights—to hint that it's not a standard photo, yet keep the "
                #             f"overall look polished and realistic. Present it as if it's ready for a gourmet magazine cover, "
                #             # f"showcasing the vibrant colors and texture of the ingredients: {', '.join(recipe['ingredients'])}."
                #         )

                prompt = (
                            f"Create a hyperrealistic, high-resolution,4K detail, meticulously styled photograph of a beautifully plated {recipe['recipe_name']} "
                            f"Use a 50mm prime lens at f/1.8 with soft natural lighting and shallow depth of field to blur the background. "
                            f"on a sleek, modern table. Use soft, diffused lighting to highlight the dish's textures, with a gentle bokeh "
                            f"background that keeps the focus on the meal. Show vibrant colors, crisp details, and a subtle digital-painting "
                            f"quality to convey an AI-generated aesthetic. The overall look should feel like professional food photography "
                            f"meets advanced AI artistry. Include hints of the key ingredients: {', '.join(recipe['ingredients'])}, "
                            f"arranged in an elegant presentation."
                        )


                image_response = requests.post(
                    "http://localhost:8000/recipe/generate_image_gemini",
                    json={"prompt": prompt}
                )

                if image_response.ok:
                    data_img = image_response.json()
                    # Check if there is at least one generated image
                    if data_img.get("images"):
                        # Use the first image returned
                        encoded_image = data_img["images"][0]
                        # Decode the Base64 string back into raw bytes
                        decoded_image = base64.b64decode(encoded_image)
                        image_bytes = io.BytesIO(decoded_image)
                        # Display the image with a caption
                        st.image(image_bytes, caption=f"AI-generated image for {recipe['recipe_name']}")
                    else:
                        st.warning("No image was generated by Gemini.")
                else:
                    st.error(f"Error generating image: {image_response.text}")

            else:
                st.error("Error generating recipe.")
    else:
        st.write("Enter a query and click the button to generate a recipe.")
# -------------------------------
# 2) PREFERENCE-BASED RECIPE TAB
# -------------------------------
elif active_tab == "Preference-Based Recipe":
    st.header("Preference-Based Recipe Generation")

    ingredients = st.text_area("Ingredients (comma-separated)", "What you have in your kitchen?")
    meal_type = st.selectbox("Meal Type", ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"])
    cuisine_type = st.selectbox("Cuisine Type", ["Italian", "Indian", "Chinese", "Mexican", "French", "Mediterranean", "Other"])
    serving_size = st.number_input("Serving Size", min_value=1, max_value=10, value=2)
    dietary_preference = st.selectbox("Dietary Preference", ["None", "Vegetarian", "Vegan", "Keto", "Gluten-Free", "Paleo"])
    cooking_time = st.slider("Cooking Time (minutes)", min_value=5, max_value=120, value=30, step=5)
    difficulty = st.selectbox("Difficulty Level", ["Easy", "Medium", "Hard"])

    if st.button("Get Recipe Suggestions"):
        with st.spinner("Generating recipe suggestions..."):
            payload = {
                "ingredients": ingredients,
                "meal_type": meal_type,
                "cuisine_type": cuisine_type,
                "serving_size": serving_size,
                "dietary_preference": dietary_preference,
                "cooking_time": cooking_time,
                "difficulty": difficulty
            }
            response = requests.post("http://localhost:8000/recipe/suggestions", json=payload)
            if response.ok:
                data = response.json()
                list_of_suggestions = data["suggestions"]["suggestions"]

                st.markdown("### Recipe Suggestions (Raw Text)")
                for item in list_of_suggestions:
                    st.markdown(f"- **{item['recipe_name']}**: {item['description']}")

                parsed_names = [item["recipe_name"] for item in list_of_suggestions]
                st.session_state.suggestions = parsed_names
            else:
                st.error("Error generating recipe suggestions.")

    if "suggestions" in st.session_state and st.session_state.suggestions:
        st.subheader("Select a Recipe from Suggestions")
        selected_recipe = st.selectbox("Choose a recipe", st.session_state.suggestions)

        if st.button("Generate Full Recipe"):
            with st.spinner("Generating full recipe..."):
                response = requests.post("http://localhost:8000/recipe/full", json={"selected_recipe": selected_recipe})
                if response.ok:
                    data = response.json()
                    recipe = data["recipe"]

                    st.subheader(f"🍽️ {recipe['recipe_name']}")
                    st.markdown("**Ingredients:**")
                    for ingredient in recipe["ingredients"]:
                        st.write(f"- {ingredient}")

                    st.markdown("**Instructions:**")
                    for i, step in enumerate(recipe["instructions"], start=1):
                        st.write(f"{i}. {step}")

                    st.markdown("**Cooking Tips:**")
                    for tip in recipe["cooking_tips"]:
                        st.write(f"- {tip}")

                    with st.expander("Retrieved Chunks (Debug Info)"):
                        for chunk in data.get("context", []):
                            st.markdown(chunk)
                else:
                    st.error("Error generating full recipe.")

# ----------------------------------
# 3) IMAGE-BASED RECIPE TAB (NEW)
# ----------------------------------
elif active_tab == "Image-based Recipe":
    st.header("Image-based Recipe Generation")

    uploaded_image = st.file_uploader("Upload an image of your ingredients", type=["jpg", "jpeg", "png"])
    user_query = st.text_area("Your Cooking Query", "What recipe can I make?")

    if st.button("Generate Recipe from Image"):
        if uploaded_image is not None and user_query.strip():
            with st.spinner("Generating recipe based on image..."):
                # Prepare the file upload; using a tuple with (filename, bytes, content-type)
                files = {
                    "file": (uploaded_image.name, uploaded_image.getvalue(), uploaded_image.type)
                }
                data = {"user_query": user_query}
                # Note: update the endpoint to match your backend's image-based endpoint
                response = requests.post("http://localhost:8000/recipe/direct_with_image", files=files, data=data)

                if response.ok:
                    result = response.json()

                    # Expecting the backend to return a list of detected ingredients and a recipe
                    detected_ingredients = result.get("detected_ingredients", [])
                    recipe = result.get("recipe", {})

                    st.markdown("**Detected Ingredients:**")
                    if detected_ingredients:
                        for ingredient in detected_ingredients:
                            st.write(f"- {ingredient}")
                    else:
                        st.write("No ingredients detected.")

                    st.subheader(f"🍽️ {recipe.get('recipe_name', 'Recipe')}")
                    st.markdown("**Ingredients:**")
                    for ingredient in recipe.get("ingredients", []):
                        st.write(f"- {ingredient}")

                    st.markdown("**Instructions:**")
                    for i, step in enumerate(recipe.get("instructions", []), 1):
                        st.write(f"{i}. {step}")

                    st.markdown("**Cooking Tips:**")
                    for tip in recipe.get("cooking_tips", []):
                        st.write(f"- {tip}")

                    with st.expander("Retrieved Chunks (Debug Info)"):
                        context = result.get("context", [])
                        for chunk in context:
                            st.markdown(chunk)
                else:
                    st.error("Error generating recipe from image.")
        else:
            st.warning("Please upload an image and enter your query.")
