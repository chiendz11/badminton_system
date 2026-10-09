FROM python:3.12-slim AS build
COPY --from=ghcr.io/astral-sh/uv:0.8.22 /uv /uvx /bin/
WORKDIR /app
COPY services/ai-service/pyproject.toml services/ai-service/uv.lock ./
RUN uv sync --locked --no-dev --no-install-project --python /usr/local/bin/python
FROM python:3.12-slim
RUN useradd --create-home --uid 10001 app
WORKDIR /app
COPY --from=build --chown=app:app /app/.venv ./.venv
COPY --chown=app:app services/ai-service/app ./app
COPY --chown=app:app services/ai-service/alembic ./alembic
COPY --chown=app:app services/ai-service/alembic.ini ./alembic.ini
ENV PATH="/app/.venv/bin:$PATH" PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 APP_ENV=production
USER app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
