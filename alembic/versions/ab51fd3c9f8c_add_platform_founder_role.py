"""add_platform_founder_role

Revision ID: ab51fd3c9f8c
Revises: 35178b962285
Create Date: 2025-06-21 21:12:19.753736

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ab51fd3c9f8c'
down_revision: Union[str, None] = '35178b962285'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add platform_founder to the UserRole enum
    op.execute("ALTER TYPE userrole ADD VALUE 'platform_founder'")


def downgrade() -> None:
    """Downgrade schema."""
    # Note: PostgreSQL doesn't support removing enum values directly
    # This would require recreating the enum type and updating all references
    # For now, we'll leave the enum value in place
    pass
