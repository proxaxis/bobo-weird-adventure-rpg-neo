FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    openssh-client \
    gnupg \
    jq \
    iputils-ping \
    dnsutils \
    net-tools \
    docker.io \
    docker-compose-v2 \
    python3 \
    python3-pip \
    dumb-init \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    fonts-liberation \
    fonts-ipafont-gothic \
    fonts-ipafont-mincho \
    xauth \
    x11-apps \
    xvfb \
    mesa-utils \
    ffmpeg \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2t64 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p -m 755 /etc/apt/keyrings \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
    && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install -y --no-install-recommends gh \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g puppeteer playwright \
    && npx playwright install --with-deps chromium

RUN printf '%s\n' \
    '#!/bin/bash' \
    'if [ -n "$GIT_USER_NAME" ]; then' \
    '  git config --global user.name "$GIT_USER_NAME"' \
    'fi' \
    'if [ -n "$GIT_USER_EMAIL" ]; then' \
    '  git config --global user.email "$GIT_USER_EMAIL"' \
    'fi' \
    'git config --global --add safe.directory "*"' \
    'if [ -n "$GITHUB_TOKEN" ]; then' \
    '  echo "$GITHUB_TOKEN" | gh auth login --with-token 2>/dev/null || true' \
    '  git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"' \
    'fi' \
    'exec "$@"' > /entrypoint.sh \
    && chmod +x /entrypoint.sh

WORKDIR /workspace

ENTRYPOINT ["/usr/bin/dumb-init", "--", "/entrypoint.sh"]

CMD ["sleep", "infinity"]