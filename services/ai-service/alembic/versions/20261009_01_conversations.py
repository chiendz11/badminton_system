import sqlalchemy as sa

from alembic import op

revision = "20261009_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "ai_conversations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("owner_id", sa.String(128), nullable=False),
        sa.Column("state", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_ai_conversations_owner_id", "ai_conversations", ["owner_id"])
    op.create_table(
        "ai_turns",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "conversation_id", sa.String(36), sa.ForeignKey("ai_conversations.id"), nullable=False
        ),
        sa.Column("client_id", sa.String(128), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("request", sa.JSON(), nullable=False),
        sa.Column("response", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("conversation_id", "client_id"),
    )
    op.create_index("ix_ai_turns_conversation_id", "ai_turns", ["conversation_id"])
    op.create_table(
        "ai_execution_traces",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "conversation_id", sa.String(36), sa.ForeignKey("ai_conversations.id"), nullable=False
        ),
        sa.Column("turn_id", sa.String(36), nullable=False),
        sa.Column("plan_version", sa.Integer(), nullable=False),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_ai_execution_traces_conversation_id", "ai_execution_traces", ["conversation_id"]
    )


def downgrade():
    op.drop_table("ai_execution_traces")
    op.drop_table("ai_turns")
    op.drop_table("ai_conversations")
