$prompt = Get-Content -Raw "C:\Users\yeony\Desktop\MyAgentProject\planner_prompt.md"
gemini --approval-mode yolo $prompt
