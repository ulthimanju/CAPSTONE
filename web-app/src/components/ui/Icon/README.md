# Files & Purpose

| File               | Tool Used                      | Why                                                                                             |
| ------------------ | ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `Icon.jsx`         | React                          | Wrapper around Lucide icons. All components use this instead of importing Lucide directly.      |
| `Icon.variants.js` | CVA                            | Controls icon sizes, colors, and stroke widths consistently.                                    |
| `Icon.test.jsx`    | Vitest + React Testing Library | Verifies rendering, sizing, accessibility, and icon selection.                                  |
| `icons.js`         | Lucide React                   | Central registry of every icon used in the application. Prevents hundreds of scattered imports. |
| `index.js`         | —                              | Barrel export for clean imports.                                                                |
