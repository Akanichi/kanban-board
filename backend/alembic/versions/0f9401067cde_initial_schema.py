"""initial_schema

Revision ID: 0f9401067cde
Revises: ec77c73c0f32
Create Date: 2025-01-08 11:07:23.307021

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0f9401067cde'
down_revision: Union[str, None] = 'ec77c73c0f32'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
