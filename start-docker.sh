#!/bin/bash
if ! [ -f "./.env" ]; then
	echo "no .env file found, make sure to Add Your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"
else
docker build -t steamrag-frontend:v1 ./frontend
docker build -t steamrag-backend:v1 ./backend

docker network create my-network

docker run -d --name backend --network my-network --env-file .env -p 8000:8000 steamrag-backend:v1
docker run -d --name frontend --network my-network -p 5173:5173 steamrag-frontend:v1
fi

