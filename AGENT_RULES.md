🤖 How to Work With Me
Communication Style

    Always ask questions if anything is unclear

    Be factual - base responses on verified information

    Call me out when I'm overcomplicating things

    Suggest simpler alternatives when I'm heading toward overkill

Tool Preferences

    DeepSeek: Detailed prompts and code discussions

    Replit: Heavy UI development

    Claude: Bug fixing, simplifying, and refactoring
## 🛠️ Tech Stack Preferences

### Core Development Stack

| Component        | Technology                     | Version | Purpose                          |
|------------------|--------------------------------|---------|----------------------------------|
| Runtime          | Node.js                        | 18+     | JavaScript server runtime        |
| Framework        | Express.js                     | 4.x     | Web application framework        |
| Language         | TypeScript                     | 5.0+    | Type-safe development            |
| Frontend         | React + TypeScript             | 18+     | Modern UI development            |
| Styling          | Tailwind CSS + shadcn/ui       | Latest  | Utility-first CSS + components   |
| Database ORM     | Drizzle ORM                    | 0.28+   | Type-safe database operations    |
| Validation       | Zod                            | 3.x     | Schema validation and type inference |
| Authentication   | JWT + bcrypt or Clerk          | 9.x + 5.x | Secure authentication            |
| HTTP Client      | Axios                          | 1.x     | External service integration      |

### Database Layer

| Component        | Technology                     | Version | Purpose                          |
|------------------|--------------------------------|---------|----------------------------------|
| Database         | PostgreSQL                     | 15+     | ACID-compliant relational database |
| Migration Tool   | Drizzle Kit                    | 0.19+   | Database schema management       |
| Connection       | postgres.js                    | 3.x     | Database connection pooling      |

### Infrastructure & Deployment

| Component        | Technology                     | Purpose                          |
|------------------|--------------------------------|----------------------------------|
| VPS              | RackNerd VPS                  | Production hosting               |
| Database         | Supabase                       | Development/Staging database     |
| Analytics        | Umami Analytics                | Privacy-focused analytics        |
| Email            | MSMTP + Resend                 | Transactional emails             |
| Reverse Proxy    | Nginx                          | Load balancing and SSL          |
| Version Control   | GitHub                         | Source code management           |

### For Complex Projects

| Component          | Technology                     | Purpose                          |
|--------------------|--------------------------------|----------------------------------|
| Container Registry  | GHCR (GitHub Container Registry) | Docker image storage            |
| Orchestration      | Docker + Docker Compose        | Container management             |
| CI/CD              | GitHub Actions                 | Automated deployment             |
| Monitoring         | PostHog                        | Product analytics                |
🚀 Development Workflow
Environments

    Development: Local machines + Replit for UI

    Staging: VPS with isolated database

    Production: VPS with containerized setup

Deployment Strategy
bash

# Simple Projects
Local → GitHub → VPS (direct deployment)

# Complex Projects  
Local → GitHub → GHCR → VPS (containerized)

💡 Core Principles
Technology Choices

    Always prefer open-source solutions

    Avoid vendor lock-in whenever possible

    Use free/generous tiers for initial development

    Simplicity wins over complexity

    Every piece of code must have a purpose

Architecture Guidelines

    Keep it simple - don't introduce complexity without clear need

    Containerize only when necessary - start simple, scale as needed

    Use established patterns - don't reinvent the wheel

    Focus on maintainability - clean, documented code

🎯 When Suggesting Solutions
Always Consider

    Is this the simplest approach?

    Can this be done with existing tools?

    What's the maintenance burden?

    Is there vendor lock-in?

    Does this align with my tech preferences?

Red Flags to Call Out

    Over-engineering simple problems

    Adding unnecessary dependencies

    Complex solutions for straightforward tasks

    Vendor-specific implementations when open alternatives exist

🔧 Quick Reference
Common Commands
bash

# Database
npx drizzle-kit generate
npx drizzle-kit push

# Development
npm run dev
npm run build

# Docker
docker-compose up -d
docker-compose down

Default Ports & URLs

    Local Dev: http://localhost:3000

    PostgreSQL: 5432

    API Server: 3001 (if separate)
