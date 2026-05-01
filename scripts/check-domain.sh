#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-rybasvprud.ru}"
WWW_DOMAIN="${WWW_DOMAIN:-www.${DOMAIN}}"

for resolver in 1.1.1.1 8.8.8.8; do
  echo "## DNS @${resolver}"
  echo "$DOMAIN A:"
  dig @"$resolver" "$DOMAIN" A +short
  echo "$WWW_DOMAIN CNAME:"
  dig @"$resolver" "$WWW_DOMAIN" CNAME +short
  echo
done

echo "## HTTP/HTTPS"
for url in "http://${DOMAIN}" "http://${WWW_DOMAIN}" "https://${DOMAIN}" "https://${WWW_DOMAIN}"; do
  echo "### $url"
  curl -sSI --max-time 20 "$url" | sed -n '1,12p'
  echo
done
