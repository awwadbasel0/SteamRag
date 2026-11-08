FROM node as build
LABEL authors="shado"

WORKDIR /app/frontend
COPY ./package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/frontend/build /usr/share/nginx/html

CMD ["nginx","-g","daemon off;"]
#ENTRYPOINT ["top", "-b"]
