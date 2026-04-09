FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV KMP_DUPLICATE_LIB_OK=TRUE
ENV PORT=7860

WORKDIR /app

# Robust apt-get with retries and minimal dependencies
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU first (Large package)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Ensure write permissions for temp files
RUN mkdir -p /app/tmp && chmod -R 777 /app/tmp

EXPOSE 7860

CMD ["uvicorn", "main.py:app", "--host", "0.0.0.0", "--port", "7860"]
