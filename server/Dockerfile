FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PATH="/home/game/.local/bin:$PATH"

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -g 1000 game \
    && useradd -u 1000 -g game -m -s /bin/bash game

RUN mkdir -p /app/data && chown -R game:game /app

COPY requirements.txt ./
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

COPY --chown=game:game . .

USER game

EXPOSE 8787

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8787", "--reload"]
