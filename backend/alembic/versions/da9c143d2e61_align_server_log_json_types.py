"""align server log json types

Revision ID: da9c143d2e61
Revises: c15e8af3c742
Create Date: 2026-06-10 20:25
"""

from typing import Sequence, Union

from alembic import op


revision: str = "da9c143d2e61"
down_revision: Union[str, None] = "c15e8af3c742"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


JSON_COLUMNS = (
    "evidence",
    "error_groups",
    "suspected_causes",
    "recommended_actions",
)


def upgrade() -> None:
    for column in JSON_COLUMNS:
        op.execute(f"""
            ALTER TABLE server_log_analysis_reports
            ALTER COLUMN {column} TYPE JSONB
            USING {column}::jsonb
        """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_server_logs_id
        ON server_logs(id)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_server_log_analysis_reports_id
        ON server_log_analysis_reports(id)
    """)


def downgrade() -> None:
    for column in JSON_COLUMNS:
        op.execute(f"""
            ALTER TABLE server_log_analysis_reports
            ALTER COLUMN {column} TYPE JSON
            USING {column}::json
        """)
