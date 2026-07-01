#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${1:-}"
RELEASE_DIR="${PROJECT_DIR}/release"
PLUGIN_PACKAGE_DIR="${RELEASE_DIR}/plugin-package/steamos-cec-toolkit"

if [[ -z "$VERSION" ]]; then
  VERSION="$(git -C "$PROJECT_DIR" describe --tags --always --dirty 2>/dev/null || echo dev)"
fi

case "$VERSION" in
  v*) ;;
  *) VERSION="v$VERSION" ;;
esac

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

require_command npm
require_command tar
require_command zip

echo "Building SteamOS CEC Toolkit release assets for $VERSION"

rm -rf "$RELEASE_DIR"
install -d "$PLUGIN_PACKAGE_DIR"

restore_version() {
  if [[ -f "$RELEASE_DIR/VERSION.original" ]]; then
    cp "$RELEASE_DIR/VERSION.original" "$PROJECT_DIR/VERSION"
  fi
}
trap restore_version EXIT
cp "$PROJECT_DIR/VERSION" "$RELEASE_DIR/VERSION.original"
printf '%s\n' "$VERSION" > "$PROJECT_DIR/VERSION"

(
  cd "$PROJECT_DIR/decky"
  npm run build
  rm -f dist/index.js.map
)

cp -a \
  "$PROJECT_DIR/VERSION" \
  "$PROJECT_DIR/decky/plugin.json" \
  "$PROJECT_DIR/decky/package.json" \
  "$PROJECT_DIR/decky/main.py" \
  "$PROJECT_DIR/decky/dist" \
  "$PLUGIN_PACKAGE_DIR/"

(
  cd "$RELEASE_DIR/plugin-package"
  zip -qr "$RELEASE_DIR/steamos-cec-toolkit-decky.zip" steamos-cec-toolkit
)

tar \
  --exclude='.git' \
  --exclude='decky/node_modules' \
  --exclude='release' \
  --exclude='assets/screenshots/candidates' \
  --exclude='*.pyc' \
  --exclude='__pycache__' \
  -C "$PROJECT_DIR/.." \
  -czf "$RELEASE_DIR/steamos-cec-toolkit.tar.gz" \
  steamos-cec-toolkit

sed \
  -e "s|^RELEASE_BASE_URL=.*|RELEASE_BASE_URL=\"\${RELEASE_BASE_URL:-https://github.com/Twsts/steamos-cec-toolkit/releases/download/$VERSION}\"|" \
  "$PROJECT_DIR/scripts/easy-install.sh" \
  > "$RELEASE_DIR/steamos-cec-toolkit-installer.sh"
chmod 0755 "$RELEASE_DIR/steamos-cec-toolkit-installer.sh"

cat > "$RELEASE_DIR/SHA256SUMS" <<EOF
$(cd "$RELEASE_DIR" && sha256sum steamos-cec-toolkit-installer.sh steamos-cec-toolkit-decky.zip steamos-cec-toolkit.tar.gz)
EOF

rm -rf "$RELEASE_DIR/plugin-package"

cat <<EOF

Release assets written to:
  $RELEASE_DIR/steamos-cec-toolkit-installer.sh
  $RELEASE_DIR/steamos-cec-toolkit-decky.zip
  $RELEASE_DIR/steamos-cec-toolkit.tar.gz
  $RELEASE_DIR/SHA256SUMS

Recommended GitHub release upload:
  gh release create $VERSION release/steamos-cec-toolkit-installer.sh release/steamos-cec-toolkit-decky.zip release/steamos-cec-toolkit.tar.gz release/SHA256SUMS --title "$VERSION"
EOF
