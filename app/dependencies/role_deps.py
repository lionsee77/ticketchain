"""Role-based dependencies for authorization (after authentication by middleware)"""

from typing import List
from fastapi import Depends, HTTPException, status, Request


def get_authenticated_user(request: Request):
    """Get authenticated user info from middleware state"""
    if not getattr(request.state, "is_authenticated", False):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required"
        )

    return {
        "user_id": getattr(request.state, "user_id"),
        "username": getattr(request.state, "username"),
        "session_id": getattr(request.state, "session_id"),
        "roles": getattr(request.state, "user_roles", []),
        "account_index": getattr(request.state, "account_index"),
        "wallet_address": getattr(request.state, "wallet_address"),
    }


def require_roles(required_roles: List[str]):
    """Dependency factory for role-based authorization"""

    def role_checker(user_info: dict = Depends(get_authenticated_user)):
        # Get user roles from authenticated user info
        user_roles = user_info.get("roles", [])

        # Check if user has any of the required roles
        if not any(role in user_roles for role in required_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(required_roles)}. Your roles: {', '.join(user_roles)}",
            )

        return user_info

    return role_checker


# Pre-defined role dependencies for common use cases
require_admin = require_roles(["admin"])
require_organiser = require_roles(["admin", "organiser"])
require_user = require_roles(["user", "admin"])


# Convenience dependency for any authenticated user (no specific roles required)
def require_authenticated_user(user_info: dict = Depends(get_authenticated_user)):
    """Dependency for any authenticated user (no specific role required)"""
    return user_info
