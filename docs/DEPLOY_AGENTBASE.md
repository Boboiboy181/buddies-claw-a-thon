# Deploying to GreenNode AgentBase

This app deploys as a **Custom Agent** runtime: one container serving the React SPA +
`/api/*` + socket.io on **port 8080**, with a liveness probe at **`GET /health`**.

> **CI/CD (GitHub Actions):** pushing to **`main`** auto-builds, pushes, and redeploys to
> AgentBase. **`dev`** runs CI only (lint + typecheck + build). See
> [CI/CD setup](#cicd-github-actions) below. Manual steps remain documented here as a fallback.

AgentBase does **not** provide Postgres, Redis, or S3 — you bring those (managed services
or a vServer) and point env vars at them. See [`.env.agentbase.example`](../.env.agentbase.example).

## What's already prepared

- [`Dockerfile.agentbase`](../Dockerfile.agentbase) — combined multi-stage image (SPA + API), port 8080.
- NestJS serves the SPA (`ServeStaticModule`) and exposes `/health` at the root.
- [`.env.agentbase.example`](../.env.agentbase.example) — env template (copy to `.env.agentbase`, git-ignored).
- IAM credentials saved to `.greennode.json` (git-ignored).
- Container Registry: `vcr.vngcloud.vn/111480-abp111721` (auto-provisioned, 20 GB quota).

## Prerequisites (you provide)

1. **Data stores reachable from the runtime:**
   - Managed Postgres + Redis + S3 (recommended), **or** a vServer running `docker-compose.dev.yml`.
   - In **VPC mode** use the store's **private IP**; in **PUBLIC mode** they must be publicly reachable.
2. **A real `LLM_API_KEY`** (and TTS/STT models, or `OPENAI_API_KEY`) — the app refuses to boot without an LLM provider.
3. **Network mode decision:**
   - **VPC** — needs `vpcId` + `subnetId` (from the VNG Cloud console; the IAM SA can't list them — 403).
   - **PUBLIC** — simplest, but data stores must be publicly reachable.
4. A filled-in **`.env.agentbase`**.

## Deploy steps

```bash
cd <repo-root>
TAG="v$(date +%Y%m%d%H%M%S)"
CR="vcr.vngcloud.vn/111480-abp111721"
IMAGE="$CR/clawathon:$TAG"

# 1. Build for amd64 (AgentBase runs amd64)
docker build --platform linux/amd64 -f Dockerfile.agentbase -t "$IMAGE" .

# 2. Log in to the managed CR (secret piped via stdin, never written to disk)
bash .claude/skills/agentbase/scripts/cr.sh credentials docker-login

# 3. Push
docker push "$IMAGE"

# 4a. Create the runtime — PUBLIC mode
bash .claude/skills/agentbase/scripts/runtime.sh create \
  --name "clawathon" \
  --image "$IMAGE" \
  --flavor "runtime-s2-general-2x4" \
  --env-file .env.agentbase \
  --from-cr \
  --min-replicas 1 --max-replicas 1 --cpu-scale 50 --mem-scale 50

# 4b. …or VPC mode (reach a private vServer / managed DB)
bash .claude/skills/agentbase/scripts/runtime.sh create \
  --name "clawathon" \
  --image "$IMAGE" \
  --flavor "runtime-s2-general-2x4" \
  --env-file .env.agentbase \
  --from-cr \
  --network-mode VPC --vpc-id "<VPC_UUID>" --subnet-id "<SUBNET_UUID>" \
  --min-replicas 1 --max-replicas 1 --cpu-scale 50 --mem-scale 50

# 5. Get the endpoint URL and test health
bash .claude/skills/agentbase/scripts/runtime.sh endpoints list <RUNTIME_ID>
curl -s -o /dev/null -w "%{http_code}\n" "<ENDPOINT_URL>/health"   # expect 200
```

After it's `ACTIVE`, set `FRONTEND_URL` in `.env.agentbase` to the endpoint URL and re-run
`runtime.sh update <RUNTIME_ID> ... --from-cr` so CORS matches the public origin.

### Seeding demo data (once)

The container runs `prisma migrate deploy` on boot but does **not** seed. To load the demo
data against the external DB, run the seed once with `DATABASE_URL` pointed at it:

```bash
cd apps/backend && DATABASE_URL="<external-db-url>" pnpm prisma:seed
```

## Available flavors

| Flavor | CPU | RAM | Notes |
|--------|-----|-----|-------|
| `runtime-s2-general-2x4` | 2 | 4 GB | Good starting point |
| `runtime-s2-general-4x8` | 4 | 8 GB | More headroom |

## Notes & limitations

- **Image is ~941 MB** (full `node_modules` for a reliable Prisma client). Slim later with a prod-only install if needed.
- **Recordings** (LiveKit egress) need publicly-reachable S3 — private MinIO won't work; the core interview→report flow does.
- Monitor logs/metrics with the `agentbase-monitor` skill after deploy.

---

## CI/CD (GitHub Actions)

Two workflows in `.github/workflows/`:

- **`ci.yml`** — on push to `dev` and PRs into `main`: install, Prisma generate, build (typechecks both apps), lint.
- **`deploy.yml`** — on push to `main` (or manual `workflow_dispatch`): get IAM token → fetch CR credentials → `docker login` → build `linux/amd64` image → push to CR → `PATCH` the runtime → wait for `ACTIVE` → `/health` check. GitHub runners are amd64, so the build is native (fast).

### Branch model
- **`dev`** — local development; CI validates each push.
- **`main`** — the deployed branch; every push redeploys the live AgentBase runtime.

```
dev  ──(PR, CI passes)──▶  main  ──(deploy.yml)──▶  AgentBase runtime "clawathon"
```

### One-time setup on GitHub
Repo → **Settings → Secrets and variables → Actions**.

**Secrets:**
| Name | Value |
|------|-------|
| `GREENNODE_CLIENT_ID` | IAM service-account client id |
| `GREENNODE_CLIENT_SECRET` | IAM service-account client secret |
| `AGENTBASE_ENV` | The **entire contents** of your `.env.agentbase` (DB URL, LLM key, vStorage keys, JWT, …) |

**Variables:**
| Name | Value |
|------|-------|
| `AGENTBASE_RUNTIME_ID` | `runtime-6860f17a-df75-4ff0-bcbe-7978ced5b4be` |
| `CR_REGISTRY` | `vcr.vngcloud.vn` |
| `CR_REPO` | `111480-abp111721` |
| `AGENTBASE_FLAVOR` | `runtime-s2-general-2x4` (optional) |

> `AGENTBASE_ENV` carries secrets — keep it only in GitHub Secrets, never committed (`.env.agentbase` is git-ignored). Update this secret whenever the env changes (new LLM key, DB host, etc.).

### Create the branches
```bash
git checkout main
git checkout -b dev        # local work happens here
git push -u origin dev
# merge dev → main (via PR) to trigger a deploy
```
