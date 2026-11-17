#!/usr/bin/env bash
# Checks `specagile install` with a release served at OPENSPEC_DOWNLOAD_URL.
# SpecAgile has no standalone install (FORK.md): run from the Node build, as an
# npm user would, and by the binary on itself, `install` downloads nothing,
# points to npm and exits with an error. Needs `pnpm build`.
#
#   OPENSPEC_DOWNLOAD_URL=http://127.0.0.1:8766 bash scripts/binary/install-check.sh dist-bin/openspec-<asset>
set -euo pipefail

asset=$1
ext=""
case "$asset" in *.exe) ext=".exe" ;; esac
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
export XDG_CONFIG_HOME="$work/config" XDG_DATA_HOME="$work/data" OPENSPEC_TELEMETRY=0 OPENSPEC_NO_UPDATE_CHECK=1
fail() { echo "FAIL: $*" >&2; exit 1; }

# The output must name npm as the way to install SpecAgile.
points_to_npm() {
  case "$2" in
    *"SpecAgile has no standalone install"*"npm install -g specagile@latest"*) ;;
    *) fail "$1 did not point to npm: $2" ;;
  esac
}

# 1. From the Node build: nothing lands in the install folder.
if out=$(OPENSPEC_INSTALL_DIR="$work/from-node" node bin/specagile.js install 2>&1); then
  fail "install from Node succeeded: $out"
fi
points_to_npm "install from Node" "$out"
[ ! -e "$work/from-node" ] || fail "install from Node wrote $(ls -A "$work/from-node")"

# 2. The binary on itself, under its own (custom) name: it stays as it was.
mkdir "$work/self"
self="$work/self/my-openspec$ext"
cp "$asset" "$self"
if out=$(env -u OPENSPEC_INSTALL_DIR -u OPENSPEC_INSTALL_NAME "$self" install 2>&1); then
  fail "self-install succeeded: $out"
fi
points_to_npm "self-install" "$out"
cmp "$self" "$asset" || fail "self-install changed the binary"
leftovers=$(find "$work/self" -mindepth 1 -maxdepth 1 ! -name "my-openspec$ext" | wc -l | tr -d ' ')
[ "$leftovers" -eq 0 ] || fail "self-install left files next to the binary: $(ls -A "$work/self")"

echo "OK: specagile install points to npm ($asset)"
