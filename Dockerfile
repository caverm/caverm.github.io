FROM node:22.22.0-bookworm-slim@sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94

ENV PNPM_HOME=/pnpm \
    PLAYWRIGHT_BROWSERS_PATH=/opt/playwright \
    COREPACK_HOME=/opt/corepack \
    ASTRO_TELEMETRY_DISABLED=1
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.14.4 --activate \
    && npx --yes playwright@1.56.1 install --with-deps chromium \
    && mkdir -p /workspace/node_modules /pnpm/store /opt/playwright \
    && chown -R node:node /workspace /pnpm /opt/playwright
ARG APP_UID=1000
ARG APP_GID=1000
RUN groupmod --gid "$APP_GID" node \
    && usermod --uid "$APP_UID" --gid "$APP_GID" node \
    && chown -R node:node /workspace /pnpm /opt/playwright /opt/corepack /home/node
WORKDIR /workspace
USER node
EXPOSE 4321
CMD ["pnpm", "dev", "--host", "0.0.0.0"]
