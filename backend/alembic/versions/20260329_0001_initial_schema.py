"""initial schema

Revision ID: 20260329_0001
Revises:
Create Date: 2026-03-29 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260329_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("dialer_ip", sa.String(length=128), nullable=False),
        sa.Column("dialer_user", sa.String(length=128), nullable=False),
        sa.Column("dialer_pass", sa.String(length=255), nullable=False),
        sa.Column("db_host", sa.String(length=128), nullable=False),
        sa.Column("db_user", sa.String(length=128), nullable=False),
        sa.Column("db_pass", sa.String(length=255), nullable=False),
        sa.Column("campaigns", sa.Text(), nullable=False),
        sa.Column("ingroups", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_clients_id"), "clients", ["id"], unique=False)
    op.create_index(op.f("ix_clients_name"), "clients", ["name"], unique=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("is_superuser", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)

    op.create_table(
        "client_prompts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_client_prompts_client_id"), "client_prompts", ["client_id"], unique=False)
    op.create_index(op.f("ix_client_prompts_id"), "client_prompts", ["id"], unique=False)

    op.create_table(
        "settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("audit_limit_per_day", sa.Integer(), nullable=False),
        sa.Column("min_call_duration", sa.Integer(), nullable=False),
        sa.Column("max_call_duration", sa.Integer(), nullable=False),
        sa.Column("agents", sa.JSON(), nullable=False),
        sa.Column("campaign_filter", sa.JSON(), nullable=False),
        sa.Column("ingroup_filter", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("client_id"),
    )
    op.create_index(op.f("ix_settings_id"), "settings", ["id"], unique=False)

    op.create_table(
        "call_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("call_id", sa.String(length=128), nullable=False),
        sa.Column("agent_id", sa.String(length=128), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration", sa.Integer(), nullable=False),
        sa.Column("recording_path", sa.String(length=1024), nullable=False),
        sa.Column("transcript", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_call_logs_agent_id"), "call_logs", ["agent_id"], unique=False)
    op.create_index(op.f("ix_call_logs_call_id"), "call_logs", ["call_id"], unique=True)
    op.create_index(op.f("ix_call_logs_client_id"), "call_logs", ["client_id"], unique=False)
    op.create_index(op.f("ix_call_logs_id"), "call_logs", ["id"], unique=False)

    op.create_table(
        "call_audits",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("call_id", sa.String(length=128), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("agent_id", sa.String(length=128), nullable=False),
        sa.Column("audit_json", sa.JSON(), nullable=False),
        sa.Column("total_score", sa.Float(), nullable=False),
        sa.Column("percentage", sa.Float(), nullable=False),
        sa.Column("ranking", sa.String(length=50), nullable=False),
        sa.Column("fatal_flag", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["call_id"], ["call_logs.call_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_call_audits_agent_id"), "call_audits", ["agent_id"], unique=False)
    op.create_index(op.f("ix_call_audits_call_id"), "call_audits", ["call_id"], unique=False)
    op.create_index(op.f("ix_call_audits_client_id"), "call_audits", ["client_id"], unique=False)
    op.create_index(op.f("ix_call_audits_id"), "call_audits", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_call_audits_id"), table_name="call_audits")
    op.drop_index(op.f("ix_call_audits_client_id"), table_name="call_audits")
    op.drop_index(op.f("ix_call_audits_call_id"), table_name="call_audits")
    op.drop_index(op.f("ix_call_audits_agent_id"), table_name="call_audits")
    op.drop_table("call_audits")

    op.drop_index(op.f("ix_call_logs_id"), table_name="call_logs")
    op.drop_index(op.f("ix_call_logs_client_id"), table_name="call_logs")
    op.drop_index(op.f("ix_call_logs_call_id"), table_name="call_logs")
    op.drop_index(op.f("ix_call_logs_agent_id"), table_name="call_logs")
    op.drop_table("call_logs")

    op.drop_index(op.f("ix_settings_id"), table_name="settings")
    op.drop_table("settings")

    op.drop_index(op.f("ix_client_prompts_id"), table_name="client_prompts")
    op.drop_index(op.f("ix_client_prompts_client_id"), table_name="client_prompts")
    op.drop_table("client_prompts")

    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")

    op.drop_index(op.f("ix_clients_name"), table_name="clients")
    op.drop_index(op.f("ix_clients_id"), table_name="clients")
    op.drop_table("clients")
