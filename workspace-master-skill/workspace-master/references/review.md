# Code Review Protocol

Before applying any code changes, Gemini CLI must answer:

1. **Impact Analysis:** Does this change affect other parts of the workspace (e.g., Scheduler v2 vs Image Organizer)?
2. **Redundancy Check:** Is there an existing utility or component that does this?
3. **Security Audit:** Are any secrets being exposed? Is input being sanitized?
4. **Efficiency:** Is this the most context-efficient way to implement the feature?

## Review Workflow
- **Plan Phase:** Describe the planned change clearly.
- **Self-Review:** Simulate potential edge cases (e.g., "What if the user is offline?").
- **Verification:** Outline how the change will be tested after implementation.
