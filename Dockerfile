FROM ghcr.io/astral-sh/uv:0.12.1 AS uv

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

RUN groupadd --system opssemble && useradd --system --gid opssemble --home-dir /app opssemble
WORKDIR /app

COPY --from=uv /uv /bin/uv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY monitoring ./monitoring
COPY opssemble_mcp ./opssemble_mcp
RUN chown -R opssemble:opssemble /app

USER opssemble
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=2)"
CMD ["uvicorn", "monitoring.app:app", "--host", "0.0.0.0", "--port", "8000"]
