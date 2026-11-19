# syntax=docker/dockerfile:1
ARG BASE_IMAGE=base
FROM ${BASE_IMAGE} as integration
ARG TURBO_TEAM=peersyst
ENV TURBO_TEAM=$TURBO_TEAM

# Include console web
COPY apps/console-web /project/apps/console-web
# Install console web dependencies
RUN pnpm install --frozen-lockfile

# Lint console web
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run lint --filter=console-web
# Check types console web
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run check-types --filter=console-web
# Test console web
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run test --filter=console-web
# Build console web
# BACKEND_URL is the console API origin the app calls. AUTH0_LOGIN_DOMAIN is the tenant users sign in on, AUTH0_CLIENT_ID the console's Auth0 application and
# NEAR_NETWORK the network whose credentials the app shows. Vite bakes them into the bundle, so the image is built per environment.
ARG BACKEND_URL
ARG AUTH0_LOGIN_DOMAIN
ARG AUTH0_CLIENT_ID
ARG NEAR_NETWORK
ENV BACKEND_URL=$BACKEND_URL AUTH0_LOGIN_DOMAIN=$AUTH0_LOGIN_DOMAIN AUTH0_CLIENT_ID=$AUTH0_CLIENT_ID NEAR_NETWORK=$NEAR_NETWORK
WORKDIR /project/apps/console-web
RUN pnpm build


FROM nginx:1.29.3-alpine as release
COPY --from=integration /project/apps/console-web/dist /usr/share/nginx/html/
# The Content-Security-Policy lets the app call BACKEND_URL. The Auth0 SDK calls and frames AUTH0_LOGIN_DOMAIN, and its sign-in popup needs an opener that survives the
# cross-origin navigation. Both are filled in at build time from the same build arguments as the bundle.
# A login page URL carries the payload to sign, about 6 characters per byte, so the default 8k request line is too short.
ARG BACKEND_URL
ARG AUTH0_LOGIN_DOMAIN
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen       80;
    listen  [::]:80;
    server_name  localhost;
    root   /usr/share/nginx/html;
    large_client_header_buffers 4 32k;

    add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; font-src 'self' https: data:; form-action 'self'; frame-ancestors 'self'; img-src 'self' data: https:; object-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self' https: 'unsafe-inline'; upgrade-insecure-requests; connect-src 'self' ${BACKEND_URL} https://${AUTH0_LOGIN_DOMAIN}; frame-src https://${AUTH0_LOGIN_DOMAIN}; worker-src 'self' blob:" always;
    add_header Cross-Origin-Opener-Policy "same-origin-allow-popups" always;
    add_header Cross-Origin-Resource-Policy "same-origin" always;
    add_header Origin-Agent-Cluster "?1" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    # Open login pages for the testing tenants, served as static files. The callback URL holds Auth0 codes, so it is not logged. A popup opened by
    # another origin keeps its opener only if COOP is unsafe-none. A location that declares add_header drops every inherited one, so the rest are repeated.
    location /login/ {
        add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; font-src 'self' https: data:; form-action 'self'; frame-ancestors 'self'; img-src 'self' data: https:; object-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self' https: 'unsafe-inline'; upgrade-insecure-requests; connect-src 'self' ${BACKEND_URL} https://${AUTH0_LOGIN_DOMAIN}; frame-src https://${AUTH0_LOGIN_DOMAIN}; worker-src 'self' blob:" always;
        add_header Cross-Origin-Opener-Policy "unsafe-none" always;
        add_header Cross-Origin-Resource-Policy "same-origin" always;
        add_header Origin-Agent-Cluster "?1" always;
        add_header Referrer-Policy "no-referrer" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header Cache-Control "no-store" always;
        access_log off;
        absolute_redirect off;
        try_files \$uri \$uri/ =404;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
