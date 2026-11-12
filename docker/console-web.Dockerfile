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
WORKDIR /project/apps/console-web
RUN pnpm build


FROM nginx:1.29.3-alpine as release
COPY --from=integration /project/apps/console-web/dist /usr/share/nginx/html/
# BACKEND_URL is the console API origin the app calls, read at startup so one image serves every environment. AUTH0_LOGIN_DOMAIN is the tenant users sign in on: the Auth0 SDK
# calls and frames it, and its sign-in popup needs an opener that survives the cross-origin navigation. AUTH0_CLIENT_ID is the console's Auth0 application and NEAR_NETWORK
# the network whose credentials the app shows, served in /config.json.
COPY <<EOF /etc/nginx/templates/default.conf.template
server {
    listen       80;
    listen  [::]:80;
    server_name  localhost;
    root   /usr/share/nginx/html;

    add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; font-src 'self' https: data:; form-action 'self'; frame-ancestors 'self'; img-src 'self' data: https:; object-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self' https: 'unsafe-inline'; upgrade-insecure-requests; connect-src 'self' \${BACKEND_URL} https://\${AUTH0_LOGIN_DOMAIN}; frame-src https://\${AUTH0_LOGIN_DOMAIN}; worker-src 'self' blob:" always;
    add_header Cross-Origin-Opener-Policy "same-origin-allow-popups" always;
    add_header Cross-Origin-Resource-Policy "same-origin" always;
    add_header Origin-Agent-Cluster "?1" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    location = /env.js {
        default_type application/javascript;
        return 200 'window.__CONSOLE_ENV__ = { BACKEND_URL: "\${BACKEND_URL}" };';
    }

    location = /config.json {
        default_type application/json;
        return 200 '{ "auth0Domain": "\${AUTH0_LOGIN_DOMAIN}", "auth0ClientId": "\${AUTH0_CLIENT_ID}", "nearNetwork": "\${NEAR_NETWORK}" }';
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
