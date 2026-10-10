#!/usr/bin/env bash
set -euo pipefail
ci_container="badminton-postgres-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-${COMPONENT_NAME}"
case "${1:-}" in
  start)
    docker run --detach --name "$ci_container" \
      --env POSTGRES_USER=ci --env POSTGRES_PASSWORD=ci_ephemeral \
      --env POSTGRES_DB=ci --publish 127.0.0.1::5432 \
      --health-cmd='pg_isready -U ci -d ci' --health-interval=2s \
      --health-timeout=2s --health-retries=30 postgres:16-alpine
    ci_ready=false
    for ((ci_attempt=0; ci_attempt<40; ci_attempt++)); do
      if [[ $(docker inspect --format '{{.State.Health.Status}}' "$ci_container") == healthy ]]; then
        ci_ready=true
        break
      fi
      sleep 2
    done
    if [[ "$ci_ready" != true ]]; then
      docker logs "$ci_container"
      exit 1
    fi
    ci_port=$(docker port "$ci_container" 5432/tcp | awk -F: '{print $NF}')
    echo "DATABASE_URL=postgresql://ci:ci_ephemeral@127.0.0.1:${ci_port}/ci?schema=public" >> "$GITHUB_ENV"
    ;;
  cleanup)
    if docker container inspect "$ci_container" >/dev/null 2>&1; then
      docker rm --force "$ci_container"
    fi
    ;;
  *) echo 'Expected start or cleanup' >&2; exit 1 ;;
esac
