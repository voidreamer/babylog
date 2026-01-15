"""baseline from existing schema

Revision ID: 0001
Revises:
Create Date: 2025-01-07

This is the baseline migration representing the existing database schema.
It was created from the manual SQL migrations (001-007) that were already applied.

When running on an existing database, use: alembic stamp 0001
This marks the migration as complete without running it.

For new databases, this creates the full schema.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create babies table
    op.create_table(
        'babies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('owner_email', sa.String(), nullable=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('birth_date', sa.DateTime(), nullable=True),
        sa.Column('gender', sa.String(), nullable=True),
        sa.Column('shared_with_emails', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_babies_id'), 'babies', ['id'], unique=False)
    op.create_index(op.f('ix_babies_user_id'), 'babies', ['user_id'], unique=False)

    # Create feedings table
    op.create_table(
        'feedings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('baby_id', sa.Integer(), nullable=False),
        sa.Column('time', sa.DateTime(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=True),
        sa.Column('amount_ml', sa.Integer(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['baby_id'], ['babies.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_feedings_id'), 'feedings', ['id'], unique=False)

    # Create diapers table
    op.create_table(
        'diapers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('baby_id', sa.Integer(), nullable=False),
        sa.Column('time', sa.DateTime(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('poo_color', sa.String(), nullable=True),
        sa.Column('poo_consistency', sa.String(), nullable=True),
        sa.Column('poo_amount', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['baby_id'], ['babies.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_diapers_id'), 'diapers', ['id'], unique=False)

    # Create sleeps table
    op.create_table(
        'sleeps',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('baby_id', sa.Integer(), nullable=False),
        sa.Column('start_time', sa.DateTime(), nullable=False),
        sa.Column('end_time', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['baby_id'], ['babies.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sleeps_id'), 'sleeps', ['id'], unique=False)

    # Create pumpings table
    op.create_table(
        'pumpings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('baby_id', sa.Integer(), nullable=False),
        sa.Column('time', sa.DateTime(), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=True),
        sa.Column('amount_ml', sa.Integer(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['baby_id'], ['babies.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_pumpings_id'), 'pumpings', ['id'], unique=False)

    # Create doctor_visits table
    op.create_table(
        'doctor_visits',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('baby_id', sa.Integer(), nullable=False),
        sa.Column('visit_date', sa.DateTime(), nullable=False),
        sa.Column('doctor_name', sa.String(200), nullable=True),
        sa.Column('visit_type', sa.String(50), nullable=True),
        sa.Column('weight_kg', sa.Numeric(5, 2), nullable=True),
        sa.Column('height_cm', sa.Numeric(5, 2), nullable=True),
        sa.Column('head_cm', sa.Numeric(5, 2), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['baby_id'], ['babies.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_doctor_visits_id'), 'doctor_visits', ['id'], unique=False)

    # Create vaccinations table
    op.create_table(
        'vaccinations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('baby_id', sa.Integer(), nullable=False),
        sa.Column('vaccine_name', sa.String(200), nullable=False),
        sa.Column('dose_number', sa.Integer(), nullable=True),
        sa.Column('given_date', sa.DateTime(), nullable=False),
        sa.Column('next_due_date', sa.DateTime(), nullable=True),
        sa.Column('administered_by', sa.String(200), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['baby_id'], ['babies.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_vaccinations_id'), 'vaccinations', ['id'], unique=False)

    # Create medications table
    op.create_table(
        'medications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('baby_id', sa.Integer(), nullable=False),
        sa.Column('medication_name', sa.String(200), nullable=False),
        sa.Column('dosage', sa.String(100), nullable=True),
        sa.Column('frequency', sa.String(100), nullable=True),
        sa.Column('start_date', sa.DateTime(), nullable=False),
        sa.Column('end_date', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['baby_id'], ['babies.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_medications_id'), 'medications', ['id'], unique=False)

    # Create milestones table
    op.create_table(
        'milestones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('baby_id', sa.Integer(), nullable=False),
        sa.Column('milestone_type', sa.String(100), nullable=False),
        sa.Column('achieved_date', sa.DateTime(), nullable=False),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['baby_id'], ['babies.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_milestones_id'), 'milestones', ['id'], unique=False)

    # Create growth_records table
    op.create_table(
        'growth_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('baby_id', sa.Integer(), nullable=False),
        sa.Column('recorded_date', sa.DateTime(), nullable=False),
        sa.Column('weight_kg', sa.Numeric(5, 2), nullable=True),
        sa.Column('height_cm', sa.Numeric(5, 2), nullable=True),
        sa.Column('head_cm', sa.Numeric(5, 2), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['baby_id'], ['babies.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_growth_records_id'), 'growth_records', ['id'], unique=False)

    # Create potty table
    op.create_table(
        'potty',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('baby_id', sa.Integer(), nullable=False),
        sa.Column('time', sa.DateTime(), nullable=False),
        sa.Column('result', sa.String(), nullable=False),
        sa.Column('potty_type', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['baby_id'], ['babies.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_potty_id'), 'potty', ['id'], unique=False)

    # Create tummy_time table
    op.create_table(
        'tummy_time',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('baby_id', sa.Integer(), nullable=False),
        sa.Column('start_time', sa.DateTime(), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['baby_id'], ['babies.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tummy_time_id'), 'tummy_time', ['id'], unique=False)

    # Create baths table
    op.create_table(
        'baths',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('baby_id', sa.Integer(), nullable=False),
        sa.Column('time', sa.DateTime(), nullable=False),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['baby_id'], ['babies.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_baths_id'), 'baths', ['id'], unique=False)

    # Create supplements table
    op.create_table(
        'supplements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('baby_id', sa.Integer(), nullable=False),
        sa.Column('time', sa.DateTime(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('dosage', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['baby_id'], ['babies.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_supplements_id'), 'supplements', ['id'], unique=False)


def downgrade() -> None:
    # Drop all tables in reverse order (children first)
    op.drop_index(op.f('ix_supplements_id'), table_name='supplements')
    op.drop_table('supplements')

    op.drop_index(op.f('ix_baths_id'), table_name='baths')
    op.drop_table('baths')

    op.drop_index(op.f('ix_tummy_time_id'), table_name='tummy_time')
    op.drop_table('tummy_time')

    op.drop_index(op.f('ix_potty_id'), table_name='potty')
    op.drop_table('potty')

    op.drop_index(op.f('ix_growth_records_id'), table_name='growth_records')
    op.drop_table('growth_records')

    op.drop_index(op.f('ix_milestones_id'), table_name='milestones')
    op.drop_table('milestones')

    op.drop_index(op.f('ix_medications_id'), table_name='medications')
    op.drop_table('medications')

    op.drop_index(op.f('ix_vaccinations_id'), table_name='vaccinations')
    op.drop_table('vaccinations')

    op.drop_index(op.f('ix_doctor_visits_id'), table_name='doctor_visits')
    op.drop_table('doctor_visits')

    op.drop_index(op.f('ix_pumpings_id'), table_name='pumpings')
    op.drop_table('pumpings')

    op.drop_index(op.f('ix_sleeps_id'), table_name='sleeps')
    op.drop_table('sleeps')

    op.drop_index(op.f('ix_diapers_id'), table_name='diapers')
    op.drop_table('diapers')

    op.drop_index(op.f('ix_feedings_id'), table_name='feedings')
    op.drop_table('feedings')

    op.drop_index(op.f('ix_babies_user_id'), table_name='babies')
    op.drop_index(op.f('ix_babies_id'), table_name='babies')
    op.drop_table('babies')
