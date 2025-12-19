# 📚 Documentation Index

Welcome to the ExtraHand Live Tracking Platform! This index helps you find the information you need.

## 🚀 Getting Started

**New to the project? Start here:**

1. **[QUICKSTART.md](./QUICKSTART.md)** - Get up and running in 5 minutes
   - Quick installation
   - Environment setup
   - First tracking test
   - Common issues

2. **[README.md](./README.md)** - Complete project overview
   - Features overview
   - Installation guide
   - Usage examples
   - Configuration details

## 📖 Core Documentation

### For Developers

- **[API.md](./API.md)** - Complete API reference
  - All endpoints documented
  - Request/response examples
  - WebSocket API
  - Integration examples (JavaScript, Python, cURL)

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture
  - High-level architecture diagrams
  - Data flow sequences
  - Component structure
  - Performance & scaling

- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines
  - Development setup
  - Code style guide
  - Pull request process
  - Areas for contribution

### For DevOps/Deployment

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment guide
  - Vercel deployment (serverless)
  - Railway deployment (full WebSocket)
  - AWS EC2 setup
  - Docker deployment
  - Environment configuration

## 🔍 Quick Reference

### Configuration Files

| File | Purpose |
|------|---------|
| `.env.example` | Template for all environment variables |
| `.env.local.example` | Local development environment template |
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript configuration |
| `tailwind.config.ts` | Tailwind CSS settings |
| `next.config.js` | Next.js configuration |

### Key Source Files

| File | Description |
|------|-------------|
| `app/track/[taskId]/page.tsx` | Main tracking page |
| `components/LiveMap.tsx` | Google Maps with animations |
| `hooks/useSocket.ts` | WebSocket + polling logic |
| `lib/redis.ts` | Redis utilities |
| `lib/eta.ts` | ETA calculation engine |
| `server.js` | Custom WebSocket server |

## 📋 By Use Case

### "I want to..."

#### Set up the project locally
→ Read [QUICKSTART.md](./QUICKSTART.md)

#### Understand the API
→ Read [API.md](./API.md)

#### Deploy to production
→ Read [DEPLOYMENT.md](./DEPLOYMENT.md)

#### Understand how it works
→ Read [ARCHITECTURE.md](./ARCHITECTURE.md)

#### Contribute code
→ Read [CONTRIBUTING.md](./CONTRIBUTING.md)

#### See all features
→ Read [README.md](./README.md)

#### Get a complete overview
→ Read [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)

## 🎯 Common Tasks

### Quick Setup
```bash
# See QUICKSTART.md
npm install
cp .env.example .env.local
# Edit .env.local
npm run dev
```

### Initialize a Task
```bash
# See API.md for details
curl -X POST http://localhost:3000/api/task/init \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

### Update Location
```bash
# See API.md for details
curl -X POST http://localhost:3000/api/driver/update \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

### Deploy to Production
```bash
# See DEPLOYMENT.md for platform-specific instructions
npm run build
npm start
```

## 🔗 External Resources

### Get API Keys

- **Google Maps**: [console.cloud.google.com](https://console.cloud.google.com)
- **Upstash Redis**: [upstash.com](https://upstash.com) (Free tier)
- **MongoDB Atlas**: [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) (Free tier)

### Learn More

- **Next.js**: [nextjs.org/docs](https://nextjs.org/docs)
- **Socket.IO**: [socket.io/docs](https://socket.io/docs)
- **Google Maps API**: [developers.google.com/maps](https://developers.google.com/maps)
- **Tailwind CSS**: [tailwindcss.com/docs](https://tailwindcss.com/docs)

## 📊 Project Structure

```
ExtraHand-Maps/
│
├── 📚 Documentation
│   ├── README.md              - Main documentation
│   ├── QUICKSTART.md          - 5-minute setup
│   ├── API.md                 - API reference
│   ├── ARCHITECTURE.md        - System design
│   ├── DEPLOYMENT.md          - Deployment guide
│   ├── CONTRIBUTING.md        - How to contribute
│   ├── PROJECT_SUMMARY.md     - Complete overview
│   └── INDEX.md               - This file
│
├── 🔧 Configuration
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── next.config.js
│
├── 💻 Source Code
│   ├── app/                   - Next.js pages & API
│   ├── components/            - React components
│   ├── hooks/                 - Custom hooks
│   ├── lib/                   - Utilities
│   ├── store/                 - State management
│   └── types/                 - TypeScript types
│
└── 🛠️ Utilities
    ├── server.js              - WebSocket server
    ├── test-api.js            - API testing
    └── setup.sh               - Setup script
```

## 🎓 Learning Path

### Beginner
1. Read [QUICKSTART.md](./QUICKSTART.md)
2. Follow the setup steps
3. Test with demo task
4. Read [README.md](./README.md) Features section

### Intermediate
1. Read [API.md](./API.md)
2. Understand all endpoints
3. Test with real data
4. Read [ARCHITECTURE.md](./ARCHITECTURE.md) Data Flow

### Advanced
1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) completely
2. Read [DEPLOYMENT.md](./DEPLOYMENT.md)
3. Set up production environment
4. Read [CONTRIBUTING.md](./CONTRIBUTING.md)
5. Start contributing!

## 🆘 Getting Help

### Documentation
1. Check this INDEX
2. Read relevant documentation
3. Search in files (Ctrl+F)

### Issues
- Check existing issues in repository
- Create new issue with details

### Questions
- Check [README.md](./README.md) FAQ section
- Review [API.md](./API.md) examples
- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for system understanding

## 📝 Document Versions

All documentation is kept in sync with code version 1.0.0

Last Updated: December 2024

---

## 📌 Quick Links

| Document | Best For |
|----------|----------|
| [QUICKSTART.md](./QUICKSTART.md) | Getting started quickly |
| [README.md](./README.md) | Complete reference |
| [API.md](./API.md) | API integration |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Understanding internals |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Going to production |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contributing code |
| [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) | Complete overview |

---

**Need something else?** Check the file tree above or search in the repository!

**Ready to start?** → [QUICKSTART.md](./QUICKSTART.md)
