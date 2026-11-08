FROM node as build
LABEL authors="shado"

WORKDIR /app/frontend
COPY ./package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/frontend/nginx.conf /etc/nginx/conf.d/frontend.conf.template
COPY --from=build /app/frontend/dist /usr/share/nginx/html

RUN envsubst < /etc/nginx/conf.d/frontend.conf.template > /etc/nginx/conf.d/default.conf

CMD  nginx -g "daemon off;"