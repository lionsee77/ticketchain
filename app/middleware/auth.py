"""Authentication middleware for JWT token verification only"""

from typing import Optional, Set
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import json

from services.auth_service import auth_service
from database.db import get_db
from database.db_models import User
from database.db import get_db
from database.db_models import User


class AuthMiddleware(BaseHTTPMiddleware):
    """Middleware for JWT token verification - authentication only"""

    def __init__(
        self,
        app,
        protected_paths: Optional[Set[str]] = None,
    ):
        """
        Initialize auth middleware for token verification

        Args:
            app: FastAPI application
            protected_paths: Set of path patterns that require authentication
        """
        super().__init__(app)
        self.protected_paths = protected_paths or {
            "/create-event",
            "/buy-ticket",
            "/market",
            "/auth/profile",
            "/auth/me",
            "/auth/logout",
            "/auth/logout-all",
        }
        self.security = HTTPBearer(auto_error=False)

    def _is_protected_path(self, path: str) -> bool:
        """Check if path requires authentication"""
        return any(protected in path for protected in self.protected_paths)

    async def dispatch(self, request: Request, call_next) -> Response:
        """Process request with authentication only"""

        # Always allow OPTIONS requests (CORS preflight) to pass through
        if request.method == "OPTIONS":
            return await call_next(request)

        # Skip auth for non-protected paths
        if not self._is_protected_path(request.url.path):
            return await call_next(request)

        # Skip auth routes (except protected ones)
        if request.url.path.startswith("/auth/") and request.url.path not in {
            "/auth/profile",
            "/auth/me",
            "/auth/logout",
            "/auth/logout-all",
        }:
            return await call_next(request)

        # Extract token from Authorization header
        authorization = request.headers.get("authorization")
        if not authorization or not authorization.startswith("Bearer "):
            return self._unauthorized_response(
                "Missing or invalid authorization header"
            )

        token = authorization.split("Bearer ")[1]

        # Verify token (authentication only)
        payload = auth_service.verify_token(token, "access")
        if not payload:
            return self._unauthorized_response("Invalid or expired token")

        # Get user info from token
        user_id = payload.get("sub")
        if not user_id:
            return self._unauthorized_response("Invalid token payload")

        # Add authenticated user info to request state
        # Authorization (role checking) will be handled by route dependencies
        # Note: private_key is NOT stored here for security - retrieve only when needed
        request.state.user_id = int(user_id)
        request.state.username = payload.get("username")
        request.state.session_id = payload.get("session_id")
        request.state.user_roles = payload.get("roles", [])
        request.state.wallet_address = payload.get("wallet_address")
        request.state.is_authenticated = True

        return await call_next(request)

    def _unauthorized_response(self, detail: str) -> Response:
        """Return 401 Unauthorized response"""
        return Response(
            content=json.dumps({"detail": detail}),
            status_code=status.HTTP_401_UNAUTHORIZED,
            headers={"content-type": "application/json", "WWW-Authenticate": "Bearer"},
        )
