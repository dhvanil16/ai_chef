#Database config: choose file or MongoDB storage.

STORAGE_TYPE = "mongo"
MONGO_URI = "mongodb://localhost:27017/"  # MongoDB connection string
DB_NAME = "ai_chef"                        # Database name
RECIPES_COLLECTION = "recipes"             # Collection name for recipes

# Logging configuration
LOG_LEVEL = "INFO"  # Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL) 