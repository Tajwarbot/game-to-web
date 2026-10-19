#!/usr/bin/env bash
# Check the tools needed for a port. Read-only.
# Usage: bash scripts/check-tools.sh
set -u

missing_required=()
missing_optional=()

check() {
  name="$1"; shift
  required="$2"; shift
  if command -v "$1" >/dev/null 2>&1; then
    v=$("$@" 2>&1 | head -n 1)
    printf '%-10s %-9s %s\n' "$name" "ok" "$v"
  else
    printf '%-10s %-9s %s\n' "$name" "MISSING" "not on PATH"
    if [ "$required" = "yes" ]; then missing_required+=("$name"); else missing_optional+=("$name"); fi
  fi
}

printf '%-10s %-9s %s\n' "Tool" "Status" "Version"
check git    yes git --version
check node   yes node -v
check npm    yes npm -v
check python yes python3 --version
check chrome yes google-chrome --version
check 7z     no  7z
check ffmpeg no  ffmpeg -version
check cmake  no  cmake --version
check emcc   no  emcc --version

echo
if [ ${#missing_required[@]} -gt 0 ]; then
  echo "Missing required: ${missing_required[*]}"
  echo "See references/12-toolchain-setup.md."
  exit 1
fi

echo "Core tools present. Engine tools (unity, emcc) depend on your approach."
exit 0
