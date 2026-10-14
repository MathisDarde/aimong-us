#!/bin/sh
# Builds the app image and deploys it to an Amazon Lightsail container service.
# Requires AWS CLI v2, lightsailctl, Docker (or Podman), and DATABASE_URL and
# BETTER_AUTH_SECRET (plus optional ANTHROPIC_API_KEY) either exported or defined in a
# .env.production file at the repo root.
set -eu

SERVICE=aimong-us
REGION=eu-north-1
POWER=micro
APP_PORT=3000
# Lightsail's load balancer reaches the container from its private network
LIGHTSAIL_PROXY_RANGE=172.16.0.0/12

cd "$(dirname "$0")/.."
if [ -f .env.production ]; then
  set -a
  . ./.env.production
  set +a
fi
: "${DATABASE_URL:?DATABASE_URL is not set}"
: "${BETTER_AUTH_SECRET:?BETTER_AUTH_SECRET is not set}"

# Locally, use the aimong-us profile; in CI, credentials come from the environment
if [ -z "${CI:-}" ]; then export AWS_PROFILE="${AWS_PROFILE:-aimong-us}"; fi
# lightsailctl cannot read `aws login` sessions, so hand it the resolved credentials
eval "$(aws configure export-credentials --format env)"

lightsail() { aws lightsail --region "$REGION" "$@"; }
service_field() { lightsail get-container-services --service-name "$SERVICE" --query "containerServices[0].$1" --output text; }

if ! lightsail get-container-services --service-name "$SERVICE" >/dev/null 2>&1; then
  echo "Creating container service $SERVICE ($POWER)..."
  lightsail create-container-service --service-name "$SERVICE" --power "$POWER" --scale 1 >/dev/null
fi
until [ "$(service_field state)" = READY ] || [ "$(service_field state)" = RUNNING ]; do sleep 10; done

URL=$(service_field url)
URL=${URL%/}

docker build --platform linux/amd64 -t "$SERVICE:latest" .
# Podman reports Docker API 1.44 but accepts the 1.46 calls lightsailctl makes
IMAGE=$(env -u AWS_PROFILE DOCKER_API_VERSION=1.46 aws lightsail push-container-image --region "$REGION" --service-name "$SERVICE" --label app --image "$SERVICE:latest" \
  | grep -o "\":$SERVICE\.app\.[0-9]*\"" | tr -d '"') || true
if [ -z "$IMAGE" ]; then echo "Image push failed" >&2; exit 1; fi
echo "Pushed $IMAGE"

# Optional: without a key the AI players pass their turn
AI_ENV=""
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then AI_ENV="\"ANTHROPIC_API_KEY\":\"$ANTHROPIC_API_KEY\","; fi

lightsail create-container-service-deployment --service-name "$SERVICE" \
  --containers "{\"app\":{\"image\":\"$IMAGE\",\"ports\":{\"$APP_PORT\":\"HTTP\"},\"environment\":{
    $AI_ENV
    \"PORT\":\"$APP_PORT\",
    \"WEB_ORIGIN\":\"$URL\",
    \"BETTER_AUTH_URL\":\"$URL\",
    \"TRUSTED_PROXIES\":\"$LIGHTSAIL_PROXY_RANGE\",
    \"DATABASE_URL\":\"$DATABASE_URL\",
    \"BETTER_AUTH_SECRET\":\"$BETTER_AUTH_SECRET\"}}}" \
  --public-endpoint "{\"containerName\":\"app\",\"containerPort\":$APP_PORT,\"healthCheck\":{\"path\":\"/api/health\"}}" \
  >/dev/null

echo "Deploying... waiting for the new version to go live"
while :; do
  state=$(lightsail get-container-service-deployments --service-name "$SERVICE" --query 'deployments[0].state' --output text)
  case "$state" in
    ACTIVE) break ;;
    FAILED) echo "Deployment failed, check the container logs in Lightsail" >&2; exit 1 ;;
  esac
  sleep 15
done
echo "Live at $URL"
