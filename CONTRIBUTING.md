# Contributing to Velobase Harness

Thanks for your interest in contributing! Here's how to get started.

## Getting Started

1. **Fork** the repo and clone your fork
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the dev environment:
   ```bash
   pnpm docker:db:up
   pnpm dev:all
   ```
4. Open `http://localhost:3000` to verify everything works

## Making Changes

1. Create a branch from `main`:
   ```bash
   git checkout -b your-branch-name
   ```
2. Make your changes
3. Run linting and type checks:
   ```bash
   pnpm lint
   pnpm typecheck
   ```
4. Commit with a clear message:
   ```
   feat: add new billing webhook handler
   fix: resolve credit calculation edge case
   docs: update deployment guide
   ```

## Submitting a Pull Request

1. Push your branch to your fork
2. Open a PR against `main`
3. Describe what you changed and why
4. Link any related issues

We'll review your PR as soon as we can. For larger changes, open an issue first to discuss the approach.

## Reporting Bugs

Open a [GitHub issue](https://github.com/velobase/velobase-harness/issues) with:
- What you expected to happen
- What actually happened
- Steps to reproduce

## Community

- [Discord](https://discord.gg/UnzEZJRnUf) — ask questions, share what you're building
- [X / Twitter](https://x.com/VelobaseX) — follow for updates

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
