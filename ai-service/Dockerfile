# Stage 1: Build/Deps
FROM python:3.11-slim AS build
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim
WORKDIR /app
RUN useradd --create-home appuser && chown appuser:appuser /app
COPY --from=build /usr/local /usr/local
COPY --chown=appuser:appuser src/ ./src/
USER appuser
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "8000"]
