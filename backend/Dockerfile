FROM python:3.14-slim
LABEL authors="shado"

WORKDIR /app/backend

COPY requirements.txt ./
RUN pip install -r requirements.txt
COPY . .

CMD ["python","run.py"]
#ENTRYPOINT ["top", "-b"]