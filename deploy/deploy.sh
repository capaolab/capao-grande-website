#!/usr/bin/env bash
# Deploy manual de uma versão publicada no GitHub Container Registry.
#
#   ./deploy/deploy.sh <staging|production> <versão>
#   ./deploy/deploy.sh staging 1.2.0
#
# Pré-requisitos no servidor (uma vez — ver README, "Staging"):
#   - docker login ghcr.io (token com read:packages);
#   - rede do Postgres compartilhado criada (DB_NETWORK);
#   - deploy/.env.<ambiente> preenchido (a partir do .example).
#
# Passos: baixa as imagens da versão (app e <versão>-migrate) → backup do
# banco → aplica as migrations → sobe o app → espera o healthcheck. Se o
# backup ou as migrations falharem, o app em execução não é trocado.
#
# O backup vai para $BACKUP_DIR (padrão: ~/backups/capao-<ambiente>).
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

# Usuário, host (= container do Postgres na rede Docker) e banco do
# DATABASE_URI, para o backup via `docker exec <host> pg_dump`.
uri="$(grep -E '^DATABASE_URI=' "$env_file" | tail -1 | cut -d= -f2-)"
if [[ ! "$uri" =~ ^postgres(ql)?://([^:@/]+)(:[^@]*)?@([^:/]+)(:[0-9]+)?/([^?]+) ]]; then
  echo "DATABASE_URI inválido em $env_file" >&2
  exit 1
fi
db_user="${BASH_REMATCH[2]}"
db_host="${BASH_REMATCH[4]}"
db_name="${BASH_REMATCH[6]}"

compose=(docker compose -f "$dir/compose.yml" --env-file "$env_file" -p "capao-$ambiente")
export IMAGE_TAG="$versao" ENV_FILE="$env_file"

echo "==> Baixando ghcr.io/capaolab/capao-grande-website:$versao (app e migrate)"
"${compose[@]}" --profile migrate pull

backup_dir="${BACKUP_DIR:-$HOME/backups/capao-$ambiente}"
backup="$backup_dir/$db_name-$(date +%Y%m%d-%H%M%S)-antes-$versao.dump"
mkdir -p "$backup_dir"
echo "==> Backup de $db_name em $backup"
if ! docker exec "$db_host" pg_dump -U "$db_user" -Fc "$db_name" > "$backup"; then
  rm -f "$backup"
  echo "!! backup falhou — deploy interrompido, nada foi alterado" >&2
  exit 1
fi

echo "==> Aplicando migrations da versão $versao"
if ! "${compose[@]}" --profile migrate run --rm migrate; then
  echo "!! migrations falharam — o app em execução não foi trocado." >&2
  echo "   Migrations anteriores do mesmo lote podem ter sido aplicadas;" >&2
  echo "   para voltar ao estado anterior, restaure $backup (README, Rollback)." >&2
  exit 1
fi

echo "==> Subindo capao-$ambiente na versão $versao"
"${compose[@]}" up -d app

echo "==> Aguardando healthcheck"
for _ in $(seq 1 30); do
  status="$(docker inspect -f '{{.State.Health.Status}}' "$("${compose[@]}" ps -q app)" 2>/dev/null || true)"
  if [[ "$status" == "healthy" ]]; then
    echo "==> capao-$ambiente saudável na versão $versao (backup: $backup)"
    exit 0
  fi
  sleep 5
done

echo "!! healthcheck não ficou 'healthy' — veja: ${compose[*]} logs app" >&2
exit 1
