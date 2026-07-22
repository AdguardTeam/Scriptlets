# Multi-stage Dockerfile for scriptlets CI optimization
# Dependencies are cached until package.json/pnpm-lock.yaml change
# Each stage can be built independently via --target

FROM adguard/node-ssh:22.22--0 AS base
SHELL ["/bin/bash", "-lc"]

WORKDIR /scriptlets

ENV PNPM_STORE=/pnpm-store

# Cap the V8 old-space heap. Builds run on a shared remote BuildKit instance
# (the CI workflow throttles them via matrix max-parallel), and Node's default
# multi-GB heap lets eslint/Rollup grow far beyond what they need. 1536 MB is
# most of the 1800m buildx memory cap, leaving headroom for non-heap RSS while
# still forcing earlier GC than the unlimited default.
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Configure pnpm store globally so it doesn't need to be set in each stage
RUN pnpm config set store-dir /pnpm-store

# ============================================================================
# Stage: base-puppeteer
# Heavy base with bundled Chromium — used only for QUnit tests
# ============================================================================
FROM adguard/puppeteer-runner:22.21.1--24.35.0--0 AS base-puppeteer
SHELL ["/bin/bash", "-lc"]

WORKDIR /scriptlets

ENV PNPM_STORE=/pnpm-store
# Smaller than above so Chromium has more physical RAM available (its RSS
# can be significant when running many parallel browser tests)
# with 1800m buildx memory cap.
ENV NODE_OPTIONS="--max-old-space-size=1024"
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
# Stage: test
# Aggregate lint + full test suite on the puppeteer base.
# Consumed by the shared publish-release.yml (`--target test-output`).
# ============================================================================
FROM source-puppeteer AS test

ARG BUILD_RUN_ID

RUN --mount=type=cache,target=/pnpm-store,id=scriptlets-pnpm-puppeteer \
    echo "${BUILD_RUN_ID}" > /tmp/.build-run-id && \
    pnpm lint && \
    pnpm test && \
    mkdir -p /out && \
    touch /out/test.txt

FROM scratch AS test-output
COPY --from=test /out/ /

# ============================================================================
# Stage: build
# Creates library build
# ============================================================================
FROM source AS build

ARG BUILD_RUN_ID

RUN --mount=type=cache,target=/pnpm-store,id=scriptlets-pnpm \
    echo "${BUILD_RUN_ID}" > /tmp/.build-run-id && \
    pnpm build && \
    pnpm tgz && \
    mkdir -p /out && \
    mv scriptlets.tgz /out/

# build-output exports scriptlets.tgz at the root, so
# `docker build --target build-output --output ./artifacts` yields
# `artifacts/scriptlets.tgz` (no artifacts/artifacts/ double-nesting).
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

# Build dist + test bundles in a separate RUN (separate Node process) so the
# build's memory is released before Chrome is launched, reducing peak RSS
# under the CI builder's memory cap.
RUN --mount=type=cache,target=/pnpm-store,id=scriptlets-pnpm-puppeteer \
    echo "${BUILD_RUN_ID}" > /tmp/.build-run-id && \
    pnpm test:qunit:build

# Run only the browser tests in a fresh process. The runner closes each test
# page itself (see tests/index.js), so Chrome RSS stays bounded.
# Use trap to ensure exit-code.txt is always written, even on unexpected failures
RUN --mount=type=cache,target=/pnpm-store,id=scriptlets-pnpm-puppeteer \
    mkdir -p /out && \
    trap 'echo $? > /out/exit-code.txt' EXIT && \
    pnpm test:qunit:run

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

# Smoke tests run in Node (jsdom-level); Chromium is never launched. Setting
# PUPPETEER_SKIP_CHROMIUM_DOWNLOAD here as well guarantees no Chrome install
# is triggered while the smoke suite runs `pnpm install`/`pnpm build` in the
# packed-package sandbox — saving RAM and time on the shared builder.
# Use trap to ensure exit-code.txt is always written, even on unexpected failures
RUN --mount=type=cache,target=/pnpm-store,id=scriptlets-pnpm \
    echo "${BUILD_RUN_ID}" > /tmp/.build-run-id && \
    mkdir -p /out && \
    trap 'echo $? > /out/exit-code.txt' EXIT && \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true pnpm test:smoke

FROM scratch AS test-smoke-output
COPY --from=test-smoke /out/ /
