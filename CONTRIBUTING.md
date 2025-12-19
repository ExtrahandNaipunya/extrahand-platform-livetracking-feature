# Contributing to ExtraHand Live Tracking

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Development Setup

1. Fork the repository
2. Clone your fork:
```bash
git clone https://github.com/your-username/ExtraHand-Maps.git
cd ExtraHand-Maps
```

3. Install dependencies:
```bash
npm install
```

4. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

5. Run development server:
```bash
npm run dev
```

## Code Style

- **TypeScript**: All new code must be TypeScript
- **Formatting**: Use Prettier (run `npm run format`)
- **Linting**: Run `npm run lint` before committing
- **Types**: Avoid `any`, use proper types

## Project Structure

```
app/              # Next.js app directory (pages and API routes)
components/       # React components
hooks/           # Custom React hooks
lib/             # Utility libraries
store/           # Zustand state management
types/           # TypeScript type definitions
```

## Making Changes

### For Bug Fixes

1. Create a new branch:
```bash
git checkout -b fix/description-of-fix
```

2. Make your changes
3. Add tests if applicable
4. Commit with clear message:
```bash
git commit -m "fix: description of what was fixed"
```

### For Features

1. Create a new branch:
```bash
git checkout -b feature/description-of-feature
```

2. Implement the feature
3. Update documentation
4. Add tests
5. Commit:
```bash
git commit -m "feat: description of new feature"
```

## Commit Message Convention

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Build/config changes

## Pull Request Process

1. Update README.md if needed
2. Ensure all tests pass
3. Update CHANGELOG.md
4. Create pull request with clear description
5. Wait for review

## Testing

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build test
npm run build
```

## Areas for Contribution

- 📱 Mobile responsiveness improvements
- 🎨 UI/UX enhancements
- ⚡ Performance optimizations
- 📚 Documentation improvements
- 🧪 Test coverage
- 🌐 Internationalization (i18n)
- 🔒 Security enhancements

## Questions?

Feel free to open an issue for discussion before making major changes.

Thank you for contributing! 🚀
