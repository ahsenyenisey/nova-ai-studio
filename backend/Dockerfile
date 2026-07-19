# NOVA API — backend imajı (Render/Docker uyumlu).
# $PORT verilirse onu, yoksa 7860'ı dinler (host'a göre otomatik).
FROM python:3.14-slim

WORKDIR /app

# Bağımlılıkları önce kur (katman cache'i).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 7860

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}"]
