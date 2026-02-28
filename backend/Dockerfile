FROM python:3.12-slim

WORKDIR /app

# Install Cloud SQL Auth Proxy
RUN apt-get update && apt-get install -y wget && \
    wget -O /usr/local/bin/cloud-sql-proxy \
    https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.1/cloud-sql-proxy.linux.amd64 && \
    chmod +x /usr/local/bin/cloud-sql-proxy && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--reload"]
