# Topoi Frontend

Next.js frontend for the Topoi personal map application.

## Quick Start

```bash
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local
npm run dev
```

**Access:** http://localhost:3000

## Project Structure

```
frontend/
├── src/
│   ├── app/             # Next.js App Router pages
│   ├── components/      # React components
│   ├── store/           # Zustand state management
│   ├── lib/             # API client & utilities
│   ├── hooks/           # Custom React hooks
│   └── types/           # TypeScript interfaces
├── public/              # Static assets & PWA
├── next.config.js       # Next.js configuration
├── tailwind.config.ts   # Tailwind CSS config
├── Dockerfile           # Production container
└── fly.toml             # Fly.io config
```

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Documentation

For detailed documentation, see [documentation/](../documentation/):

- [Architecture](../documentation/architecture.md) - System overview and components
- [Auth System](../documentation/auth-system.md) - Token handling and OAuth
- [Environment Variables](../documentation/environment.md) - Configuration options
- [Deployment](../documentation/deployment.md) - Fly.io and CI/CD
- [Local Development](../documentation/local-development.md) - Setup and troubleshooting
