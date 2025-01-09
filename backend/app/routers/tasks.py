from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
from typing import List
import os
import shutil
from pathlib import Path
from .. import models, schemas
from ..database import get_db
from ..auth.deps import get_current_user
from sqlalchemy.orm import joinedload
from sqlalchemy import func
from ..utils.logging import logger, debug_log

router = APIRouter(
    prefix="",
    tags=["tasks"]
)

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

def check_board_access(board_id: int, current_user: models.User, db: Session):
    board = (
        db.query(models.Board)
        .filter(models.Board.id == board_id)
        .options(
            joinedload(models.Board.board_memberships).joinedload(models.BoardMember.user),
            joinedload(models.Board.team)
        )
        .first()
    )
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    
    # Check if user has access to the board
    if not board.is_public:
        # Check if user is a member of the board
        is_board_member = any(
            member.user_id == current_user.id 
            for member in board.board_memberships
        )
        # Check if user is a member of the team
        is_team_member = db.query(models.TeamMember).filter(
            models.TeamMember.team_id == board.team_id,
            models.TeamMember.user_id == current_user.id
        ).first() is not None
        
        if not (is_board_member or is_team_member):
            raise HTTPException(status_code=403, detail="Not authorized to access this board")
    
    return board

@router.post("/", response_model=schemas.Task)
def create_task(
    task: schemas.TaskCreate,
    board_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Check board access
    board = check_board_access(board_id, current_user, db)
    
    # Get the maximum position for tasks in the same status
    max_position = db.query(func.max(models.Task.position)).filter(
        models.Task.board_id == board_id,
        models.Task.status == task.status
    ).scalar() or 0
    
    # Create task with position = max_position + 1
    task_data = task.model_dump(exclude={'position'})
    db_task = models.Task(
        **task_data,
        board_id=board_id,
        creator_id=current_user.id,
        position=max_position + 1
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.get("/", response_model=List[schemas.Task])
def read_tasks(
    board_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Check board access
    board = check_board_access(board_id, current_user, db)
    
    # Get tasks for this board
    tasks = db.query(models.Task).filter(
        models.Task.board_id == board_id
    ).order_by(models.Task.position).offset(skip).limit(limit).all()
    return tasks

@router.get("/{task_id}", response_model=schemas.Task)
def read_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check board access
    check_board_access(task.board_id, current_user, db)
    
    return task

@router.put("/{task_id}", response_model=schemas.Task)
@debug_log
async def update_task(
    task_id: int,
    task: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    logger.debug(f"Update request for task {task_id}")
    logger.debug(f"Update data: {task.model_dump(exclude_unset=True)}")
    
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    logger.debug(f"Current task state: id={db_task.id}, status={db_task.status}, position={db_task.position}")
    
    # Check board access
    check_board_access(db_task.board_id, current_user, db)
    
    update_data = task.model_dump(exclude_unset=True)
    
    # Handle position updates
    if 'position' in update_data:
        new_position = update_data['position']
        old_position = db_task.position or 0
        old_status = db_task.status
        new_status = update_data.get('status', old_status)
        
        logger.debug(f"Position update: old_pos={old_position}, new_pos={new_position}")
        logger.debug(f"Status update: old_status={old_status}, new_status={new_status}")
        
        # If status changed, update positions in both old and new status columns
        if new_status != old_status:
            logger.debug("Status changed - updating positions in both columns")
            # Decrease positions of tasks after the old position in the old status
            db.query(models.Task).filter(
                models.Task.board_id == db_task.board_id,
                models.Task.status == old_status,
                models.Task.position > old_position
            ).update({"position": models.Task.position - 1})
            
            # Increase positions of tasks at and after the new position in the new status
            db.query(models.Task).filter(
                models.Task.board_id == db_task.board_id,
                models.Task.status == new_status,
                models.Task.position >= new_position
            ).update({"position": models.Task.position + 1})
        else:
            logger.debug("Moving within same status")
            # Moving within the same status
            if new_position > old_position:
                logger.debug(f"Moving down: decreasing positions between {old_position} and {new_position}")
                # Moving down: decrease positions of tasks between old and new position
                db.query(models.Task).filter(
                    models.Task.board_id == db_task.board_id,
                    models.Task.status == old_status,
                    models.Task.position > old_position,
                    models.Task.position <= new_position
                ).update({"position": models.Task.position - 1})
            elif new_position < old_position:
                logger.debug(f"Moving up: increasing positions between {new_position} and {old_position}")
                # Moving up: increase positions of tasks between new and old position
                db.query(models.Task).filter(
                    models.Task.board_id == db_task.board_id,
                    models.Task.status == old_status,
                    models.Task.position >= new_position,
                    models.Task.position < old_position
                ).update({"position": models.Task.position + 1})
    
    # Update the task with all changes
    for field, value in update_data.items():
        setattr(db_task, field, value)
    
    db.commit()
    db.refresh(db_task)
    
    logger.debug(f"Final task state: id={db_task.id}, status={db_task.status}, position={db_task.position}")
    return db_task

@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check board access
    check_board_access(task.board_id, current_user, db)
    
    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully"}

@router.post("/{task_id}/labels/", response_model=schemas.Label)
def add_label(task_id: int, label: schemas.LabelCreate, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check if label already exists
    existing_label = db.query(models.Label).filter(
        models.Label.name == label.name,
        models.Label.color == label.color
    ).first()
    
    if existing_label:
        task.labels.append(existing_label)
    else:
        new_label = models.Label(**label.model_dump())
        db.add(new_label)
        db.flush()
        task.labels.append(new_label)
    
    db.commit()
    db.refresh(task)
    return task.labels[-1]

@router.get("/{task_id}/labels/", response_model=List[schemas.Label])
def get_task_labels(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task.labels

@router.delete("/{task_id}/labels/{label_id}")
def remove_label(task_id: int, label_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    label = db.query(models.Label).filter(models.Label.id == label_id).first()
    if label is None:
        raise HTTPException(status_code=404, detail="Label not found")
    
    task.labels.remove(label)
    db.commit()
    return {"message": "Label removed successfully"}

@router.post("/{task_id}/attachments/", response_model=schemas.Attachment)
def add_attachment(
    request: Request,
    task_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Check if task exists
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Create a unique filename
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{task_id}_{current_user.id}_{file.filename}"
    file_path = UPLOAD_DIR / unique_filename
    
    try:
        # Save the file
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get base URL
        base_url = str(request.base_url).rstrip('/')
        
        # Create attachment record
        attachment = models.Attachment(
            filename=file.filename,
            file_path=str(file_path),
            url=f"{base_url}/uploads/{unique_filename}",
            task_id=task_id,
            user_id=current_user.id
        )
        
        db.add(attachment)
        db.commit()
        db.refresh(attachment)
        
        # Refresh the task to include the new attachment
        db.refresh(task)
        
        return attachment
        
    except Exception as e:
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{task_id}/attachments/", response_model=List[schemas.Attachment])
def get_task_attachments(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task.attachments

@router.post("/{task_id}/comments/", response_model=schemas.Comment)
def add_comment(
    task_id: int,
    comment: schemas.CommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Check if task exists
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Create comment
    db_comment = models.Comment(
        content=comment.content,
        task_id=task_id,
        user_id=current_user.id,
        user=current_user  # Explicitly set the user relationship
    )
    
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    
    return db_comment

@router.get("/{task_id}/comments/", response_model=List[schemas.Comment])
def get_task_comments(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task.comments

@router.delete("/{task_id}/comments/{comment_id}")
def delete_comment(
    task_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Check if task exists
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check if comment exists and belongs to the task
    comment = db.query(models.Comment).filter(
        models.Comment.id == comment_id,
        models.Comment.task_id == task_id
    ).first()
    
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Check if user is the comment owner
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
    
    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted successfully"}

@router.post("/{task_id}/checklist/", response_model=schemas.Task)
def add_checklist_item(
    task_id: int,
    item: schemas.ChecklistItemCreate,
    db: Session = Depends(get_db)
):
    # Check if task exists
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Get current checklist
    current_checklist = task.checklist or []
    
    # Generate new ID (max ID + 1)
    new_id = 1
    if current_checklist:
        new_id = max(item["id"] for item in current_checklist) + 1
    
    # Create new checklist item
    new_item = {
        "id": new_id,
        "content": item.content,
        "is_completed": False
    }
    
    # Create a new list with all items
    updated_checklist = current_checklist + [new_item]
    
    # Update task
    task.checklist = updated_checklist
    db.commit()
    db.refresh(task)
    
    # Convert to schema and return
    return schemas.Task.model_validate(task)

@router.put("/{task_id}/checklist/{item_id}/toggle/", response_model=schemas.Task)
def toggle_checklist_item(
    task_id: int,
    item_id: int,
    db: Session = Depends(get_db)
):
    # Check if task exists
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Get current checklist
    current_checklist = task.checklist or []
    
    # Find and toggle the item
    item_found = False
    updated_checklist = []
    for item in current_checklist:
        if item["id"] == item_id:
            # Create a new dictionary with the toggled state
            updated_item = dict(item)
            updated_item["is_completed"] = not item["is_completed"]
            updated_checklist.append(updated_item)
            item_found = True
        else:
            updated_checklist.append(dict(item))
    
    if not item_found:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    
    # Update task with the new checklist
    task.checklist = updated_checklist
    db.commit()
    db.refresh(task)
    
    # Convert to schema and return
    return schemas.Task.model_validate(task) 