#!/usr/bin/env bash

cec_platform_id() {
  local id=""
  if [[ -r /etc/os-release ]]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    id="${ID:-}"
  fi
  printf '%s\n' "${id:-unknown}"
}

cec_is_steamos() {
  [[ "$(cec_platform_id)" == "steamos" ]]
}

cec_optional_user_service_available() {
  systemctl --user cat "$1" >/dev/null 2>&1
}

cec_warn_missing_user_service() {
  local unit="$1"
  if ! cec_optional_user_service_available "$unit"; then
    printf 'warning: optional user service %s is not installed; using toolkit fallback where available.\n' "$unit" >&2
  fi
}
