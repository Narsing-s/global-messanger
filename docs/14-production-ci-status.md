# Production CI status

The Render production deployment remains the source of truth for production runtime configuration.

CI validates the server build and production configuration contract without requiring production credentials.

Required production variables:
- DATABASE_URL
- JWT_SECRET
- WEB_ORIGIN
- PASSWORD_RESET_WEB_ORIGIN

Optional integrations are validated as warnings because their provider resources and secrets must be configured outside source control:
- Firebase/FCM
- SMTP
- durable object storage
- TURN/WebRTC relay
