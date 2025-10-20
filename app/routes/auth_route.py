"""Authentication routes for user registration, login, and session management"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database.db import get_db
from services.auth_service import auth_service
from database.db_models import User
from models import (
    UserRegister,
    UserLogin,
    TokenResponse,
    TokenRefresh,
    UserProfile,
    MessageResponse,
    AssignRoleRequest,
)


# Security scheme
security = HTTPBearer()

# Router
router = APIRouter(prefix="/auth", tags=["authentication"])


# Helper function to get client info
def get_client_info(request: Request) -> tuple[Optional[str], Optional[str]]:
    """Extract client IP and user agent from request"""
    user_agent = request.headers.get("user-agent")

    # Try to get real IP (considering proxies)
    ip_address = (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or request.headers.get("x-real-ip")
        or request.client.host
        if request.client
        else None
    )

    return user_agent, ip_address


# Dependency to get current user from JWT
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Get current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Verify access token
        payload = auth_service.verify_token(credentials.credentials, "access")
        if payload is None:
            raise credentials_exception

        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception

        # Get user from database
        user = auth_service.get_user(db, user_id=int(user_id))
        if user is None or not getattr(user, "is_active", False):
            raise credentials_exception

        return user
    except Exception:
        raise credentials_exception


# Dependency to get current active user
async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Get current active user"""
    if not getattr(current_user, "is_active", False):
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


# Routes
@router.post("/register", response_model=TokenResponse)
async def register_user(
    user_data: UserRegister, request: Request, db: Session = Depends(get_db)
):
    """Register a new user"""
    # Check if username already exists
    if auth_service.get_user_by_username(db, user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    # Check if email already exists
    if auth_service.get_user_by_email(db, user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Create user
    user = auth_service.create_user(
        db=db,
        username=user_data.username,
        email=user_data.email,
        password=user_data.password,
        full_name=user_data.full_name,
        roles=["user"],  # Default role
    )

    # Create session
    user_agent, ip_address = get_client_info(request)
    session_data = auth_service.create_session(
        db=db, user=user, user_agent=user_agent, ip_address=ip_address
    )

    return TokenResponse(**session_data)


@router.post("/login", response_model=TokenResponse)
async def login_user(
    user_data: UserLogin, request: Request, db: Session = Depends(get_db)
):
    """Login user and create session"""
    # Authenticate user
    user = auth_service.authenticate_user(db, user_data.username, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not getattr(user, "is_active", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user account"
        )

    # Create session
    user_agent, ip_address = get_client_info(request)
    session_data = auth_service.create_session(
        db=db, user=user, user_agent=user_agent, ip_address=ip_address
    )

    return TokenResponse(**session_data)


@router.post("/refresh", response_model=dict)
async def refresh_token(token_data: TokenRefresh, db: Session = Depends(get_db)):
    """Refresh access token using refresh token"""
    new_token_data = auth_service.refresh_access_token(db, token_data.refresh_token)
    if not new_token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )

    return new_token_data


@router.post("/logout", response_model=MessageResponse)
async def logout_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """Logout current session"""
    try:
        # Get session ID from token
        payload = auth_service.verify_token(credentials.credentials, "access")
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
            )

        session_id = payload.get("session_id")
        if not session_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session"
            )

        # Logout session
        success = auth_service.logout_session(db, session_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Session not found"
            )

        return MessageResponse(message="Successfully logged out")

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )


@router.post("/logout-all", response_model=MessageResponse)
async def logout_all_sessions(
    current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
):
    """Logout all sessions for current user"""
    count = auth_service.logout_all_sessions(db, getattr(current_user, "id"))
    return MessageResponse(message=f"Successfully logged out {count} sessions")


@router.get("/profile", response_model=UserProfile)
async def get_user_profile(current_user: User = Depends(get_current_active_user)):
    """Get current user profile"""
    return UserProfile(
        id=getattr(current_user, "id"),
        username=getattr(current_user, "username"),
        email=getattr(current_user, "email"),
        full_name=getattr(current_user, "full_name"),
        is_active=getattr(current_user, "is_active"),
        is_verified=getattr(current_user, "is_verified"),
        created_at=getattr(current_user, "created_at"),
        roles=[getattr(role, "name") for role in getattr(current_user, "roles")],
    )


@router.get("/me", response_model=UserProfile)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user info (alias for /profile)"""
    return await get_user_profile(current_user)


@router.get("/token-info")
async def get_token_info(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Decode and return current JWT token payload for testing"""
    try:
        payload = auth_service.verify_token(credentials.credentials, "access")
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
            )

        # Remove sensitive data for response
        safe_payload = {k: v for k, v in payload.items() if k not in ["exp"]}
        return {"token_payload": safe_payload, "message": "Token successfully decoded"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )


@router.post("/assign-roles", response_model=MessageResponse)
async def assign_roles_to_user(
    request: AssignRoleRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Assign roles to a user (admin only)"""
    # Check if current user has admin role
    user_roles = [getattr(role, "name") for role in getattr(current_user, "roles")]
    if "admin" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can assign roles",
        )

    # Get target user
    target_user = auth_service.get_user_by_username(db, request.username)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{request.username}' not found",
        )

    # Assign roles
    try:
        success = auth_service.assign_roles_to_user(db, target_user, request.roles)
        if success:
            return MessageResponse(
                message=f"Successfully assigned roles {request.roles} to user '{request.username}'"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to assign roles"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error assigning roles: {str(e)}",
        )
