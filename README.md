---
title: Anti AI Filter
emoji: 🛡️
colorFrom: green
colorTo: blue
sdk: docker
pinned: false
app_port: 7860
---

# AI Agent Pipeline Project
...

This project implements a multi-agent workflow: **Planner -> Reviewer -> Coder -> Tester**.

## Structure
- `main.py`: Entry point for the project.
- `pipeline/`: Contains the core agent logic.
  - `agent_pipeline_v5.py`: The 4-agent automation script.

## How to Run
1. Open a terminal in this folder.
2. Run the pipeline with a custom task:
   ```bash
   python main.py \"Your task here\"
   ```
3. Or run it with the default task:
   ```bash
   python main.py
   ```

The final generated code will be saved as `automated_result.py` in the root folder when you run from there.
