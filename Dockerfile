FROM python:3.10-slim

# Set environment variables for stability
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV KMP_DUPLICATE_LIB_OK=TRUE
ENV PORT=7860

WORKDIR /app

# Install only absolutely necessary system libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU first (Large package, separate layer for caching)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy and install other requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Hugging Face Spaces run as a user with UID 1000
# Ensure the app can write temp files
RUN mkdir -p /app/tmp && chmod -R 777 /app/tmp

# Expose port
EXPOSE 7860

# Run using the python module directly
CMD ["uvicorn", "main.py:app", "--host", "0.0.0.0", "--port", "7860"]
