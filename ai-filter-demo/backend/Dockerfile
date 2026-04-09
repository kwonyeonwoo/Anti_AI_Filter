# Use high-performance Python image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies for OpenCV and PyTorch
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install CPU version of torch to keep image size small and free-tier compatible
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy the rest of the backend code
COPY . .

# Set environment variables
ENV PORT=7860
ENV KMP_DUPLICATE_LIB_OK=TRUE

# Expose the port Hugging Face uses
EXPOSE 7860

# Start the application
CMD ["uvicorn", "main.py:app", "--host", "0.0.0.0", "--port", "7860"]
