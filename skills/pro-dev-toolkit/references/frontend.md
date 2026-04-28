# Advanced Frontend & Tailwind Standards

## 🎨 Modern UI Patterns
- **Glassmorphism:** `bg-slate-900/40 backdrop-blur-xl border border-slate-800`.
- **Interactive Feedback:** Always add `transition-all duration-300` and `hover:scale-[1.02]` for interactive elements.
- **Typography:** Use `tracking-tighter` for headings and `tracking-widest` for small labels.

## 🛠️ Tailwind Best Practices
- **Component Extraction:** If a pattern repeats more than 3 times, extract it into a reusable component.
- **Responsive Design:** Mobile-first approach using `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`.
- **Customization:** Prefer `tailwind.config.js` for colors and spacing rather than arbitrary values.
