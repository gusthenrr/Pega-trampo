# Checklist de arquitetura de cookie (produção)

## Frontend
- Defina `NEXT_PUBLIC_API_URL=/api` para manter autenticação como **first-party cookie**.
- Defina `FRONTEND_SITE_URL` com o domínio público real (ex: `https://app.seudominio.com`).
- Configure `BACKEND_INTERNAL_URL` para o serviço Flask interno (usado no rewrite do Next.js).

## Backend (`flask-server/app.py`)
- `JWT_COOKIE_SECURE=1`
- `JWT_COOKIE_SAMESITE=None`
- Se `JWT_COOKIE_NAME=__Host-token`, **não** definir `JWT_COOKIE_DOMAIN`.
- Tráfego HTTPS ponta a ponta (CDN/ingress/proxy até origem).

## Deploy / Proxy
- Não reescrever `Set-Cookie` no proxy/CDN/ingress.
- Preferir API no mesmo host (`/api`) via reverse proxy/subpath.
- Endpoint de validação: `GET /api/auth/cookie-architecture`.

## Fallback Safari (ITP)
- Considerar fluxo de autenticação sem dependência de third-party cookie:
  - OAuth2/OIDC com Authorization Code + PKCE.
  - Sessão first-party no mesmo domínio.
