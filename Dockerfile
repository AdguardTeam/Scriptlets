# Multi-stage Dockerfile for scriptlets CI optimization
# Dependencies are cached until package.json/pnpm-lock.yaml change
# Each stage can be built independently via --target

FROM adguard/puppeteer-runner:22.14--24.5--1 AS base
SHELL ["/bin/bash", "-lc"]

# Install additional tools if needed
RUN npm install -g pnpm@10.7.1

# Prevent "dubious ownership" error in git
RUN git config --global --add safe.directory '*'

WORKDIR /scriptlets

ENV PNPM_STORE=/pnpm-store

# ============================================================================
# Stage: deps
# Cached until package.json/pnpm-lock.yaml changes
# ============================================================================
FROM base AS deps

COPY package.json pnpm-lock.yaml ./

RUN --mount=type=cache,target=/pnpm-store,id=scriptlets-pnpm \
    pnpm config set store-dir /pnpm-store && \
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
# Stage: build
# Creates library build
# ============================================================================
FROM source AS build

ARG BUILD_RUN_ID

RUN --mount=type=cache,target=/pnpm-store,id=scriptlets-pnpm \
    echo "${BUILD_RUN_ID}" > /tmp/.build-run-id && \
    pnpm config set store-dir /pnpm-store && \
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
    pnpm config set store-dir /pnpm-store && \
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
    pnpm config set store-dir /pnpm-store && \
    pnpm lint && \
    mkdir -p /out && \
    touch /out/lint.txt

FROM scratch AS lint-output
COPY --from=lint /out/ /

# ============================================================================
# Stage: test-qunit
# Runs QUnit tests
# ============================================================================
FROM source AS test-qunit

ARG BUILD_RUN_ID

RUN --mount=type=cache,target=/pnpm-store,id=scriptlets-pnpm \
    echo "${BUILD_RUN_ID}" > /tmp/.build-run-id && \
    pnpm config set store-dir /pnpm-store && \
    mkdir -p /out && \
    set +e; \
    pnpm test:qunit; \
    EXIT_CODE=$?; \
    echo ${EXIT_CODE} > /out/exit-code.txt; \
    exit 0

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
    pnpm config set store-dir /pnpm-store && \
    mkdir -p /out && \
    set +e; \
    pnpm test:vitest; \
    EXIT_CODE=$?; \
    echo ${EXIT_CODE} > /out/exit-code.txt; \
    exit 0

FROM scratch AS test-vitest-output
COPY --from=test-vitest /out/ /

# ============================================================================
# Stage: test-smoke
# Runs smoke tests
# ============================================================================
FROM source AS test-smoke

ARG BUILD_RUN_ID

RUN --mount=type=cache,target=/pnpm-store,id=scriptlets-pnpm \
    echo "${BUILD_RUN_ID}" > /tmp/.build-run-id && \
    pnpm config set store-dir /pnpm-store && \
    mkdir -p /out && \
    set +e; \
    pnpm test:smoke; \
    EXIT_CODE=$?; \
    echo ${EXIT_CODE} > /out/exit-code.txt; \
    exit 0

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
    pnpm config set store-dir /pnpm-store && \
    pnpm build && \
    pnpm pack --out scriptlets.tgz && \
    mkdir -p /out/artifacts && \
    cp scriptlets.tgz /out/artifacts/ && \
    cp dist/build.txt /out/artifacts/ 2>/dev/null || true

FROM scratch AS full-build-output
COPY --from=full-build /out/ /
