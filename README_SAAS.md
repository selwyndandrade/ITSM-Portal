# Kyro SaaS launch checklist

## Environment variables

Set the following variables before deploying:

- ConnectionStrings__DefaultConnection
- Jwt__Key
- Jwt__Issuer
- Jwt__Audience
- AISettings__ApiKey
- External__Stripe__ApiKey
- External__SendGrid__ApiKey

## Local development

1. Start the API with the development appsettings profile.
2. Start the Vite frontend with npm run dev.
3. Sign in using the seeded admin account.

## Production deployment

1. Build the API image with Docker.
2. Configure the environment variables above.
3. Apply EF Core migrations before starting the app.
4. Validate health endpoints and login flow.
