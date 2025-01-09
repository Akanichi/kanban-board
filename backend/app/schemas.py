from pydantic import BaseModel, EmailStr, validator, field_serializer
from datetime import datetime
from typing import Optional, List, Dict, Any
from .models import TaskStatus

class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime

    @field_serializer('created_at')
    def serialize_datetime(self, dt: datetime) -> str:
        return dt.isoformat()

    class Config:
        from_attributes = True

class TeamMemberBase(BaseModel):
    role: str = 'member'

    @validator('role')
    def validate_role(cls, v):
        if v not in ['admin', 'member']:
            raise ValueError('Role must be either admin or member')
        return v

class TeamMemberCreate(TeamMemberBase):
    user_id: int

class TeamMember(TeamMemberBase):
    user: User

    class Config:
        from_attributes = True

class TeamBase(BaseModel):
    name: str
    description: Optional[str] = None

class TeamCreate(TeamBase):
    pass

class Team(TeamBase):
    id: int
    created_at: datetime
    created_by_id: int
    team_memberships: List[TeamMember] = []
    created_by: User

    @field_serializer('created_at')
    def serialize_datetime(self, dt: datetime) -> str:
        return dt.isoformat()

    class Config:
        from_attributes = True

class BoardMemberBase(BaseModel):
    role: str = 'member'

    @validator('role')
    def validate_role(cls, v):
        if v not in ['admin', 'member']:
            raise ValueError('Role must be either admin or member')
        return v

class BoardMemberCreate(BoardMemberBase):
    user_id: int

class BoardMember(BoardMemberBase):
    user: User

    class Config:
        from_attributes = True

class BoardBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = False

class BoardCreate(BoardBase):
    team_id: int

class Board(BoardBase):
    id: int
    created_at: datetime
    created_by_id: int
    team_id: int
    board_memberships: List[BoardMember] = []
    created_by: User
    team: Team

    @field_serializer('created_at')
    def serialize_datetime(self, dt: datetime) -> str:
        return dt.isoformat()

    class Config:
        from_attributes = True

class LabelBase(BaseModel):
    name: str
    color: str

class LabelCreate(LabelBase):
    pass

class Label(LabelBase):
    id: int

    class Config:
        from_attributes = True

class CommentBase(BaseModel):
    content: str

class CommentCreate(CommentBase):
    task_id: int

class Comment(CommentBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    task_id: int
    user_id: int
    user_name: str

    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        return dt.isoformat()

    class Config:
        from_attributes = True

class AttachmentBase(BaseModel):
    filename: str
    url: str

class AttachmentCreate(AttachmentBase):
    task_id: int
    user_id: Optional[int] = None

class Attachment(AttachmentBase):
    id: int
    created_at: datetime
    task_id: int
    user_id: Optional[int] = None

    @field_serializer('created_at')
    def serialize_datetime(self, dt: datetime) -> str:
        return dt.isoformat()

    class Config:
        from_attributes = True

class ChecklistItemBase(BaseModel):
    content: str

class ChecklistItemCreate(ChecklistItemBase):
    pass

class ChecklistItem(ChecklistItemBase):
    id: int
    is_completed: bool = False

    class Config:
        from_attributes = True

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = TaskStatus.TODO
    priority: Optional[str] = 'low'
    due_date: Optional[datetime] = None
    position: Optional[int] = None
    checklist: List[ChecklistItem] = []

    @validator('priority')
    def validate_priority(cls, v):
        if v is None:
            return 'low'
        if v not in ['high', 'medium', 'low']:
            raise ValueError('Priority must be one of: high, medium, low')
        return v

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = 'low'
    due_date: Optional[str] = None
    position: Optional[int] = None
    checklist: Optional[List[ChecklistItem]] = None
    is_archived: Optional[bool] = None

    @validator('priority')
    def validate_priority(cls, v):
        if v is None:
            return 'low'
        if v not in ['high', 'medium', 'low']:
            raise ValueError('Priority must be one of: high, medium, low')
        return v

    @validator('due_date')
    def validate_due_date(cls, v):
        if v is None:
            return None
        try:
            # Parse the date string and convert it to datetime
            return datetime.strptime(v, '%Y-%m-%d')
        except ValueError:
            raise ValueError('Invalid date format. Use YYYY-MM-DD')

class Task(TaskBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    creator_id: Optional[int] = None
    board_id: int
    is_archived: bool = False
    creator: Optional[User] = None
    board: Board
    assigned_to: List[User] = []
    labels: List[Label] = []
    comments: List[Comment] = []
    attachments: List[Attachment] = []
    checklist: List[ChecklistItem] = []

    @field_serializer('due_date')
    def serialize_due_date(self, due_date: Optional[datetime]) -> Optional[str]:
        if due_date is None:
            return None
        return due_date.strftime('%Y-%m-%d')

    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        return dt.isoformat()

    @field_serializer('checklist')
    def serialize_checklist(self, checklist: List[Dict]) -> List[ChecklistItem]:
        if not checklist:
            return []
        # Handle both dictionary and ChecklistItem inputs
        result = []
        for item in checklist:
            if isinstance(item, dict):
                result.append(ChecklistItem(
                    id=item["id"],
                    content=item["content"],
                    is_completed=item["is_completed"]
                ))
            else:
                result.append(item)
        return result

    class Config:
        from_attributes = True

class TaskWithDetails(Task):
    checklist_completion: Dict[str, Any] = {
        "total": 0,
        "completed": 0,
        "percentage": 0
    } 