#!/usr/bin/env bash
# Check the tools needed for a port. Read-only.
# Usage: bash scripts/check-tools.sh
set -u

missing_required=()
missing_optional=()

check() {
  name="$1"; required="$2"; shift 2
  exe="$1"; shift
  if command -v "$exe" >/dev/null 2>&1 || [ -x "$exe" ]; then
    v=$("$exe" "$@" 2>&1 | head -n 1)
    printf '%-10s %-9s %s\n' "$name" "ok" "$v"
  else
    printf '%-10s %-9s %s\n' "$name" "MISSING" "not found"
    if [ "$required" = "yes" ]; then missing_required+=("$name"); else missing_optional+=("$name"); fi
  fi
}

printf '%-10s %-9s %s\n' "Tool" "Status" "Version"
check git    yes git --version
check node   yes node -v
check npm    yes npm -v
check python yes python3 --version

# Chrome is not on PATH on macOS.
CHROME_MAC="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if command -v google-chrome >/dev/null 2>&1; then
  check chrome yes google-chrome --version
elif [ -x "$CHROME_MAC" ]; then
  check chrome yes "$CHROME_MAC" --version
else
  check chrome yes google-chrome --version
fi

check 7z     no  7z
check ffmpeg no  ffmpeg -version
check cmake  no  cmake --version
check emcc   no  emcc --version
check unity  no  unity --version

echo
if [ ${#missing_required[@]} -gt 0 ]; then
  echo "Missing required: ${missing_required[*]}"
  echo "See references/12-toolchain-setup.md."
  exit 1
fi

echo "Core tools present. Engine tools (unity, emcc) depend on your approach."
exit 0
