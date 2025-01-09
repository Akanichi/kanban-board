"""add_team_and_board_tables

Revision ID: ec77c73c0f32
Revises: a1d7c40feb4c
Create Date: 2025-01-08 11:03:56.411332

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ec77c73c0f32'
down_revision: Union[str, None] = 'a1d7c40feb4c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create teams table
    op.create_table(
        'teams',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_teams_name'), 'teams', ['name'], unique=False)

    # Create team_members association table
    op.create_table(
        'team_members',
        sa.Column('team_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(), nullable=False, server_default='member'),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('team_id', 'user_id')
    )

    # Create boards table
    op.create_table(
        'boards',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('team_id', sa.Integer(), nullable=False),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default='false'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_boards_name'), 'boards', ['name'], unique=False)

    # Create board_members association table
    op.create_table(
        'board_members',
        sa.Column('board_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(), nullable=False, server_default='member'),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['board_id'], ['boards.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('board_id', 'user_id')
    )

    # Add board_id to tasks table
    op.add_column('tasks', sa.Column('board_id', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'tasks', 'boards', ['board_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    # Remove board_id from tasks
    op.drop_constraint(None, 'tasks', type_='foreignkey')
    op.drop_column('tasks', 'board_id')

    # Drop board_members table
    op.drop_table('board_members')

    # Drop boards table
    op.drop_index(op.f('ix_boards_name'), table_name='boards')
    op.drop_table('boards')

    # Drop team_members table
    op.drop_table('team_members')

    # Drop teams table
    op.drop_index(op.f('ix_teams_name'), table_name='teams')
    op.drop_table('teams')
