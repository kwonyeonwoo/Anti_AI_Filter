# AI Performance Tracker

This project allows you to track and visualize the performance and accuracy of Gemini CLI responses across different configurations (system prompts).

## Components

1.  **Server (`/server`)**: A Node.js/Express server that stores metrics in `data/metrics.json`.
2.  **Client (`/client`)**: A React dashboard using Recharts to visualize accuracy and latency.
3.  **Benchmark Utility (`benchmark.js`)**: A script to automate testing across different system prompts.

## How to Run

### 1. Start the Server
```bash
cd server
npm start # or node index.js
```
The server runs on `http://localhost:5000`.

### 2. Start the Dashboard
```bash
cd client
npm run dev
```
The dashboard runs on `http://localhost:3000`.

### 3. Log Data from Gemini CLI
You can manually log data or use the benchmark script. 

To compare different system prompts:
1.  Open two different terminal instances in two different folders.
2.  Folder A has `GEMINI.md` with Instruction Set 1.
3.  Folder B has `GEMINI.md` with Instruction Set 2.
4.  Run your queries and use a script (like `logger.js`) to post the results to `http://localhost:5000/api/metrics`.

## Performance Comparison
The dashboard automatically aggregates metrics by `systemPromptId`, allowing you to see which configuration performs better in terms of:
- Average Accuracy
- Average Latency
- Token Efficiency

## Customizing Accuracy
In the current prototype, accuracy is simulated or manually provided. For a more robust setup, you can use a second LLM (Evaluator) to grade the response of the first LLM based on a ground truth or specific criteria.
