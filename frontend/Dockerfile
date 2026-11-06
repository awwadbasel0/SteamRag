FROM node
LABEL authors="shado"

WORKDIR /app/frontend
COPY ./package*.json ./
RUN npm install
COPY . .
RUN npm run build

CMD ["npm","run","dev","--","--host"]
#ENTRYPOINT ["top", "-b"]
