# Contributing

Create a focused branch such as `feature/motion-engine` or `fix/trackpad-jitter`, then keep commits small and use Conventional Commits.

Before opening a pull request, run:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

Visual changes should include before/after evidence and must be checked in dark mode, light mode, reduced motion, and at a compact viewport.
