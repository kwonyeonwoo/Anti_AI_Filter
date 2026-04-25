Act as a 'Planner' to create a detailed technical specification and implementation plan for a web-based demo of an 'AI Learning Prevention Filter'.

### Input Context:
- Concept: A filter that prevents AI models from unauthorized training on creative works (illustrations, webtoons, movies).
- Users: Illustrators, webtoon artists, film production companies.
- System Description:
    1. Image Analysis: Identify important parts of the image to minimize visual damage when adding noise.
    2. Optimal Noise Design: Calculate and generate noise that makes the image be perceived differently by AI (adversarial noise).
    3. Signal Insertion: Insert noise in the frequency domain so it persists through compression (PNG, JPEG) and verify it repeatedly.
- Comparison: Similar to Glaze, Nightshade, and Steg.AI but web-based and robust to JPEG.

### Requirements for the Plan:
- Tech Stack: Python, FastAPI for the backend, React for the frontend (demo), OpenCV/PyTorch for image processing and noise generation.
- Adversarial Noise Algorithm: Focus on FGSM (Fast Gradient Sign Method) or PGD (Projected Gradient Descent).
- Frequency Domain Insertion Logic: Detail the use of Discrete Cosine Transform (DCT) for robustness against JPEG compression.
- Deployment: Web-based architecture.

Please provide a structured plan including system architecture, algorithm details, and an implementation roadmap.