"""Migrate shared_with_emails array to shared_with JSONB with roles.

Revision ID: 0006
Revises: 0005
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    # Add new JSONB column
    op.add_column("babies", sa.Column("shared_with", JSONB, server_default="[]", nullable=False))

    # Migrate existing data: ["a@b.com", "c@d.com"] -> [{"email":"a@b.com","role":"caregiver"}, ...]
    op.execute("""
        UPDATE babies
        SET shared_with = (
            SELECT COALESCE(
                jsonb_agg(jsonb_build_object('email', elem, 'role', 'caregiver')),
                '[]'::jsonb
            )
            FROM unnest(shared_with_emails) AS elem
        )
        WHERE shared_with_emails IS NOT NULL
          AND array_length(shared_with_emails, 1) > 0
    """)

    # Drop old column
    op.drop_column("babies", "shared_with_emails")


def downgrade():
    # Re-add old column
    op.add_column("babies", sa.Column("shared_with_emails", sa.ARRAY(sa.String()), default=list))

    # Migrate back: extract emails from JSONB
    op.execute("""
        UPDATE babies
        SET shared_with_emails = (
            SELECT COALESCE(
                array_agg(elem->>'email'),
                ARRAY[]::varchar[]
            )
            FROM jsonb_array_elements(shared_with) AS elem
        )
        WHERE shared_with IS NOT NULL
          AND jsonb_array_length(shared_with) > 0
    """)

    # Drop JSONB column
    op.drop_column("babies", "shared_with")
