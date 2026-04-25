# Firebase Architectural Mastery

## 🔥 Firestore Patterns
- **Sub-collections vs Top-level:** Use sub-collections for data that scales per user (e.g., `schedules`).
- **Atomic Operations:** Use `writeBatch()` or `runTransaction()` for critical data integrity.
- **Indexing:** Avoid large collection scans; always design queries with indexes in mind.

## 🔐 Security Rules
- **Role-based Access:** `allow read, write: if request.auth != null && request.auth.uid == userId;`.
- **Validation:** Use `request.resource.data` to validate data types before saving.
