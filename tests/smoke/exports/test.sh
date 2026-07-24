#!/bin/bash

set -e  # Exit on error

curr_path="tests/smoke/exports"
scriptlets="scriptlets.tgz"
nm_path="node_modules"

# Repo root (three levels up from this script's directory).
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

# Define cleanup function
cleanup() {
    echo "Performing cleanup..."
    rm -f $scriptlets && rm -rf $nm_path
    if [ -n "${PACKAGE_BACKUP}" ] && [ -f "${PACKAGE_BACKUP}" ]; then
        cp "${PACKAGE_BACKUP}" "${ROOT_DIR}/package.json"
        rm -f "${PACKAGE_BACKUP}"
    fi
    echo "Cleanup complete"
}

# Set trap to execute the cleanup function on script exit
trap cleanup EXIT

# If SMOKE_TGZ_PATH is set (CI), use the pre-built tarball instead of
# stamping + building + packing locally. This avoids a redundant `pnpm build`
# — the Docker build stage already built and packed the library.
if [ -n "$SMOKE_TGZ_PATH" ]; then
    cp "$SMOKE_TGZ_PATH" "$scriptlets"
else
    # package.json ships version-less by convention; stamp a dev version
    # (derived from the latest released CHANGELOG.md heading) so `pnpm pack`
    # can produce a tarball. The committed (versionless) manifest is restored
    # on exit.
    PACKAGE_BACKUP="$(mktemp)"
    cp "${ROOT_DIR}/package.json" "${PACKAGE_BACKUP}"

    (cd ../../.. \
        && DEV_VERSION="$(node --input-type=module -e "import('./scripts/helpers.js').then(m=>console.log(m.getBuildVersion(undefined)))")" \
        && npm pkg set version="${DEV_VERSION}" \
        && pnpm build \
        && pnpm tgz \
        && mv scriptlets.tgz "$curr_path/$scriptlets")
fi

# unzip to @adguard/tsurlfilter to node_modules
scriptlets_node_modules=$nm_path"/@adguard/scriptlets"
mkdir -p $scriptlets_node_modules
tar -xzf $scriptlets --strip-components=1 -C $scriptlets_node_modules

pnpm start
#echo "Test successfully built."
