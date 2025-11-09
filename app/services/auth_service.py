"""Authentication service with JWT, password hashing, and session management"""

import secrets
import redis
import json
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from sqlalchemy import and_

from config import config
from database.db_models import User, Role, Session as SessionModel


class AuthService:
    """Authentication service handling JWT, passwords, and sessions"""

    def __init__(self):

        # Redis connection for session storage
        self.redis_client = redis.from_url(config.REDIS_URL, decode_responses=True)

        # JWT settings
        self.secret_key = config.SECRET_KEY
        self.algorithm = config.ALGORITHM
        self.access_token_expire_minutes = config.ACCESS_TOKEN_EXPIRE_MINUTES
        self.refresh_token_expire_days = config.REFRESH_TOKEN_EXPIRE_DAYS

    # Password handling using direct bcrypt
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash using bcrypt directly"""
        password_byte_enc = plain_password.encode("utf-8")
        # Convert string to bytes for bcrypt
        hashed_password_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(
            password=password_byte_enc, hashed_password=hashed_password_bytes
        )

    def get_password_hash(self, password: str) -> str:
        """Hash a password using bcrypt directly"""
        pwd_bytes = password.encode("utf-8")
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password=pwd_bytes, salt=salt)
        # Return as string for database storage
        return hashed_password.decode("utf-8")

    # JWT token handling
    def create_access_token(
        self, data: dict, expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(
                minutes=self.access_token_expire_minutes
            )

        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt

    def create_refresh_token(self, data: dict) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(
            days=self.refresh_token_expire_days
        )
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt

    def verify_token(self, token: str, token_type: str = "access") -> Optional[dict]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            if payload.get("type") != token_type:
                return None
            return payload
        except JWTError:
            return None

    # User management
    def get_user(self, db: Session, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()

    def get_user_by_username(self, db: Session, username: str) -> Optional[User]:
        """Get user by username"""
        return db.query(User).filter(User.username == username).first()

    def get_user_by_email(self, db: Session, email: str) -> Optional[User]:
        """Get user by email"""
        return db.query(User).filter(User.email == email).first()

    def authenticate_user(
        self, db: Session, username: str, password: str
    ) -> Optional[User]:
        """Authenticate user with username/password"""
        user = self.get_user_by_username(db, username)
        if not user:
            return None
        if not self.verify_password(password, str(user.hashed_password)):
            return None
        return user

    def create_user(
        self,
        db: Session,
        username: str,
        email: str,
        password: str,
        wallet_address: str,
        private_key: str,
        full_name: Optional[str] = None,
        roles: Optional[List[str]] = None,
    ) -> User:
        """Create new user"""
        hashed_password = self.get_password_hash(password)

        # Create user
        db_user = User(
            username=username,
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            wallet_address=wallet_address,
            private_key=private_key,
            is_active=True,
            is_verified=False,
        )

        # Add roles if specified
        if roles:
            user_roles = db.query(Role).filter(Role.name.in_(roles)).all()
            db_user.roles = user_roles

        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    # Session management
    def create_session(
        self,
        db: Session,
        user: User,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create new user session with tokens"""
        # Generate session ID
        session_id = secrets.token_urlsafe(32)

        # Create tokens with user roles
        user_roles = [role.name for role in user.roles]
        token_data = {
            "sub": str(user.id),
            "username": user.username,
            "roles": user_roles,
            "session_id": session_id,
            "wallet_address": user.wallet_address,
            "private_key": user.private_key,
        }
        access_token = self.create_access_token(token_data)
        refresh_token = self.create_refresh_token(token_data)

        # Store session in database
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=self.refresh_token_expire_days
        )
        db_session = SessionModel(
            session_id=session_id,
            user_id=user.id,
            refresh_token=refresh_token,
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        db.add(db_session)
        db.commit()

        # Store session data in Redis for fast access
        session_data = {
            "user_id": user.id,
            "username": user.username,
            "roles": [role.name for role in user.roles],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self.redis_client.setex(
            f"session:{session_id}",
            timedelta(days=self.refresh_token_expire_days),
            json.dumps(session_data),
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": self.access_token_expire_minutes * 60,
            "session_id": session_id,
        }

    def get_session_data(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data from Redis"""
        try:
            data = self.redis_client.get(f"session:{session_id}")
            if data and isinstance(data, str):
                return json.loads(data)
            return None
        except (redis.RedisError, json.JSONDecodeError):
            return None

    def refresh_access_token(
        self, db: Session, refresh_token: str
    ) -> Optional[Dict[str, Any]]:
        """Refresh access token using refresh token"""
        # Verify refresh token
        payload = self.verify_token(refresh_token, "refresh")
        if not payload:
            return None

        session_id = payload.get("session_id")
        if not session_id:
            return None

        # Check if session exists and is active
        db_session = (
            db.query(SessionModel)
            .filter(
                and_(
                    SessionModel.session_id == session_id,
                    SessionModel.refresh_token == refresh_token,
                    SessionModel.is_active == True,
                    SessionModel.expires_at > datetime.now(timezone.utc),
                )
            )
            .first()
        )

        if not db_session:
            return None

        # Get user (keep getattr for safety with potential None values)
        user = self.get_user(db, getattr(db_session, "user_id"))
        if not user or not getattr(user, "is_active"):
            return None

        # Update session last accessed
        db.query(SessionModel).filter(SessionModel.session_id == session_id).update(
            {"last_accessed": datetime.now(timezone.utc)}
        )
        db.commit()

        # Create new access token with user roles
        user_roles = [role.name for role in user.roles]
        token_data = {
            "sub": str(user.id),
            "username": user.username,
            "roles": user_roles,
            "session_id": session_id,
            "wallet_address": user.wallet_address,
        }
        access_token = self.create_access_token(token_data)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": self.access_token_expire_minutes * 60,
        }

    def logout_session(self, db: Session, session_id: str) -> bool:
        """Logout specific session"""
        # Remove from Redis
        self.redis_client.delete(f"session:{session_id}")

        # Deactivate in database
        db_session = (
            db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
        )
        if db_session:
            # Update the is_active field using SQLAlchemy update
            db.query(SessionModel).filter(SessionModel.session_id == session_id).update(
                {"is_active": False}
            )
            db.commit()
            return True
        return False

    def logout_all_sessions(self, db: Session, user_id: int) -> int:
        """Logout all sessions for a user"""
        # Get all active sessions
        sessions = (
            db.query(SessionModel)
            .filter(
                and_(SessionModel.user_id == user_id, SessionModel.is_active == True)
            )
            .all()
        )

        # Remove from Redis and deactivate in database
        count = 0
        session_ids = []
        for session in sessions:
            self.redis_client.delete(f"session:{session.session_id}")
            session_ids.append(session.session_id)
            count += 1

        # Update all sessions at once
        if session_ids:
            db.query(SessionModel).filter(
                SessionModel.session_id.in_(session_ids)
            ).update({"is_active": False}, synchronize_session=False)

        db.commit()
        return count

    # Role management
    def user_has_role(self, user: User, role_name: str) -> bool:
        """Check if user has specific role"""
        return any(role.name == role_name for role in user.roles)

    def user_has_any_role(self, user: User, role_names: List[str]) -> bool:
        """Check if user has any of the specified roles"""
        user_role_names = {role.name for role in user.roles}
        return bool(user_role_names.intersection(role_names))

    def assign_roles_to_user(
        self, db: Session, user: User, role_names: List[str]
    ) -> bool:
        """Assign roles to a user"""
        try:
            # Get roles from database
            roles = db.query(Role).filter(Role.name.in_(role_names)).all()

            if len(roles) != len(role_names):
                found_roles = [getattr(role, "name") for role in roles]
                missing_roles = set(role_names) - set(found_roles)
                raise ValueError(f"Roles not found: {missing_roles}")

            # Clear existing roles and assign new ones
            user.roles = roles
            db.commit()
            db.refresh(user)
            return True

        except Exception as e:
            db.rollback()
            raise e


# Create singleton instance
auth_service = AuthService()
