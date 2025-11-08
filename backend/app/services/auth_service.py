# backend/app/services/auth_service.py

import datetime
from typing import Optional, Dict, Any, List
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import EmailStr
import httpx
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from google_auth_oauthlib.flow import Flow # <-- Still need this import

# --- Import our app's modules ---
from ..core.config_loader import settings
from ..models.user_model import User
from ..schemas.user_schema import TokenData, FinalizeSignup
from ..core.database import get_db
# --------------------------------

from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer

# --- Re-purpose OAuth2 scheme ---
# This will now be used to validate *our* app's JWT (the access token)
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/token", 
    auto_error=False
)

# --- Password Hashing Setup ---
# We still need this for ONE thing: to hash and verify our own refresh tokens.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- JWT Token Settings (from our config) ---
SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS

# --- Google Scopes ---
GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events"
GOOGLE_PROFILE_SCOPES = "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"

# --- Password Hashing (for our refresh token) ---
def verify_token_hash(plain_token: str, hashed_token: str) -> bool:
    """Verifies a plain-text token against a hashed token."""
    return pwd_context.verify(plain_token, hashed_token)

def get_token_hash(token: str) -> str:
    """Hashes a plain-text token."""
    return pwd_context.hash(token)

# --- 1. Google Auth URL Creation (THE FIX IS HERE) ---
def create_google_auth_url(scopes: List[str], redirect_uri: str) -> str:
    """
    Creates the Google OAuth consent screen URL using client IDs from config.
    """
    flow = Flow.from_client_config(
        client_config={
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri],
            }
        },
        scopes=scopes + ["openid"], # openid is required
        redirect_uri=redirect_uri
    )
    
    # --- THIS IS THE FIX ---
    # We ask for 'offline' access (to get a Refresh Token)
    # AND we add prompt='select_account' to force the user to choose.
    auth_url, _ = flow.authorization_url(
        access_type='offline',
        prompt='select_account' 
    )
    # -----------------------
    return auth_url
# ------------------------------------------------------------------------------------

# --- 2. Exchange Code for Google Tokens ---
async def exchange_google_code_for_tokens(code: str, redirect_uri: str) -> Dict[str, Any]:
    """
    Exchanges the one-time Google auth code for Google's tokens.
    """
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        token_data = token_response.json()
        if "error" in token_data:
            raise HTTPException(status_code=400, detail=f"Google token exchange failed: {token_data['error_description']}")
        return token_data

# --- 3. Get Google User Profile ---
def get_google_user_profile(google_tokens: Dict[str, Any]) -> Dict[str, Any]:
    """
    Decodes the Google ID token to get the user's profile info.
    """
    try:
        id_info = id_token.verify_oauth2_token(
            google_tokens["id_token"],
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )
        return id_info
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {e}")

# --- 4. Find or Create User in *Our* DB (Refinement) ---
def get_or_create_user_from_google(db: Session, google_profile: Dict[str, Any]) -> User:
    """
    Finds a user in our DB by their Google ID or Email. 
    If they don't exist, it creates a new user.
    If the email exists but Google ID doesn't, it links the Google ID.
    """
    google_id = google_profile["sub"] 
    email = google_profile.get("email")
    full_name = google_profile.get("name")
    
    if not email:
         raise HTTPException(status_code=400, detail="Email not provided by Google. Cannot log in.")

    # 1. Check if user exists by Google ID (Primary Login)
    user = db.query(User).filter(User.google_id == google_id).first()
    if user:
        return user
    
    # 2. Check if user exists by Email (Account Linking)
    user = db.query(User).filter(User.email == email).first()
    if user:
        # Email exists, but Google ID is missing. Link them.
        user.google_id = google_id
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
        
    # 3. User is brand new (Register)
    new_user = User(
        email=email,
        full_name=full_name,
        google_id=google_id,
        has_finalized_signup=False # <-- This is the new flag
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# --- 5. Create *Our* App's JWTs ---
def create_app_tokens(db: Session, user_id: int) -> Dict[str, str]:
    """
    Creates our app's Access Token (15 min) and Refresh Token (90 day).
    """
    access_token_expires = datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token_data = {"sub": str(user_id), "type": "access"}
    access_token = _create_jwt(data=access_token_data, expires_delta=access_token_expires)
    
    refresh_token_expires = datetime.timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token_data = {"sub": str(user_id), "type": "refresh"}
    refresh_token = _create_jwt(data=refresh_token_data, expires_delta=refresh_token_expires)
    
    # --- Store the *hashed* refresh token in our DB ---
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.our_app_refresh_token = get_token_hash(refresh_token)
        db.add(user)
        db.commit()
    
    return {"access_token": access_token, "refresh_token": refresh_token}

# --- 6. Store Google's Refresh Token ---
def store_google_refresh_token(db: Session, user: User, google_refresh_token: str):
    """
    Saves Google's refresh token to the user's profile for calendar access.
    """
    user.google_oauth_refresh_token = google_refresh_token
    db.add(user)
    db.commit()

# --- 7. Finalize Signup ---
def finalize_user_signup(db: Session, user: User) -> User:
    """
    Flips the 'has_finalized_signup' flag to True.
    """
    if not user.has_finalized_signup:
        user.has_finalized_signup = True
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

# --- 8. Refresh Our *App's* Token ---
def refresh_app_token(db: Session, token: str) -> str:
    """
    Validates our long-lived refresh token and issues a new
    short-lived access token.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user_id = int(payload.get("sub"))
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Check if the token in the DB matches the one sent
        if not user.our_app_refresh_token or not verify_token_hash(token, user.our_app_refresh_token):
            raise HTTPException(status_code=401, detail="Refresh token does not match or has been revoked")

        # Issue a new *access* token
        access_token_expires = datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token_data = {"sub": str(user.id), "type": "access"}
        new_access_token = _create_jwt(data=access_token_data, expires_delta=access_token_expires)
        return new_access_token

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# --- 9. Logout ---
def logout_user(db: Session, token: str):
    """
    Logs out a user by invalidating their refresh token.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
        user = db.query(User).filter(User.id == user_id).first()
        
        if user and user.our_app_refresh_token and verify_token_hash(token, user.our_app_refresh_token):
            user.our_app_refresh_token = None # Invalidate the token
            db.add(user)
            db.commit()
        return
    except (JWTError, ValueError):
        # If token is invalid, just ignore. They are already logged out.
        return

# --- Helper: Create JWT (Unchanged logic, just internal) ---
def _create_jwt(data: dict, expires_delta: Optional[datetime.timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.now(datetime.timezone.utc) + expires_delta
    else:
        expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=15)
    to_encode.update({"exp": expire, "iat": datetime.datetime.now(datetime.timezone.utc)})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- Get Current User (The Dependency) ---
# This is the function that will protect all our API endpoints
async def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get the current user from our app's JWT access token.
    """
    token = await oauth2_scheme(request) # Extracts token from "Authorization: Bearer"
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if token is None:
        raise credentials_exception
        
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise credentials_exception
            
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=int(user_id))
    except (JWTError, ValueError):
        raise credentials_exception
    
    user = db.query(User).filter(User.id == token_data.user_id).first()
    if user is None:
        raise credentials_exception
    
    # We allow them to be "current_user" so they can access the finalize-signup endpoint
    return user