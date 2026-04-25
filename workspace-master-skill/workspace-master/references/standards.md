# Full-Stack Coding & Security Standards

## 🛡️ Security First
- **Never commit .env files:** Always use `.env.local` for local development.
- **API Key Protection:** Ensure all Firebase/Cloudinary keys are accessed via `process.env`.
- **Validation:** Always validate data transfer between frontend and backend.

## ⚛️ Next.js & React Patterns
- **Use Client Components Sparingly:** Only when interactivity or browser APIs are needed.
- **Tailwind CSS:** Use consistent spacing and color palettes as defined in the project.
- **Error Handling:** Use try/catch/finally blocks for all async operations, especially Firebase calls.

## 🔥 Firebase Best Practices
- **Rules:** Always consider Firestore security rules when designing queries.
- **Sync:** Prefer `onSnapshot` for real-time UI updates to keep multiple devices in sync.
- **Cleanup:** Always provide a way to unsubscribe from listeners to prevent memory leaks.
