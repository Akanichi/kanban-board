from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import logging
from ..database import get_db
from .. import models, schemas
from ..auth.deps import get_current_user
from sqlalchemy.orm import joinedload

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="",
    tags=["teams"]
)

# Team endpoints
@router.post("/", response_model=schemas.Team)
def create_team(
    team: schemas.TeamCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    logger.info(f"Creating team with data: {team.dict()}")
    db_team = models.Team(**team.dict(), created_by_id=current_user.id)
    db.add(db_team)
    db.commit()
    db.refresh(db_team)
    
    # Add creator as team admin
    team_member = models.TeamMember(team_id=db_team.id, user_id=current_user.id, role='admin')
    db.add(team_member)
    db.commit()
    
    logger.info(f"Team created successfully with ID: {db_team.id}")
    return db_team

@router.get("/", response_model=List[schemas.Team])
def get_user_teams(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    logger.info(f"Getting teams for user ID: {current_user.id}")
    logger.info(f"Current user details: {current_user.email}, {current_user.username}")
    try:
        # First check if the user exists in the team_members table
        team_member_exists = db.query(models.TeamMember).filter(
            models.TeamMember.user_id == current_user.id
        ).first()
        
        logger.info(f"Team member exists: {team_member_exists is not None}")
        
        # Get teams with relationships loaded
        query = (
            db.query(models.Team)
            .join(models.TeamMember)
            .filter(models.TeamMember.user_id == current_user.id)
            .options(
                joinedload(models.Team.team_memberships).joinedload(models.TeamMember.user),
                joinedload(models.Team.created_by)
            )
        )
        
        # Log the SQL query
        logger.info(f"SQL Query: {str(query)}")
        
        teams = query.all()
        
        if not teams:
            logger.warning(f"No teams found for user {current_user.id}")
            # Create a default team for the user
            default_team = models.Team(
                name="My Team",
                description="My personal team",
                created_by_id=current_user.id
            )
            db.add(default_team)
            db.commit()
            db.refresh(default_team)
            
            # Add user as team admin
            team_member = models.TeamMember(
                team_id=default_team.id,
                user_id=current_user.id,
                role='admin'
            )
            db.add(team_member)
            db.commit()
            
            # Reload the team with all relationships
            teams = [
                db.query(models.Team)
                .filter(models.Team.id == default_team.id)
                .options(
                    joinedload(models.Team.team_memberships).joinedload(models.TeamMember.user),
                    joinedload(models.Team.created_by)
                )
                .first()
            ]
        
        logger.info(f"Found {len(teams)} teams for user {current_user.id}")
        for team in teams:
            logger.info(f"Team: {team.id} - {team.name}")
            logger.info(f"Team memberships: {len(team.team_memberships)}")
            for member in team.team_memberships:
                logger.info(f"  Member: {member.user.username} (role: {member.role})")
        
        return teams
    except Exception as e:
        logger.error(f"Error getting teams for user {current_user.id}: {str(e)}")
        logger.exception(e)  # This will log the full stack trace
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving teams: {str(e)}"
        )

@router.get("/{team_id}", response_model=schemas.Team)
def get_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    logger.info(f"Getting team {team_id} for user {current_user.id}")
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        logger.warning(f"Team {team_id} not found")
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if user is a member of the team
    if current_user not in team.members:
        logger.warning(f"User {current_user.id} is not a member of team {team_id}")
        raise HTTPException(status_code=403, detail="Not a member of this team")
    
    logger.info(f"Successfully retrieved team {team_id}")
    return team

@router.post("/{team_id}/members", response_model=schemas.TeamMember)
def add_team_member(
    team_id: int,
    member: schemas.TeamMemberCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if current user is team admin
    team_member = db.query(models.TeamMember).filter(
        models.TeamMember.team_id == team_id,
        models.TeamMember.user_id == current_user.id,
        models.TeamMember.role == 'admin'
    ).first()
    if not team_member:
        raise HTTPException(status_code=403, detail="Only team admins can add members")
    
    # Check if user exists
    user = db.query(models.User).filter(models.User.id == member.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is already a member
    existing_member = db.query(models.TeamMember).filter(
        models.TeamMember.team_id == team_id,
        models.TeamMember.user_id == member.user_id
    ).first()
    if existing_member:
        raise HTTPException(status_code=400, detail="User is already a team member")
    
    db_member = models.TeamMember(
        team_id=team_id,
        user_id=member.user_id,
        role=member.role
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    
    return db_member

@router.delete("/{team_id}/members/{user_id}")
def remove_team_member(
    team_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if current user is team admin
    team_member = db.query(models.TeamMember).filter(
        models.TeamMember.team_id == team_id,
        models.TeamMember.user_id == current_user.id,
        models.TeamMember.role == 'admin'
    ).first()
    if not team_member:
        raise HTTPException(status_code=403, detail="Only team admins can remove members")
    
    # Cannot remove the last admin
    admin_count = db.query(models.TeamMember).filter(
        models.TeamMember.team_id == team_id,
        models.TeamMember.role == 'admin'
    ).count()
    member_to_remove = db.query(models.TeamMember).filter(
        models.TeamMember.team_id == team_id,
        models.TeamMember.user_id == user_id
    ).first()
    
    if member_to_remove and member_to_remove.role == 'admin' and admin_count <= 1:
        raise HTTPException(status_code=400, detail="Cannot remove the last admin")
    
    if not member_to_remove:
        raise HTTPException(status_code=404, detail="Member not found")
    
    db.delete(member_to_remove)
    db.commit()
    
    return {"message": "Member removed successfully"}

# Board endpoints
@router.post("/{team_id}/boards", response_model=schemas.Board)
def create_board(
    team_id: int,
    board: schemas.BoardCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if user is a member of the team
    if current_user not in team.members:
        raise HTTPException(status_code=403, detail="Not a member of this team")
    
    db_board = models.Board(**board.dict(), created_by_id=current_user.id)
    db.add(db_board)
    db.commit()
    db.refresh(db_board)
    
    # Add creator as board admin
    board_member = models.BoardMember(board_id=db_board.id, user_id=current_user.id, role='admin')
    db.add(board_member)
    db.commit()
    
    return db_board

@router.get("/{team_id}/boards", response_model=List[schemas.Board])
def get_team_boards(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        logger.info(f"Getting boards for team {team_id}")
        team = (
            db.query(models.Team)
            .filter(models.Team.id == team_id)
            .options(joinedload(models.Team.members))
            .first()
        )
        if not team:
            logger.warning(f"Team {team_id} not found")
            raise HTTPException(status_code=404, detail="Team not found")
        
        # Check if user is a member of the team
        if current_user not in team.members:
            logger.warning(f"User {current_user.id} is not a member of team {team_id}")
            raise HTTPException(status_code=403, detail="Not a member of this team")
        
        # Get boards with relationships loaded
        boards = (
            db.query(models.Board)
            .filter(models.Board.team_id == team_id)
            .options(
                joinedload(models.Board.board_memberships).joinedload(models.BoardMember.user),
                joinedload(models.Board.created_by),
                joinedload(models.Board.team)
            )
            .all()
        )
        
        logger.info(f"Found {len(boards)} boards for team {team_id}")
        for board in boards:
            logger.info(f"Board: {board.id} - {board.name}")
            logger.info(f"Board memberships: {len(board.board_memberships)}")
            for member in board.board_memberships:
                logger.info(f"  Member: {member.user.username} (role: {member.role})")
        
        return boards
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting boards for team {team_id}: {str(e)}")
        logger.exception(e)  # This will log the full stack trace
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving boards: {str(e)}"
        )

@router.get("/{team_id}/boards/{board_id}", response_model=schemas.Board)
def get_board(
    team_id: int,
    board_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    board = db.query(models.Board).filter(
        models.Board.id == board_id,
        models.Board.team_id == team_id
    ).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    
    # Check if user has access to the board
    if not board.is_public and current_user not in board.members:
        raise HTTPException(status_code=403, detail="Not authorized to access this board")
    
    return board

@router.post("/{team_id}/boards/{board_id}/members", response_model=schemas.BoardMember)
def add_board_member(
    team_id: int,
    board_id: int,
    member: schemas.BoardMemberCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    board = db.query(models.Board).filter(
        models.Board.id == board_id,
        models.Board.team_id == team_id
    ).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    
    # Check if current user is board admin
    board_member = db.query(models.BoardMember).filter(
        models.BoardMember.board_id == board_id,
        models.BoardMember.user_id == current_user.id,
        models.BoardMember.role == 'admin'
    ).first()
    if not board_member:
        raise HTTPException(status_code=403, detail="Only board admins can add members")
    
    # Check if user is a team member
    team_member = db.query(models.TeamMember).filter(
        models.TeamMember.team_id == team_id,
        models.TeamMember.user_id == member.user_id
    ).first()
    if not team_member:
        raise HTTPException(status_code=400, detail="User must be a team member first")
    
    # Check if user is already a board member
    existing_member = db.query(models.BoardMember).filter(
        models.BoardMember.board_id == board_id,
        models.BoardMember.user_id == member.user_id
    ).first()
    if existing_member:
        raise HTTPException(status_code=400, detail="User is already a board member")
    
    db_member = models.BoardMember(
        board_id=board_id,
        user_id=member.user_id,
        role=member.role
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    
    return db_member

@router.delete("/{team_id}/boards/{board_id}/members/{user_id}")
def remove_board_member(
    team_id: int,
    board_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    board = db.query(models.Board).filter(
        models.Board.id == board_id,
        models.Board.team_id == team_id
    ).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    
    # Check if current user is board admin
    board_member = db.query(models.BoardMember).filter(
        models.BoardMember.board_id == board_id,
        models.BoardMember.user_id == current_user.id,
        models.BoardMember.role == 'admin'
    ).first()
    if not board_member:
        raise HTTPException(status_code=403, detail="Only board admins can remove members")
    
    # Cannot remove the last admin
    admin_count = db.query(models.BoardMember).filter(
        models.BoardMember.board_id == board_id,
        models.BoardMember.role == 'admin'
    ).count()
    member_to_remove = db.query(models.BoardMember).filter(
        models.BoardMember.board_id == board_id,
        models.BoardMember.user_id == user_id
    ).first()
    
    if member_to_remove and member_to_remove.role == 'admin' and admin_count <= 1:
        raise HTTPException(status_code=400, detail="Cannot remove the last admin")
    
    if not member_to_remove:
        raise HTTPException(status_code=404, detail="Member not found")
    
    db.delete(member_to_remove)
    db.commit()
    
    return {"message": "Member removed successfully"} 