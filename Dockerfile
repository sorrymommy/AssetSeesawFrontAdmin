# syntax=docker/dockerfile:1

# ---------- build ----------
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . ./
# API는 같은 출처의 /api로 호출하고 nginx가 백엔드로 프록시한다
ENV VITE_API_BASE_URL=/api
RUN npm run build

# ---------- runtime ----------
FROM nginx:1.29-alpine
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/build /usr/share/nginx/html

ARG VERSION=dev
ENV APP_VERSION=${VERSION}
# /api 프록시 대상 (컨테이너 실행 시 -e API_UPSTREAM=... 로 변경)
ENV API_UPSTREAM=http://webapi:8080

EXPOSE 80
