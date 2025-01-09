from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError
import logging

from ..database import get_db
from ..models import User
from .utils import verify_token

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    logger.info("Attempting to get current user from token")
    logger.info(f"Token: {token[:10]}...")  # Log first 10 chars of token for debugging
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = verify_token(token)
        if payload is None:
            logger.warning("Token verification failed - no payload")
            raise credentials_exception
        user_id: str = payload.get("sub")
        if user_id is None:
            logger.warning("Token verification failed - no user_id in payload")
            raise credentials_exception
        logger.info(f"Token verified for user_id: {user_id}")
        
        # Log payload for debugging
        logger.info(f"Token payload: {payload}")
    except JWTError as e:
        logger.error(f"JWT Error: {str(e)}")
        raise credentials_exception
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        logger.warning(f"No user found for id: {user_id}")
        raise credentials_exception
    
    logger.info(f"Successfully authenticated user: {user.username} (id: {user.id})")
    return user

async def get_optional_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not token:
        logger.info("No token provided for optional user")
        return None
    
    try:
        return await get_current_user(token, db)
    except HTTPException:
        logger.warning("Failed to get optional user")
        return None 