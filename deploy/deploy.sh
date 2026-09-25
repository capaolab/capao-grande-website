#!/usr/bin/env bash
# Deploy manual de uma versão publicada no GitHub Container Registry.
#
#   ./deploy/deploy.sh <staging|production> <versão>
#   ./deploy/deploy.sh staging 1.2.0
#
# Pré-requisitos no servidor (uma vez — ver README, "Homologação"):
#   - docker login ghcr.io (token com read:packages);
#   - rede do Postgres compartilhado criada (DB_NETWORK);
#   - deploy/.env.<ambiente> preenchido (a partir do .example).
#
# O container aplica as migrations pendentes ao subir (prodMigrations).
set -euo pipefail

ambiente="${1:-}"
versao="${2:-}"

if [[ ! "$ambiente" =~ ^(staging|production)$ || -z "$versao" ]]; then
  echo "uso: $0 <staging|production> <versão>   (ex.: $0 staging 1.2.0)" >&2
  exit 1
fi

dir="$(cd "$(dirname "$0")" && pwd)"
env_file="$dir/.env.$ambiente"

if [[ ! -f "$env_file" ]]; then
  echo "arquivo $env_file não encontrado — copie de .env.$ambiente.example" >&2
  exit 1
fi

compose=(docker compose -f "$dir/compose.yml" --env-file "$env_file" -p "capao-$ambiente")
export IMAGE_TAG="$versao" ENV_FILE="$env_file"

echo "==> Baixando ghcr.io/capaolab/capao-grande-website:$versao"
"${compose[@]}" pull

echo "==> Subindo capao-$ambiente na versão $versao"
"${compose[@]}" up -d

echo "==> Aguardando healthcheck"
for _ in $(seq 1 30); do
  status="$(docker inspect -f '{{.State.Health.Status}}' "$("${compose[@]}" ps -q app)" 2>/dev/null || true)"
  if [[ "$status" == "healthy" ]]; then
    echo "==> capao-$ambiente saudável na versão $versao"
    exit 0
  fi
  sleep 5
done

echo "!! healthcheck não ficou 'healthy' — veja: ${compose[*]} logs app" >&2
exit 1
