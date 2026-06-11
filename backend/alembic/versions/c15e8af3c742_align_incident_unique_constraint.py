"""align incident unique constraint

Revision ID: c15e8af3c742
Revises: 98ef466bdac4
Create Date: 2026-06-10 20:10
"""

from typing import Sequence, Union

from alembic import op


revision: str = "c15e8af3c742"
down_revision: Union[str, None] = "98ef466bdac4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM pg_indexes
                WHERE schemaname = current_schema()
                  AND tablename = 'incident_reports'
                  AND indexname = 'uq_incident_reports_project_ci_server_log'
            )
            AND NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'uq_incident_reports_project_ci_server_log'
            )
            THEN
                ALTER TABLE incident_reports
                ADD CONSTRAINT uq_incident_reports_project_ci_server_log
                UNIQUE USING INDEX uq_incident_reports_project_ci_server_log;
            END IF;
        END
        $$;
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE incident_reports
        DROP CONSTRAINT IF EXISTS uq_incident_reports_project_ci_server_log
    """)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_incident_reports_project_ci_server_log
        ON incident_reports(
            project_id,
            github_analysis_report_id,
            server_log_analysis_report_id
        )
    """)
