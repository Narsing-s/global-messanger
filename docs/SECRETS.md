# Secrets and environment variables

Global Messenger must never store production passwords or JWT signing secrets in Git.

## Local Docker

1. Copy `.env.example` to `.env`.
2. Generate a strong random `POSTGRES_PASSWORD` and `JWT_SECRET` locally.
3. Run `docker compose --profile dev up -d --build`.
4. Keep `.env` on the machine running Docker.

The repository intentionally contains only placeholders in `.env.example`.

## GitHub Actions

For CI/CD, configure these as GitHub Actions repository or environment secrets rather than committing them:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `MAIL_FROM`
- `WEB_ORIGIN`
- `PASSWORD_RESET_WEB_ORIGIN`

Use `${{ secrets.SECRET_NAME }}` from workflows. Do not echo secrets in workflow logs.

## Production deployment

For a production Docker host, inject the values through the host's secret manager, deployment platform environment variables, or a protected `.env` file outside Git. Rotate any secret that has been exposed publicly.
