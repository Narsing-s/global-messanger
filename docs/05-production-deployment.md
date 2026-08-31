# Production Deployment

## Backend

Deploy the Fastify server to a Node-compatible service. Set production environment variables in the hosting provider, not in Git.

Required categories include:

- PostgreSQL connection string
- Strong JWT secret
- Production web origin/CORS
- Upload/media configuration
- STUN/TURN configuration for WebRTC

## Frontend

Build the Vite application with the production API URL and deploy the generated static assets to a CDN/static host.

## Database

Run Prisma generation/migrations using the deployment process appropriate for the repository. Enable automated PostgreSQL backups and test restoration.

## Security

- HTTPS everywhere
- WSS for realtime connections
- Restrictive CORS
- Rate limiting
- Secure cookies/storage where applicable
- File validation
- Authentication/authorization on every protected API
- No secrets in source control

## Observability

Monitor HTTP errors, Socket.IO connection failures, message failures, call failures, database errors, CPU/memory and user-perceived crashes.

## Scale plan

For significant traffic, introduce Redis for Socket.IO horizontal scaling, object storage/CDN for uploads and a managed TURN service for reliable calls.
