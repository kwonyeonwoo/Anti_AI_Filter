FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install critical system dependencies for OpenCV, PyTorch, and general builds
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install CPU-specific PyTorch to prevent size/memory issues in free tier
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy all files from the backend directory
COPY . .

# Set permissions for Hugging Face (UID 1000)
RUN chmod -R 777 /app

# Set environment variables
ENV PORT=7860
ENV KMP_DUPLICATE_LIB_OK=TRUE
ENV PYTHONUNBUFFERED=1

# Hugging Face Spaces port
EXPOSE 7860

# Start with uvicorn
CMD ["uvicorn", "main.py:app", "--host", "0.0.0.0", "--port", "7860"]
