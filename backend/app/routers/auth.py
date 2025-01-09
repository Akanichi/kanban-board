from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import logging

from ..database import get_db
from ..models import User, Team, Board, TeamMember, BoardMember
from ..schemas import UserCreate, User as UserSchema
from ..auth.utils import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/register", response_model=UserSchema)
def register(user_data: UserCreate, db: Session = Depends(get_db)) -> Any:
    logger.info(f"Registering new user with email: {user_data.email}")
    
    # Check if user exists
    if db.query(User).filter(User.email == user_data.email).first():
        logger.warning(f"Email already registered: {user_data.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    if db.query(User).filter(User.username == user_data.username).first():
        logger.warning(f"Username already taken: {user_data.username}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create new user
    user = User(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info(f"Created new user with ID: {user.id}")
    
    # Create default team
    default_team = Team(
        name="My Team",
        description="My personal team",
        created_by_id=user.id
    )
    db.add(default_team)
    db.commit()
    db.refresh(default_team)
    logger.info(f"Created default team with ID: {default_team.id}")
    
    # Add user as team admin
    team_member = TeamMember(
        team_id=default_team.id,
        user_id=user.id,
        role='admin'
    )
    db.add(team_member)
    db.commit()
    
    # Create default board
    default_board = Board(
        name="My Board",
        description="My personal board",
        team_id=default_team.id,
        created_by_id=user.id,
        is_public=True
    )
    db.add(default_board)
    db.commit()
    db.refresh(default_board)
    logger.info(f"Created default board with ID: {default_board.id}")
    
    # Add user as board admin
    board_member = BoardMember(
        board_id=default_board.id,
        user_id=user.id,
        role='admin'
    )
    db.add(board_member)
    db.commit()
    
    return user

@router.post("/login")
def login(
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    # Find user by username or email
    user = (
        db.query(User)
        .filter(
            (User.username == form_data.username) | 
            (User.email == form_data.username)
        )
        .first()
    )
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name
        }
    } 