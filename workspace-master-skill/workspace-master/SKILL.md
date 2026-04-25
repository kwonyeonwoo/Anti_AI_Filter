---
name: workspace-master
description: A comprehensive skill for managing MyAgentProject workspace, enforcing full-stack standards, automating project sync, and conducting rigorous code reviews. Use this when starting a new task, switching projects, or deploying changes.
---
# Workspace Master

Welcome to the command center for MyAgentProject. This skill optimizes your performance across all active sub-projects through intelligent automation.

## 🏁 Session Entry Protocol
Upon session initialization or when the user says "Help":
1. **Reference Guide:** Read [usage.md](references/usage.md).
2. **Greet:** Present a concise summary of "Quick Commands" and current "Security Status" to the user.
3. **Onboard:** If it's a new project, suggest the best-fitting expert skill from the toolkit.

## 🧠 Intelligent Project Routing (Auto-Detection)
...

Upon session start or task switch, Gemini CLI MUST perform the following:
1.  **Detect:** Scan for `package.json`, `firebase.json`, or `next.config.js`.
2.  **Context Load:**
    - If `Next.js` found: Prioritize `pro-dev-toolkit/references/frontend.md`.
    - If `Firebase` found: Prioritize `pro-dev-toolkit/references/firebase.md`.
    - If `.git` found: Activate `workspace-master` sync protocols.
3.  **Prune:** If a project doesn't use a specific technology, explicitly ignore those reference files to save tokens.

## 🛠 Project Lifecycle Workflow
...

## 🔄 Automated Wrap-up Procedure
When the user says "Wrap up" or "Sync projects":
1.  **Reflect & Report:** Summarize code changes AND report skill performance (e.g., "Shell-safety validated 3 commands", "Context-efficiency pruned 500 tokens").
2.  **Document:** Update the root `GEMINI.md`.
3.  **Execute:** Run `sync.cjs`.
4.  **Notify:** Run `notify.cjs`.


## 📚 Reference Materials
- [Coding Standards](references/standards.md)
- [Review Protocol](references/review.md)
