# Multi-stage Dockerfile for scriptlets CI optimization
# Dependencies are cached until package.json/pnpm-lock.yaml change
# Each stage can be built independently via --target

FROM adguard/node-ssh:22.22--0 AS base
SHELL ["/bin/bash", "-lc"]

WORKDIR /scriptlets

ENV PNPM_STORE=/pnpm-store

# Cap the V8 old-space heap. Builds run on a shared remote BuildKit instance
# (the CI workflow runs lint/vitest/qunit/smoke/build as strictly sequential
# steps within a single job to avoid crashing the shared builder), and Node's
# default multi-GB heap lets eslint/Rollup grow far beyond what they need.
# 1536 MB is most of the 1800m buildx memory cap, leaving headroom for non-heap
# RSS while still forcing earlier GC than the unlimited default.
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
# Stage: test-output
# Aggregate of all granular verification stages. Consumed by the shared
# publish-release.yml (`--target test-output`). Composing from the granular
# outputs (the same stages ci.yml builds individually) gives the check set a
# single definition and avoids re-executing lint + tests from scratch.
# BuildKit resolves named stages regardless of position, so the COPY
# directives below can reference stages defined later in this file.
# ============================================================================
FROM scratch AS test-output
COPY --from=lint /out/ /
COPY --from=test-vitest /out/ /
COPY --from=test-qunit /out/ /
COPY --from=test-smoke /out/ /

# ============================================================================
# Stage: dist
# Builds the library dist/ once; shared by the build and test-smoke stages
# so the library is not built multiple times per CI run (QUnit keeps its own
# build on the puppeteer base).
# ============================================================================
FROM source AS dist

ARG BUILD_RUN_ID

RUN --mount=type=cache,target=/pnpm-store,id=scriptlets-pnpm \
    echo "${BUILD_RUN_ID}" > /tmp/.build-run-id && \
    pnpm build

# ============================================================================
# Stage: build
# Packs the pre-built dist/ into a tarball.
# ============================================================================
FROM dist AS build

ARG BUILD_RUN_ID

RUN --mount=type=cache,target=/pnpm-store,id=scriptlets-pnpm \
    echo "${BUILD_RUN_ID}" > /tmp/.build-run-id && \
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
    cp -r wiki /out/wiki

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
RUN --mount=type=cache,target=/pnpm-store,id=scriptlets-pnpm-puppeteer \
    mkdir -p /out && \
    touch /out/qunit.txt && \
    pnpm test:qunit:run

FROM scratch AS test-qunit-output
COPY --from=test-qunit /out/ /

# ============================================================================
# Stage: test-vitest
# Runs Vitest tests
# ============================================================================
FROM source AS test-vitest

ARG BUILD_RUN_ID

RUN --mount=type=cache,target=/pnpm-store,id=scriptlets-pnpm \
    echo "${BUILD_RUN_ID}" > /tmp/.build-run-id && \
    mkdir -p /out && \
    touch /out/vitest.txt && \
    pnpm test:vitest

FROM scratch AS test-vitest-output
COPY --from=test-vitest /out/ /

# ============================================================================
# Stage: test-smoke
# Runs smoke tests against the pre-built tarball from the build stage, avoiding
# a redundant `pnpm build` inside test.sh.
# ============================================================================
FROM source AS test-smoke

ARG BUILD_RUN_ID

COPY --from=build /out/scriptlets.tgz /tmp/scriptlets.tgz

# Smoke tests run in Node (jsdom-level); Chromium is never launched. Setting
# PUPPETEER_SKIP_CHROMIUM_DOWNLOAD here as well guarantees no Chrome install
# is triggered while the smoke suite runs `pnpm install` in the packed-package
# sandbox — saving RAM and time on the shared builder.
# SMOKE_TGZ_PATH tells test.sh to use the pre-built tarball instead of
# stamping + building + packing locally.
RUN --mount=type=cache,target=/pnpm-store,id=scriptlets-pnpm \
    echo "${BUILD_RUN_ID}" > /tmp/.build-run-id && \
    mkdir -p /out && \
    touch /out/smoke.txt && \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    SMOKE_TGZ_PATH=/tmp/scriptlets.tgz pnpm test:smoke

FROM scratch AS test-smoke-output
COPY --from=test-smoke /out/ /
