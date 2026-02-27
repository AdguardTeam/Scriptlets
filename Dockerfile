# Multi-stage Dockerfile for scriptlets CI optimization
# Dependencies are cached until package.json/pnpm-lock.yaml change
# Each stage can be built independently via --target

FROM node:22.21.1-slim AS base
SHELL ["/bin/bash", "-lc"]

USER root

# Install git (not included in slim image) and pnpm, then configure git
RUN apt-get update && \
    apt-get install -y --no-install-recommends git && \
    rm -rf /var/lib/apt/lists/* && \
    npm install -g pnpm@10.7.1 && \
    git config --global --add safe.directory '*'

WORKDIR /scriptlets

ENV PNPM_STORE=/pnpm-store

# Configure pnpm store globally so it doesn't need to be set in each stage
RUN pnpm config set store-dir /pnpm-store

# ============================================================================
# Stage: base-puppeteer
# Heavy base with bundled Chromium — used only for QUnit tests
# node v22.21.1 is used in this image
# ============================================================================
FROM ghcr.io/puppeteer/puppeteer:24.35.0 AS base-puppeteer
SHELL ["/bin/bash", "-lc"]

# by default the puppeteer image is run as a non-root user "pptruser"
# but root user is needed for global npm installs
USER root

# Install pnpm globally and configure git
RUN npm install -g pnpm@10.7.1 && \
    git config --global --add safe.directory '*'

WORKDIR /scriptlets

ENV PNPM_STORE=/pnpm-store
# Point puppeteer to the cache directory where Chrome is pre-installed in the Docker image
ENV PUPPETEER_CACHE_DIR=/home/pptruser/.cache/puppeteer

# Configure pnpm store globally so it doesn't need to be set in each stage
RUN pnpm config set store-dir /pnpm-store

# ============================================================================
# Stage: deps
# Cached until package.json/pnpm-lock.yaml changes
# ============================================================================
FROM base AS deps

COPY package.json pnpm-lock.yaml ./

RUN --mount=type=cache,target=/pnpm-store,id=scriptlets-pnpm \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true pnpm install \
        --frozen-lockfile \
        --prefer-offline

# ============================================================================
# Stage: deps-puppeteer
# Dependencies installed on the puppeteer base (Chromium download not skipped)
# ============================================================================
FROM base-puppeteer AS deps-puppeteer

COPY package.json pnpm-lock.yaml ./

RUN --mount=type=cache,target=/pnpm-store,id=scriptlets-pnpm-puppeteer \
    pnpm install \
        --frozen-lockfile \
        --prefer-offline

# ============================================================================
# Stage: source
# Cached until source code changes
# Has source + node_modules
# ============================================================================
FROM deps AS source

COPY . /scriptlets

# ============================================================================
# Stage: source-puppeteer
# Source + deps on the puppeteer base — parent of browser-based test stages
# ============================================================================
FROM deps-puppeteer AS source-puppeteer

COPY . /scriptlets

# ============================================================================
# Stage: build
# Creates library build
# ============================================================================
FROM source AS build

ARG BUILD_RUN_ID

RUN --mount=type=cache,target=/pnpm-store,id=scriptlets-pnpm \
    echo "${BUILD_RUN_ID}" > /tmp/.build-run-id && \
    pnpm build && \
    mkdir -p /out/artifacts && \
    cp dist/scriptlets.corelibs.json /out/artifacts/ && \
    cp dist/redirects.json /out/artifacts/ && \
    cp dist/build.txt /out/artifacts/ 2>/dev/null || true

FROM scratch AS build-output
COPY --from=build /out/ /

# ============================================================================
# Stage: wiki
# Builds documentation (wiki)
# ============================================================================
FROM source AS wiki

ARG BUILD_RUN_ID

RUN --mount=type=cache,target=/pnpm-store,id=scriptlets-pnpm \
    echo "${BUILD_RUN_ID}" > /tmp/.build-run-id && \
    pnpm wiki && \
    mkdir -p /out && \
    touch /out/wiki.txt

FROM scratch AS wiki-output
COPY --from=wiki /out/ /

# ============================================================================
# Stage: lint
# Runs all linting
# ============================================================================
FROM source AS lint

ARG BUILD_RUN_ID

RUN --mount=type=cache,target=/pnpm-store,id=scriptlets-pnpm \
    echo "${BUILD_RUN_ID}" > /tmp/.build-run-id && \
    pnpm lint && \
    mkdir -p /out && \
    touch /out/lint.txt

FROM scratch AS lint-output
COPY --from=lint /out/ /

# ============================================================================
# Stage: test-qunit
# Runs QUnit tests
# ============================================================================
FROM source-puppeteer AS test-qunit

ARG BUILD_RUN_ID

# Use trap to ensure exit-code.txt is always written, even on unexpected failures
RUN --mount=type=cache,target=/pnpm-store,id=scriptlets-pnpm-puppeteer \
    echo "${BUILD_RUN_ID}" > /tmp/.build-run-id && \
    mkdir -p /out && \
    trap 'echo $? > /out/exit-code.txt' EXIT && \
    pnpm test:qunit

FROM scratch AS test-qunit-output
COPY --from=test-qunit /out/ /

# ============================================================================
# Stage: test-vitest
# Runs Vitest tests
# ============================================================================
FROM source AS test-vitest

ARG BUILD_RUN_ID

# Use trap to ensure exit-code.txt is always written, even on unexpected failures
RUN --mount=type=cache,target=/pnpm-store,id=scriptlets-pnpm \
    echo "${BUILD_RUN_ID}" > /tmp/.build-run-id && \
    mkdir -p /out && \
    trap 'echo $? > /out/exit-code.txt' EXIT && \
    pnpm test:vitest

FROM scratch AS test-vitest-output
COPY --from=test-vitest /out/ /

# ============================================================================
# Stage: test-smoke
# Runs smoke tests
# ============================================================================
FROM source AS test-smoke

ARG BUILD_RUN_ID

# Use trap to ensure exit-code.txt is always written, even on unexpected failures
RUN --mount=type=cache,target=/pnpm-store,id=scriptlets-pnpm \
    echo "${BUILD_RUN_ID}" > /tmp/.build-run-id && \
    mkdir -p /out && \
    trap 'echo $? > /out/exit-code.txt' EXIT && \
    pnpm test:smoke

FROM scratch AS test-smoke-output
COPY --from=test-smoke /out/ /

# ============================================================================
# Stage: full-build
# Creates complete build with tarball for npm publish
# ============================================================================
FROM source AS full-build

ARG BUILD_RUN_ID

RUN --mount=type=cache,target=/pnpm-store,id=scriptlets-pnpm \
    echo "${BUILD_RUN_ID}" > /tmp/.build-run-id && \
    pnpm build && \
    pnpm pack --out scriptlets.tgz && \
    mkdir -p /out/artifacts && \
    cp scriptlets.tgz /out/artifacts/ && \
    cp dist/build.txt /out/artifacts/ 2>/dev/null || true

FROM scratch AS full-build-output
COPY --from=full-build /out/ /
