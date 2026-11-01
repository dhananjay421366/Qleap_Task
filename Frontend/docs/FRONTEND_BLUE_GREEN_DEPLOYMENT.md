# Frontend blue-green deployment

This repository builds the Angular `task-management` application into
`dist/task-management/browser`, packages it in an Nginx container, and deploys
immutable Git-SHA images from GHCR. The public Nginx virtual host is
`app.example.com`; it selects one local container at a time:

| Slot  |        Host bind | Container port |
| ----- | ---------------: | -------------: |
| Blue  | `127.0.0.1:4001` |           `80` |
| Green | `127.0.0.1:5001` |           `80` |

The first deployment selects Blue, then deployments alternate to Green and
Blue. The deploy script uses `flock`, timestamped logs, atomic upstream file
replacement, `nginx -t` before reload, health checks on `/`, and cleanup/error
traps. State and per-slot image metadata live under
`/var/lib/taskmanagement-frontend`. The old container remains during
`DRAIN_SECONDS` and is stopped only after a successful Nginx switch.

## Production API configuration

The existing `src/environments/environment.ts` remains the local development
configuration (`http://localhost:5000/api`). Production uses the Angular file
replacement `environment.production.ts`; Docker requires a non-empty
`FRONTEND_API_URL` build argument and rejects localhost values. Set the real
backend URL (for example, the value supplied by your staging infrastructure)
as the GitHub repository variable `FRONTEND_API_URL`. Do not commit credentials
or a guessed domain.

## Server setup

Install Docker, Nginx, `curl`, and `flock`. Install the repository's Nginx
files as `/etc/nginx/conf.d/taskmanagement-frontend-upstreams.conf` and
`/etc/nginx/conf.d/taskmanagement-frontend-vhost.conf`; remove any conflicting
default vhost. Set `server_name` and TLS separately if required by the host.
Install the two scripts as root-owned executables, with the deploy wrapper
`/usr/local/sbin/deploy-taskmanagement-frontend` invoking:

```bash
/opt/taskmanagement-frontend/scripts/deploy-frontend.sh "$1"
```

The SSH user needs only the narrowly scoped sudo permission for that wrapper,
Docker, and Nginx reload. Configure GHCR read credentials on the server or in
the workflow secrets. The workflow requires `STAGING_HOST`, `STAGING_USER`,
`STAGING_SSH_KEY`, `GHCR_READ_USER`, and `GHCR_READ_TOKEN` secrets.

## Commands

```bash
# Build locally (requires an explicit real production API URL)
docker build --build-arg FRONTEND_API_URL="$FRONTEND_API_URL" -t taskmanagement-frontend:test .

# Deploy an immutable image on the server
sudo /usr/local/sbin/deploy-taskmanagement-frontend ghcr.io/OWNER/REPO:GIT_SHA

# Manually roll back to the previous healthy image
sudo /opt/taskmanagement-frontend/scripts/rollback-frontend.sh
```

Set `FRONTEND_API_URL` in your shell to the actual API URL before running the
example, and replace the repository placeholders for the target environment.
