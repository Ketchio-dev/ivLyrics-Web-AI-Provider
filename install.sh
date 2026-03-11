#!/usr/bin/env bash
set -euo pipefail

REPO_BASE="${REPO_BASE:-https://raw.githubusercontent.com/Ketchio-dev/ivLyrics-Web-AI-Provider/main}"
INSTALL_ADDON=0
INSTALL_BRIDGE=0
START_BRIDGE=0
NO_APPLY=0

info()  { printf '\033[1;34m[INFO]\033[0m  %s\n' "$1"; }
ok()    { printf '\033[1;32m[OK]\033[0m    %s\n' "$1"; }
warn()  { printf '\033[1;33m[WARN]\033[0m  %s\n' "$1"; }
err()   { printf '\033[1;31m[ERROR]\033[0m %s\n' "$1" >&2; }

usage() {
    cat <<'EOF'
Usage: install.sh [OPTIONS]

Options:
  --full          Install addon + bridge
  --addon         Install addon only
  --bridge        Install bridge only
  --start-bridge  Start bridge in background after install
  --no-apply      Skip spicetify apply
  --help          Show this help

Defaults to --full when no option is provided.
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
        --full) INSTALL_ADDON=1; INSTALL_BRIDGE=1 ;;
        --addon) INSTALL_ADDON=1 ;;
        --bridge) INSTALL_BRIDGE=1 ;;
        --start-bridge) START_BRIDGE=1 ;;
        --no-apply) NO_APPLY=1 ;;
        --help|-h) usage; exit 0 ;;
        *) err "Unknown option: $1"; usage; exit 1 ;;
    esac
    shift
done

if [ "$INSTALL_ADDON" -eq 0 ] && [ "$INSTALL_BRIDGE" -eq 0 ] && [ "$START_BRIDGE" -eq 0 ]; then
    INSTALL_ADDON=1
    INSTALL_BRIDGE=1
fi

require_cmd() {
    if ! command -v "$1" >/dev/null 2>&1; then
        err "Required command not found: $1"
        exit 1
    fi
}

get_spicetify_candidates() {
    local cfg=""
    if command -v spicetify >/dev/null 2>&1; then
        cfg=$(spicetify -c 2>/dev/null || true)
        if [ -n "$cfg" ]; then
            dirname "$cfg"
        fi
    fi
    printf '%s\n' "$HOME/.config/spicetify"
    printf '%s\n' "$HOME/.spicetify"
}

resolve_spicetify_config() {
    local first=""
    local candidate=""
    while IFS= read -r candidate; do
        [ -n "$candidate" ] || continue
        [ -z "$first" ] && first="$candidate"
        if [ -d "$candidate/CustomApps/ivLyrics" ]; then
            printf '%s\n' "$candidate"
            return 0
        fi
        if [ -d "$candidate" ]; then
            printf '%s\n' "$candidate"
            return 0
        fi
    done <<EOF
$(get_spicetify_candidates)
EOF
    printf '%s\n' "${first:-$HOME/.config/spicetify}"
}

ensure_dir() {
    mkdir -p "$1"
}

download_file() {
    local remote_path="$1"
    local destination="$2"
    ensure_dir "$(dirname "$destination")"
    curl -fsSL "$REPO_BASE/$remote_path" -o "$destination"
}

install_addon_manifest_entry() {
    local manifest_path="$1"
    [ -f "$manifest_path" ] || return 0
    if grep -q '"Addon_AI_FreeAIprovider.js"' "$manifest_path"; then
        return 0
    fi

    local tmp
    tmp=$(mktemp)
    awk '
        /"Addon_AI_Gemini\.js"/ && !done {
            print "		\"Addon_AI_FreeAIprovider.js\","
            done = 1
        }
        { print }
    ' "$manifest_path" > "$tmp"
    mv "$tmp" "$manifest_path"
}

SPICETIFY_CONFIG=$(resolve_spicetify_config)
IVLYRICS_APP="$SPICETIFY_CONFIG/CustomApps/ivLyrics"
BRIDGE_DIR="$SPICETIFY_CONFIG/freeai-bridge"

require_cmd curl

if [ "$INSTALL_ADDON" -eq 1 ]; then
    info "Installing addon into $IVLYRICS_APP"
    ensure_dir "$IVLYRICS_APP"
    download_file "Addon_AI_FreeAIprovider.js" "$IVLYRICS_APP/Addon_AI_FreeAIprovider.js"
    install_addon_manifest_entry "$IVLYRICS_APP/manifest.json"
    ok "Addon installed"
fi

if [ "$INSTALL_BRIDGE" -eq 1 ]; then
    require_cmd node
    require_cmd npm

    info "Installing bridge into $BRIDGE_DIR"
    ensure_dir "$BRIDGE_DIR"
    download_file "freeai-bridge/server.js" "$BRIDGE_DIR/server.js"
    download_file "freeai-bridge/start-background.js" "$BRIDGE_DIR/start-background.js"
    download_file "freeai-bridge/stop-background.js" "$BRIDGE_DIR/stop-background.js"
    download_file "freeai-bridge/package.json" "$BRIDGE_DIR/package.json"
    download_file "freeai-bridge/package-lock.json" "$BRIDGE_DIR/package-lock.json"
    download_file "freeai-bridge/README.md" "$BRIDGE_DIR/README.md"
    download_file "freeai-bridge/providers.example.json" "$BRIDGE_DIR/providers.example.json"

    (
        cd "$BRIDGE_DIR"
        npm install
        npx playwright install chromium
    )

    ok "Bridge installed"
fi

if [ "$START_BRIDGE" -eq 1 ]; then
    require_cmd npm
    if [ ! -f "$BRIDGE_DIR/package.json" ]; then
        err "Bridge is not installed yet at $BRIDGE_DIR"
        err "Run with --bridge first."
        exit 1
    fi
    info "Starting bridge in background"
    (
        cd "$BRIDGE_DIR"
        npm run start:bg
    )
fi

if [ "$NO_APPLY" -eq 0 ] && command -v spicetify >/dev/null 2>&1; then
    info "Running spicetify apply"
    spicetify apply
fi

ok "Done"
