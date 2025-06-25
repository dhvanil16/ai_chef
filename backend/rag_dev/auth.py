"""
Authentication Module:

This module handles user authentication via Auth0, including:
1. JWT token validation
2. User information extraction
3. Authentication middleware for FastAPI

"""

import json
import logging
import requests
import os
from typing import Optional, List, Dict, Any
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, jwk, jwe
from jose.exceptions import JWTError, JWEError
from jose.utils import base64url_decode
import time

# Configure logging
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger("auth")

# Auth0 configuration
AUTH0_DOMAIN = "ai-chef.uk.auth0.com"  # Auth0 tenant domain
API_AUDIENCE = "https://ai-chef-api"   # API identifier in Auth0
ALGORITHMS = ["RS256", "HS256", "dir"]  # Supported JWT algorithms

# Development mode flag - set to True to bypass authentication
DEV_MODE = os.environ.get("AUTH_DEV_MODE", "true").lower() == "true"
if DEV_MODE:
    logger.warning("DEVELOPMENT MODE ENABLED - Authentication checks!")

# Cache for JSON Web Key Set (JWKS)
_jwks_cache = {"keys": [], "timestamp": 0}
_CACHE_TTL = 3600  # Cache TTL in seconds (1 hour)

# JWT token security scheme for FastAPI
security = HTTPBearer(auto_error=False)

class User:
    
    #User model representing an authenticated user
    def __init__(self, sub: str, email: Optional[str] = None, name: Optional[str] = None):
        self.id = sub
        self.email = email
        self.name = name

def get_jwks() -> Dict[str, Any]:
    
    #Get JSON Web Key Set (JWKS) from Auth0 with caching
    global _jwks_cache
    
    # Check if cache is valid
    now = time.time()
    if _jwks_cache["keys"] and now - _jwks_cache["timestamp"] < _CACHE_TTL:
        logger.info("Using cached JWKS")
        return _jwks_cache
    
    # Fetch fresh JWKS
    jwks_url = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
    logger.info(f"Fetching JWKS from {jwks_url}")
    
    try:
        response = requests.get(jwks_url)
        response.raise_for_status()
        jwks = response.json()
        _jwks_cache = {"keys": jwks["keys"], "timestamp": now}
        logger.info(f"JWKS updated with {len(jwks['keys'])} keys")
        return jwks
    except Exception as e:
        logger.error(f"Failed to fetch JWKS: {str(e)}")
        # Return empty JWKS if request fails
        return {"keys": []}

async def get_token_from_header(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[str]:
    
    #Extract the JWT token from the authorization header
    if credentials:
        return credentials.credentials
    return None

async def get_user(request: Request, token: Optional[str] = Depends(get_token_from_header)) -> User:
    
    #Verify the JWT token and extract user information
    # Check if token exists
    if not token:
        if DEV_MODE:
            # In development mode, provide a default user
            logger.warning("No token provided, but using development mode fallback")
            return User(
                sub="dev-user-123",
                email="dev@example.com",
                name="Development User"
            )
        else:
            logger.warning("No token provided")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
    
    try:
        logger.info(f"Received token starting with: {token[:10]}...")
        
        # Try with userinfo endpoint first
        try:
            userinfo_url = f"https://{AUTH0_DOMAIN}/userinfo"
            headers = {"Authorization": f"Bearer {token}"}
            logger.info(f"Validating token using userinfo endpoint: {userinfo_url}")
            
            response = requests.get(userinfo_url, headers=headers)
            if response.status_code == 200:
                userinfo = response.json()
                logger.info(f"Token validated via userinfo endpoint: {userinfo}")
                
                # Extract user information from userinfo response
                user = User(
                    sub=userinfo.get("sub"),
                    email=userinfo.get("email"),
                    name=userinfo.get("name")
                )
                
                logger.info(f"Authenticated user: {user.id}")
                return user
            else:
                logger.warning(f"Token validation failed via userinfo: {response.status_code}")
                # Continue with other methods if userinfo fails
        except Exception as e:
            logger.warning(f"Error validating token via userinfo: {str(e)}")
            # Continue with other methods
        
        # Try to parse token header
        try:
            header = jwt.get_unverified_header(token)
            logger.info(f"Token header: {header}")
        except Exception as e:
            logger.error(f"Failed to parse token header: {str(e)}")
            if DEV_MODE:
                # In development mode, provide a default user
                logger.warning("Token header parsing failed, but using development mode fallback")
                return User(
                    sub="dev-user-123",
                    email="dev@example.com",
                    name="Development User"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token format"
                )
        
        # Try standard JWT validation for tokens with 'kid'
        if 'kid' in header:
            try:
                # Get JWKS
                jwks = get_jwks()
                
                # Find key in JWKS
                rsa_key = {}
                for key in jwks.get("keys", []):
                    if key["kid"] == header["kid"]:
                        rsa_key = key
                        break
                
                if rsa_key:
                    try:
                        # Decode and verify JWT
                        payload = jwt.decode(
                            token,
                            key=json.dumps(rsa_key),
                            algorithms=ALGORITHMS,
                            audience=API_AUDIENCE,
                            issuer=f"https://{AUTH0_DOMAIN}/"
                        )
                        logger.info("Token successfully verified")
                        
                        # Extract user information
                        sub = payload.get("sub")
                        if sub:
                            # Create user object
                            user = User(
                                sub=sub,
                                email=payload.get("email"),
                                name=payload.get("name")
                            )
                            logger.info(f"Authenticated user: {sub}")
                            return user
                    except Exception as e:
                        logger.error(f"JWT verification failed: {str(e)}")
                        # Fall through to next validation method
            except Exception as e:
                logger.error(f"Error in JWT validation with JWKS: {str(e)}")
                # Fall through to development mode check
        
        # If we get here, all validation methods have failed
        if DEV_MODE:
            # In development mode, provide a default user
            logger.warning("⚠️ All token validation methods failed, but using development mode fallback")
            return User(
                sub="dev-user-123",
                email="dev@example.com",
                name="Development User"
            )
        else:
            # In production, raise an error
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed: Invalid token"
            )
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected authentication error: {str(e)}")
        if DEV_MODE:
            # In development mode, provide a default user
            logger.warning(f"⚠️ Unexpected error: {str(e)}, but using development mode fallback")
            return User(
                sub="dev-user-123",
                email="dev@example.com",
                name="Development User"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Authentication error: {str(e)}"
            ) 