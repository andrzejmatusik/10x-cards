# 10x-cards

An AI-powered educational flashcard application that enables users to quickly create and manage flashcard sets for efficient learning through spaced repetition.

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)

## Project Description

10x-cards is a web application designed to streamline the creation and management of educational flashcards. The application leverages Large Language Models to automatically generate high-quality flashcard suggestions from user-provided text, significantly reducing the time and effort required to create effective study materials.

### Key Features

- **AI-Powered Flashcard Generation**: Paste text and automatically generate flashcard suggestions using LLM models via API
- **Manual Flashcard Management**: Create, edit, and delete flashcards manually with a user-friendly interface
- **User Authentication**: Secure registration and login system for personalized flashcard collections
- **Spaced Repetition**: Integrated learning algorithm for optimized study sessions
- **Privacy & Security**: GDPR-compliant data storage with full user control over personal data
- **Usage Analytics**: Track flashcard generation and acceptance statistics

### User Problem

Creating high-quality flashcards manually requires significant time and effort, which often discourages users from utilizing effective learning methods like spaced repetition. 10x-cards solves this by automating the flashcard creation process while maintaining quality and allowing full user control over the final content.

## Tech Stack

### Frontend

- **[Astro](https://astro.build/) v5.13.7** - Modern web framework for building fast, content-focused applications
- **[React](https://react.dev/) v19.1.1** - UI library for interactive components
- **[TypeScript](https://www.typescriptlang.org/) v5** - Static typing for improved code quality
- **[Tailwind CSS](https://tailwindcss.com/) v4.1.13** - Utility-first CSS framework
- **[Shadcn/ui](https://ui.shadcn.com/)** - Accessible, customizable component library built on Radix UI

### Backend

- **[Supabase](https://supabase.com/)** - Backend-as-a-Service platform providing:
  - PostgreSQL database
  - Built-in user authentication
  - RESTful API with SDKs
  - Open-source and self-hostable

### AI Integration

- **[Openrouter.ai](https://openrouter.ai/)** - Unified API for accessing multiple LLM models with:
  - Access to diverse models for cost-effective solutions
  - Financial limits on API keys
  - Model flexibility for optimal performance

### DevOps & Hosting

- **GitHub Actions** - CI/CD pipeline automation
- **DigitalOcean** - Application hosting via Docker containers

### Development Tools

- **ESLint** - Code linting with React, TypeScript, and Astro support
- **Prettier** - Code formatting

## Getting Started Locally

### Prerequisites

- **Node.js v22.14.0** (as specified in `.nvmrc`)
  - We recommend using [nvm](https://github.com/nvm-sh/nvm) to manage Node versions
  - Run `nvm use` in the project directory to switch to the correct version
- **npm** (comes with Node.js)
- **Supabase account** - For database and authentication
- **Openrouter.ai API key** - For AI flashcard generation

### Installation

1. Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/10xdevs.git
cd 10xdevs
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

Create a `.env` file in the root directory (use `.env.example` as a template):

```env
# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Openrouter.ai
OPENROUTER_API_KEY=your_openrouter_api_key
```

4. Set up Supabase:
   - Create a new Supabase project
   - Run database migrations (if available)
   - Configure authentication providers

5. Run the development server:

```bash
npm run dev
```

The application should now be running at `http://localhost:3000`

6. Build for production:

```bash
npm run build
```

7. Preview production build:

```bash
npm run preview
```

## Available Scripts

| Script             | Description                                  |
| ------------------ | -------------------------------------------- |
| `npm run dev`      | Start the development server with hot-reload |
| `npm run build`    | Build the application for production         |
| `npm run preview`  | Preview the production build locally         |
| `npm run astro`    | Run Astro CLI commands                       |
| `npm run lint`     | Run ESLint to check code quality             |
| `npm run lint:fix` | Automatically fix ESLint issues              |
| `npm run format`   | Format code with Prettier                    |

## Project Scope

### In Scope (MVP Features)

1. **Automatic Flashcard Generation**
   - Text input (1,000-10,000 characters)
   - LLM-powered flashcard suggestions
   - Review, edit, accept, or reject generated flashcards

2. **Manual Flashcard Management**
   - Create flashcards manually (front and back)
   - Edit existing flashcards
   - Delete unwanted flashcards
   - View all flashcards in "My Flashcards" section

3. **User Authentication & Accounts**
   - User registration and login
   - Secure password storage
   - Account deletion with associated data removal

4. **Spaced Repetition Learning**
   - Integration with existing spaced repetition algorithm
   - Learning session interface
   - Self-assessment and progress tracking

5. **Data Management**
   - Scalable and secure data storage
   - GDPR compliance
   - User data access and deletion rights

6. **Analytics**
   - Track number of AI-generated flashcards
   - Monitor acceptance rate of AI suggestions

## AI Development Support

This project is configured with AI development tools to enhance the development experience:

- **Claude Code**: Project instructions in `CLAUDE.md`
