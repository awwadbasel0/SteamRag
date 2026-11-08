FROM node as build
LABEL authors="shado"

WORKDIR /app/frontend
COPY ./package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine

RUN apk add --no-cache python3 py3-pip
RUN pip3 install --break-system-packages python-dotenv crossplane

COPY --from=build /app/frontend/dist /usr/share/nginx/html

COPY copy-config.py /copy-config.py

CMD python3 /copy-config.py && nginx -g "daemon off;"