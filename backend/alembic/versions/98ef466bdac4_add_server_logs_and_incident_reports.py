"""add server logs and incident reports

Revision ID: 98ef466bdac4
Revises: 65ebcea9d4ca
Create Date: 2026-06-10 19:02
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "98ef466bdac4"
down_revision: Union[str, None] = "65ebcea9d4ca"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # CI analysis v2 metadata columns
    op.execute("""
        ALTER TABLE ci_analysis_reports
        ADD COLUMN IF NOT EXISTS matched_patterns JSONB NOT NULL DEFAULT '[]'::jsonb
    """)

    op.execute("""
        ALTER TABLE ci_analysis_reports
        ADD COLUMN IF NOT EXISTS analysis_score INTEGER
    """)

    op.execute("""
        ALTER TABLE ci_analysis_reports
        ADD COLUMN IF NOT EXISTS engine_version VARCHAR(100)
    """)

    # Server log upload table
    op.execute("""
        CREATE TABLE IF NOT EXISTS server_logs (
            id SERIAL PRIMARY KEY,
            project_id INTEGER NOT NULL REFERENCES projects(id),
            filename VARCHAR(255) NOT NULL,
            content_type VARCHAR(100),
            size_bytes INTEGER NOT NULL,
            source VARCHAR(100),
            raw_content TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_server_logs_project_id
        ON server_logs(project_id)
    """)

    # Server log analysis reports
    op.execute("""
        CREATE TABLE IF NOT EXISTS server_log_analysis_reports (
            id SERIAL PRIMARY KEY,
            project_id INTEGER NOT NULL REFERENCES projects(id),
            server_log_id INTEGER NOT NULL REFERENCES server_logs(id),
            category VARCHAR(100) NOT NULL,
            severity VARCHAR(50) NOT NULL,
            summary TEXT NOT NULL,
            evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
            error_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
            suspected_causes JSONB NOT NULL DEFAULT '[]'::jsonb,
            recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
            analysis_score INTEGER,
            engine_version VARCHAR(100),
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_server_log_analysis_reports_project_id
        ON server_log_analysis_reports(project_id)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_server_log_analysis_reports_server_log_id
        ON server_log_analysis_reports(server_log_id)
    """)

    # Integrated incident reports
    op.execute("""
        CREATE TABLE IF NOT EXISTS incident_reports (
            id SERIAL PRIMARY KEY,
            project_id INTEGER NOT NULL REFERENCES projects(id),
            github_analysis_report_id INTEGER NOT NULL REFERENCES ci_analysis_reports(id),
            server_log_analysis_report_id INTEGER NOT NULL REFERENCES server_log_analysis_reports(id),
            status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
            title TEXT NOT NULL,
            severity VARCHAR(50) NOT NULL,
            summary TEXT NOT NULL,
            combined_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
            root_cause_candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
            recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
            analysis_score INTEGER,
            engine_version VARCHAR(100) NOT NULL DEFAULT 'loglens-incident-engine-v1',
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_incident_reports_project_id
        ON incident_reports(project_id)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_incident_reports_github_analysis_report_id
        ON incident_reports(github_analysis_report_id)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_incident_reports_server_log_analysis_report_id
        ON incident_reports(server_log_analysis_report_id)
    """)

    # Remove duplicated incident reports before adding unique index.
    # This keeps the earliest row for each identical combination.
    op.execute("""
        DELETE FROM incident_reports a
        USING incident_reports b
        WHERE a.id > b.id
          AND a.project_id = b.project_id
          AND a.github_analysis_report_id = b.github_analysis_report_id
          AND a.server_log_analysis_report_id = b.server_log_analysis_report_id
    """)

    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_incident_reports_project_ci_server_log
        ON incident_reports(project_id, github_analysis_report_id, server_log_analysis_report_id)
    """)


def downgrade() -> None:
    # server_logs and server_log_analysis_reports existed before this combined
    # revision in some environments. Preserve those tables and their data.
    op.execute("DROP INDEX IF EXISTS uq_incident_reports_project_ci_server_log")
    op.execute("DROP INDEX IF EXISTS ix_incident_reports_server_log_analysis_report_id")
    op.execute("DROP INDEX IF EXISTS ix_incident_reports_github_analysis_report_id")
    op.execute("DROP INDEX IF EXISTS ix_incident_reports_project_id")
    op.execute("DROP TABLE IF EXISTS incident_reports")
