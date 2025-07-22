# 🛒 shliste – The Smartest Shopping List App Ever

**shliste** (from "short" + German *Liste*) is a modern, powerful shopping list and recipe management app built with [Nuxt 4](https://nuxt.com/). Designed to simplify your grocery runs and meal planning, shliste helps you organize what you need, where to get it, and how to cook it – all in one place.

🔗 **Live App:** [https://shliste.app](https://shliste.app)

## ✨ Features

- ✅ **Create & Manage Lists**  
  Add multiple shopping lists and organize them however you want – groceries, parties, camping, and more.

- 🏷️ **Add Items with Context**  
  Save items with descriptions, quantities, and even **where** to find them (aisles, stores, etc).

- 🧠 **Smart Item Suggestions**  
  Reuse your commonly bought items – no need to type them again and again.

- 🥘 **Recipe Manager**  
  Create recipes with steps and ingredients, then add all ingredients to a shopping list with one click.

- 🔁 **Google Drive Sync**  
  Connect your account to sync lists and recipes to the cloud – works seamlessly in the background.

- 💾 **Offline First**  
  Works offline until you connect your Google Drive – perfect for quick access anywhere.

- 🖋️ **Interactive & Easy to Use**  
  Check off, uncheck, or remove items from your lists with a single tap.

## 🚀 Getting Started

### Local Development

```bash
git clone https://github.com/shroomlife/shliste.git
cd shliste
bun install
bun run dev
```

### Build for Production

```bash
bun run build
```

### Docker Build & Push

```bash
# Build Docker image
bun run docker:build

# Push to Docker Hub
bun run docker:push

# Both in one command
bun run pb
```

## 📦 NPM Scripts

| Command           | Description                              |
|-------------------|------------------------------------------|
| `dev`             | Start development server                 |
| `build`           | Build the app for production             |
| `generate`        | Generate static files                    |
| `preview`         | Preview the production build             |
| `lint`            | Run ESLint                               |
| `lint:fix`        | Auto-fix lint issues                     |
| `docker:build`    | Build Docker Image                       |
| `docker:push`     | Push Docker Image                        |
| `pb`              | Build and Push Docker Image              |

## 🧱 Tech Stack

- [Nuxt 4](https://nuxt.com/)
- [Vue 3](https://vuejs.org/)
- [Pinia](https://pinia.vuejs.org/) – State management
- [TailwindCSS](https://tailwindcss.com/) – UI styling
- [SweetAlert2](https://sweetalert2.github.io/) – Alerts
- [Yup](https://github.com/jquense/yup) – Validation
- [OpenAI](https://platform.openai.com/) – Smart suggestions (optional)
- [Google Drive API](https://developers.google.com/drive) – Cloud sync
- [Bun](https://bun.sh/) – Fast all-in-one JavaScript runtime

## 📄 License

MIT License © 2025 [shroomlife](https://github.com/shroomlife)

---

> Designed for those who want **smart, fast, and practical** grocery & recipe planning – because life’s too short for bad shopping lists.
