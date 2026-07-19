# NOVA API — Hugging Face Spaces (Docker SDK) için imaj.
# HF Spaces uygulamayı README frontmatter'daki app_port (7860) üzerinden dinler.
FROM python:3.14-slim

WORKDIR /app

# Bağımlılıkları önce kur (katman cache'i).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
