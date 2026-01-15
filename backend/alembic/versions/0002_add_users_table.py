"""add users table for premium status

Revision ID: 0002
Revises: 0001
Create Date: 2025-01-15

This migration adds the users table to track user premium status.
Premium status is linked to the user's Cognito ID and persists across sessions.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table for premium status tracking
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),  # Cognito sub
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('is_premium', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('premium_since', sa.DateTime(), nullable=True),
        sa.Column('promo_code_used', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_user_id'), 'users', ['user_id'], unique=True)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_user_id'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')
