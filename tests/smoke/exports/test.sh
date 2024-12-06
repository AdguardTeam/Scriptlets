#!/bin/bash

set -e  # Exit on error

curr_path="tests/smoke/exports"
scriptlets="scriptlets.tgz"
nm_path="node_modules"

# Define cleanup function
cleanup() {
    echo "Performing cleanup..."
    rm -f $scriptlets && rm -rf $nm_path
    echo "Cleanup complete"
}

# Set trap to execute the cleanup function on script exit
trap cleanup EXIT

(cd ../../.. && pnpm build && pnpm pack && mv adguard-scriptlets-*.tgz "$curr_path/$scriptlets")

# unzip to @adguard/tsurlfilter to node_modules
scriptlets_node_modules=$nm_path"/@adguard/scriptlets"
mkdir -p $scriptlets_node_modules
tar -xzf $scriptlets --strip-components=1 -C $scriptlets_node_modules

yarn start
#echo "Test successfully built."
