# backend/app/api/auth_router.py

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Dict, Any
# --- THIS IS THE FIX ---
import datetime 
# ------------------------


from ..core.database import get_db
from ..schemas import user_schema
from ..models import user_model
from ..services import auth_service
from ..core.config_loader import settings

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

# Define the scopes we need for our app
GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events"
GOOGLE_PROFILE_SCOPES = "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"

# --- 1. The /login endpoint (No changes) ---
@router.get("/google/login")
def google_login():
    """
    Redirects the user to Google's consent screen to start the login process.
    We ask for calendar and profile scopes, plus 'offline' access to get a refresh token.
    """
    auth_url = auth_service.create_google_auth_url(
        scopes=[GOOGLE_PROFILE_SCOPES, GOOGLE_CALENDAR_SCOPE],
        redirect_uri=f"{settings.server_host}:8000/auth/google/callback" # Our backend callback
    )
    return RedirectResponse(url=auth_url)

# --- 2. The /callback endpoint (Fix is in this function) ---
@router.get("/google/callback")
async def google_callback(
    request: Request, # We need the full request to get query params
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Handles the callback from Google. Exchanges the code for tokens,
    finds or creates a user, and sets our app's login tokens.
    """
    try:
        # Get the authorization code from the URL query params
        code = request.query_params.get('code')
        if not code:
            raise HTTPException(status_code=400, detail="Missing authorization code")

        # 1. Exchange the code for Google tokens
        google_tokens = await auth_service.exchange_google_code_for_tokens(
            code=code,
            redirect_uri=f"{settings.server_host}:8000/auth/google/callback"
        )
        
        # 2. Get Google user profile
        google_user_profile = auth_service.get_google_user_profile(google_tokens)
        
        # 3. Find or create the user in our database
        user = auth_service.get_or_create_user_from_google(db=db, google_profile=google_user_profile)
        
        # 4. Create our app's "Facebook-style" persistent login tokens
        app_tokens = auth_service.create_app_tokens(db=db, user_id=user.id)
        
        # 5. Set the long-lived refresh token in a secure, HttpOnly cookie
        response.set_cookie(
            key="refresh_token",
            value=app_tokens["refresh_token"],
            httponly=True,
            
            # --- THIS IS THE FIX ---
            # Use secure=True only if we are NOT in the "local" environment
            secure=settings.ENVIRONMENT != "local", 
            # -----------------------

            samesite="lax",
            # --- THIS LINE IS NOW FIXED ---
            # It correctly uses datetime.timedelta
            max_age=datetime.timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS).total_seconds()
        )
        
        # 6. Store the Google refresh token (if we got one) for calendar access
        if google_tokens.get("refresh_token"):
            auth_service.store_google_refresh_token(
                db=db, 
                user=user, 
                google_refresh_token=google_tokens["refresh_token"]
            )
        
        # 7. Always redirect to the frontend callback page
        redirect_url = f"http://{settings.DOMAIN}:3000/auth/google/callback"
            
        # We must set the *short-lived* access token in the URL for the frontend
        return RedirectResponse(f"{redirect_url}?token={app_tokens['access_token']}")

    except Exception as e:
        print(f"🚨 Auth Callback Error: {e}")
        error_message = str(e).replace(" ", "+") # Simple URL encoding
        return RedirectResponse(f"http://{settings.DOMAIN}:3000/?error={error_message}")
# --- 3. The /finalize-signup endpoint (No changes) ---
@router.post("/google/finalize-signup", response_model=user_schema.UserRead)
def finalize_signup(
    signup_data: user_schema.FinalizeSignup, # New schema with accepts_terms
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_service.get_current_user)
):
    """
    The final step for a new user after they check the "Terms" box
    on the frontend.
    """
    if not signup_data.accepts_terms:
         raise HTTPException(status_code=400, detail="You must accept the terms to continue.")
         
    user = auth_service.finalize_user_signup(db=db, user=current_user)
    return user
    
# --- 4. The /refresh-token endpoint (No changes) ---
@router.post("/refresh-token", response_model=user_schema.Token)
def refresh_access_token(request: Request, response: Response, db: Session = Depends(get_db)):
    """
    Provides a new short-lived access token in exchange for a
    valid long-lived refresh token (from the HttpOnly cookie).
    """
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token found")
    
    try:
        new_access_token = auth_service.refresh_app_token(db=db, token=refresh_token)
        return {"access_token": new_access_token, "token_type": "bearer"}
    except Exception as e:
        # If refresh fails, clear the cookie
        response.delete_cookie(key="refresh_token")
        raise HTTPException(status_code=401, detail=str(e))


# --- 5. The /logout endpoint (No changes) ---
@router.post("/logout")
def logout(response: Response, request: Request, db: Session = Depends(get_db)):
    """
    Logs the user out by clearing their refresh token from the database
    and from their browser cookie.
    """
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        auth_service.logout_user(db=db, token=refresh_token)
        
    # --- THIS IS THE FIX ---
    # We must use the same attributes to delete the cookie
    # that we used to set it.
    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        secure=settings.ENVIRONMENT != "local",
        samesite="lax"
    )
    # -----------------------
    return {"message": "Successfully logged out"}
# --- 6. The /me endpoint (No changes) ---
@router.get("/me", response_model=user_schema.UserReadWithStatus)
def read_users_me(
    current_user: user_model.User = Depends(auth_service.get_current_user)
):
    """
    Get the profile for the currently authenticated user.
    This is used by the frontend to check has_finalized_signup.
    """
    return current_user