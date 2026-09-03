# Contributing to Global Messenger

Thank you for helping improve Global Messenger. The project welcomes contributions from developers, designers, testers, documentation writers and people who simply use the product and can explain what should be better.

You do not need to understand the entire codebase before contributing. Start with one small, clearly scoped improvement.

## 1. Start by using the product

Before changing code, try the current application when possible. Test with two accounts so you can see the realtime experience from both sides.

Useful areas to test:

- Registration and login
- One-to-one messaging
- Groups
- Profiles and contact views
- Online/offline and last seen
- Typing indicators
- Replies and reactions
- Edit/delete behavior
- Image/file sharing
- Notifications
- Voice/video calling
- Reconnect after network loss
- Android behavior

If you find a problem, open an Issue with enough information for another contributor to reproduce it.

## 2. Find something to work on

Good contribution areas include:

- Bug fixes
- UI/UX improvements
- Accessibility
- Responsive/mobile improvements
- Android device testing
- Automated tests
- Performance
- Security and authorization
- Documentation
- Developer experience
- New messaging features

For a first contribution, prefer a small bug, documentation improvement, test, accessibility fix or isolated UI improvement.

## 3. Before coding

1. Search existing Issues and Pull Requests so you do not duplicate work.
2. Open or comment on an Issue describing the problem or proposed feature.
3. Explain expected behavior and current behavior where relevant.
4. For larger changes, discuss the approach before implementing it.
5. Keep the change focused.
6. Never commit passwords, tokens, private keys, local `.env` files or generated credentials.

## 4. Local development

Requirements:

- Node.js 22 LTS or newer
- npm
- PostgreSQL for backend development, or the repository's Docker setup
- Android Studio only when working on Android

Install dependencies:

```bash
npm install
```

Start development:

```bash
npm run dev
```

Useful checks:

```bash
npm run build
npm run verify:local
npm run smoke
```

If a command fails, include the exact command and relevant error output in the Issue or Pull Request. Do not include secrets or private user data.

## 5. Branches

Create a focused branch from the current `main` branch:

```bash
git checkout main
git pull origin main
git checkout -b fix/short-description
```

Examples:

```text
fix/profile-view
fix/message-reconnect
feat/group-admin-controls
docs/android-installation
test/call-permissions
```

Do not develop directly on `main` for a contribution unless you are maintaining your own fork and understand the release workflow.

## 6. Pull requests

A good Pull Request should include:

- A clear title
- What changed
- Why it changed
- The related Issue, when applicable
- How it was tested
- Screenshots or a short recording for UI changes
- Any database/API migration notes
- Any security/privacy implications
- Any known limitations

Keep one logical change per Pull Request whenever possible.

## 7. Testing realtime features

Realtime messaging is easy to break with changes that look harmless in one browser. Test important messaging changes with **two independent accounts**.

For example:

```text
Account A → sends message → Account B
Account B → replies       → Account A
Account A → disconnects   → reconnects
Account B → checks state
```

For calls, test microphone/camera permission approval and denial, call acceptance, decline, ending, reconnect behavior and physical Android devices when possible.

## 8. UI contribution guidelines

For UI changes:

- Preserve responsive behavior on desktop and mobile.
- Keep destructive actions clearly labeled.
- Maintain keyboard accessibility where applicable.
- Do not expose private user information unnecessarily.
- Reuse existing components/styles before adding duplicates.
- Include screenshots for meaningful visual changes.

## 9. Security contributions

Security issues should not be posted publicly with exploitable details. Follow [`SECURITY.md`](./SECURITY.md) for responsible reporting.

Never add API keys or provider credentials to source code. Secrets belong in the deployment environment or GitHub Actions secrets where required by the build/release process.

## 10. Documentation contributions

Documentation is a first-class contribution. Useful improvements include:

- Fixing unclear setup steps
- Adding troubleshooting for real errors
- Explaining architecture
- Improving Android instructions
- Adding examples
- Correcting outdated commands
- Improving screenshots and feature explanations

If you discover that the code and documentation disagree, open an Issue or update both when the intended behavior is clear.

## 11. Review and merge

Pull Requests may be reviewed for correctness, security, maintainability, tests and user experience. Review feedback is part of the contribution process; update the branch rather than opening multiple duplicate Pull Requests.

CI should pass before merge whenever the relevant checks are available.

## 12. Releases

Contributors should normally submit changes through Pull Requests. Production Android releases are maintained separately from normal development builds.

The project uses semantic version tags such as:

```text
v1.0.0
v1.0.1
v1.1.0
```

See [`06-android-play-store.md`](./06-android-play-store.md) and [`07-release-checklist.md`](./07-release-checklist.md) for the release process.

## 13. Growing the contributor community

The best way to attract contributors is to make the project easy to try, easy to understand and easy to improve.

Project maintainers should regularly:

1. Keep the README focused on what the product does and how to try it.
2. Keep the live demo and latest Android release working.
3. Create small Issues suitable for first-time contributors.
4. Clearly label beginner-friendly work as `good first issue` when the label is available.
5. Use `help wanted` for issues where outside contributors are especially welcome.
6. Explain the expected result and acceptance criteria in Issues.
7. Respond respectfully and promptly to Pull Requests and Issues.
8. Celebrate useful contributions in release notes.
9. Keep screenshots and feature documentation current.
10. Ask users to report bugs and improvements after trying the product.

A contributor does not have to write code. Someone who finds a reproducible bug, improves a translation, tests Android devices, improves accessibility, writes documentation or creates a useful design improvement is also contributing.

## 14. Contributor checklist

Before opening a Pull Request:

- [ ] I searched for an existing Issue/PR.
- [ ] I kept the change focused.
- [ ] I did not commit secrets or credentials.
- [ ] I tested the changed behavior.
- [ ] I tested with two accounts for realtime changes where appropriate.
- [ ] I added screenshots for UI changes.
- [ ] I checked build/test commands relevant to my change.
- [ ] I documented important behavior or limitations.
- [ ] I considered security and privacy implications.

Thank you for helping make Global Messenger better for its users and future contributors.
