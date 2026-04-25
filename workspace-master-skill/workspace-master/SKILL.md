---
name: workspace-master
description: A comprehensive skill for managing MyAgentProject workspace, enforcing full-stack standards, automating project sync, and conducting rigorous code reviews. Use this when starting a new task, switching projects, or deploying changes.
---

# Workspace Master

Welcome to the command center for MyAgentProject. This skill optimizes your performance across all active sub-projects.

## 🛠 Project Lifecycle Workflow

1. **Start of Session:**
   - Read `GEMINI.md` in the root and project directories.
   - Run `git pull` on the active project to ensure context is fresh.
2. **Implementation Phase:**
   - Refer to [standards.md](references/standards.md) for Next.js, Firebase, and security rules.
   - Use [review.md](references/review.md) to validate plans before execution.
3. **End of Task:**
   - Update `GEMINI.md` with detailed progress.
   - Stage changes and propose a commit message.
   - Run `git push` upon user confirmation.

## ⌨️ Quick Commands & Automation

- **Auto Sync:** Run `node scripts/sync.cjs` to automate the entire wrap-up process.
- **System Notification:** Run `node scripts/notify.cjs "메시지"` to send a Windows Toast notification.
- **Project Summary:** Use LLM capabilities to summarize the current conversation into `GEMINI.md` before syncing.

## 🔄 Automated Wrap-up Procedure
When the user says "Wrap up" or "Sync projects":
1.  **Reflect:** Summarize all code changes and conversation highlights.
2.  **Document:** Update the root `GEMINI.md` with a "Last Session Highlights" section.
3.  **Execute:** Run the internal sync script (`sync.cjs`) to push everything to Git.
4.  **Notify:** Always run `node scripts/notify.cjs "동기화 및 작업 종료가 완료되었습니다!"` as the final step.
5.  **Confirm:** Report the success and provide a clear entry point for the next session.

## 📚 Reference Materials
- [Coding Standards](references/standards.md)
- [Review Protocol](references/review.md)
