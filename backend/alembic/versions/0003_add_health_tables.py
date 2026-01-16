"""add teeth, sick_days, allergies tables

Revision ID: 0003
Revises: 0002
Create Date: 2025-01-15

Adds new health tracking tables:
- teeth: Track individual baby teeth emergence
- sick_days: Log illness episodes with symptoms
- allergies: Track known allergies for safety
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0003'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if teeth table already exists (idempotent)
    conn = op.get_bind()

    # Create teeth table
    result = conn.execute(sa.text(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'teeth')"
    ))
    if not result.scalar():
        op.create_table(
            'teeth',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('baby_id', sa.Integer(), nullable=False),
            sa.Column('position', sa.String(20), nullable=False),
            sa.Column('emerged_date', sa.DateTime(), nullable=False),
            sa.Column('notes', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['baby_id'], ['babies.id']),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_teeth_id'), 'teeth', ['id'], unique=False)
        op.create_index(op.f('ix_teeth_baby_id'), 'teeth', ['baby_id'], unique=False)

    # Create sick_days table
    result = conn.execute(sa.text(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sick_days')"
    ))
    if not result.scalar():
        op.create_table(
            'sick_days',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('baby_id', sa.Integer(), nullable=False),
            sa.Column('date', sa.DateTime(), nullable=False),
            sa.Column('symptoms', postgresql.ARRAY(sa.String()), nullable=True),
            sa.Column('temperature', sa.Numeric(4, 1), nullable=True),
            sa.Column('notes', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['baby_id'], ['babies.id']),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_sick_days_id'), 'sick_days', ['id'], unique=False)
        op.create_index(op.f('ix_sick_days_baby_id'), 'sick_days', ['baby_id'], unique=False)

    # Create allergies table
    result = conn.execute(sa.text(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'allergies')"
    ))
    if not result.scalar():
        op.create_table(
            'allergies',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('baby_id', sa.Integer(), nullable=False),
            sa.Column('allergen', sa.String(100), nullable=False),
            sa.Column('severity', sa.String(20), nullable=True),
            sa.Column('reaction', sa.String(), nullable=True),
            sa.Column('discovered_date', sa.DateTime(), nullable=True),
            sa.Column('notes', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['baby_id'], ['babies.id']),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_allergies_id'), 'allergies', ['id'], unique=False)
        op.create_index(op.f('ix_allergies_baby_id'), 'allergies', ['baby_id'], unique=False)


def downgrade() -> None:
    # Drop allergies table
    op.drop_index(op.f('ix_allergies_baby_id'), table_name='allergies')
    op.drop_index(op.f('ix_allergies_id'), table_name='allergies')
    op.drop_table('allergies')

    # Drop sick_days table
    op.drop_index(op.f('ix_sick_days_baby_id'), table_name='sick_days')
    op.drop_index(op.f('ix_sick_days_id'), table_name='sick_days')
    op.drop_table('sick_days')

    # Drop teeth table
    op.drop_index(op.f('ix_teeth_baby_id'), table_name='teeth')
    op.drop_index(op.f('ix_teeth_id'), table_name='teeth')
    op.drop_table('teeth')
