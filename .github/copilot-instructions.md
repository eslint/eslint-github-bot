# ESLint GitHub Bot

ESLint GitHub Bot is a Probot-based GitHub application that automates common tasks for repositories managed by the ESLint team. The bot handles commit message validation, work-in-progress PR management, automatic issue assignment, release monitoring, recurring issue creation, and needs-info processing.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap and Setup
- Clone the repository
- `npm install` -- takes 1-30 seconds depending on npm cache state. Works with Node.js 20.x but shows engine warnings (expects Node.js 22.x)
- Create `.env` file for local development:
  ```bash
  echo 'APP_ID=12345
  PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
  [valid PEM private key content]
  -----END RSA PRIVATE KEY-----"
  WEBHOOK_SECRET=test_webhook_secret_123
  PORT=3000' > .env
  ```

### Build and Test
- `npm run lint` -- takes ~1.5 seconds. NEVER CANCEL. Uses ESLint with eslint-config-eslint
- `npm test` -- takes ~3 seconds. NEVER CANCEL. Runs Jest with 284 tests achieving 98.31% coverage
- Run the web server: `npm start` -- starts immediately on port 3000
- Health check: `curl http://localhost:3000/ping` returns "PONG" in ~1.6ms

### Environment Requirements
- Node.js 22.x preferred (works on 20.x with warnings)
- npm 10.x
- Environment variables for server operation:
  - `APP_ID`: GitHub app ID (can be dummy value like 12345 for local testing)
  - `PRIVATE_KEY`: Valid PEM private key (required format, can be test key for local development)
  - `WEBHOOK_SECRET`: Webhook secret (can be dummy value for local testing)
  - `PORT`: Server port (optional, defaults to 3000)

## Validation

### Manual Testing Requirements
- ALWAYS run the full test suite after making changes: `npm test`
- ALWAYS run linting before committing: `npm run lint`
- Test server startup: `npm start` and verify health check responds: `curl http://localhost:3000/ping`
- For plugin changes, run relevant test files: `npm test tests/plugins/[plugin-name]/index.js`

### Critical Timing Requirements
- **NEVER CANCEL** any commands - all operations complete quickly
- npm install: 1-30 seconds (set timeout to 60+ seconds)
- npm test: ~3 seconds (set timeout to 30+ seconds)
- npm run lint: ~1.5 seconds (set timeout to 30+ seconds)
- Server startup: immediate (set timeout to 10+ seconds)

## Common Tasks

### Plugin Development
The bot uses a plugin architecture with 6 core plugins in `src/plugins/`:

1. **auto-assign** (`src/plugins/auto-assign/index.js`): Auto-assigns issues to users who indicate willingness to submit PRs
2. **commit-message** (`src/plugins/commit-message/index.js`): Validates PR titles follow ESLint commit message guidelines
3. **needs-info** (`src/plugins/needs-info/index.js`): Adds comments when "needs info" label is added to issues
4. **recurring-issues** (`src/plugins/recurring-issues/index.js`): Creates new scheduled release and TSC meeting issues
5. **release-monitor** (`src/plugins/release-monitor/index.js`): Manages PR status during release phases
6. **wip** (`src/plugins/wip/index.js`): Handles work-in-progress PR status based on title/labels

### Adding New Plugins
1. Create plugin file in `src/plugins/[plugin-name]/index.js`
2. Add plugin to exports in `src/plugins/index.js`
3. Add plugin to enabled list in `src/app.js`
4. Create tests in `tests/plugins/[plugin-name]/index.js`
5. Follow existing plugin patterns using Probot event handlers

### File Structure Reference
```
src/
├── app.js                 # Main application entry point
└── plugins/
    ├── index.js          # Plugin exports
    ├── auto-assign/
    ├── commit-message/
    ├── needs-info/
    ├── recurring-issues/
    ├── release-monitor/
    └── wip/

tests/
├── __mocks__/            # Test mocks
└── plugins/              # Plugin tests mirror src structure

.github/
└── workflows/
    ├── ci.yml           # CI pipeline (lint + test)
    ├── deploy.yml       # Deployment workflow
    ├── add-to-triage.yml
    └── stale.yml

docs/
├── commit-message-check.md  # Commit message validation docs
└── edit-pr-title-explanation.png
```

### Key Configuration Files
- `package.json`: Dependencies, scripts, Jest config
- `eslint.config.js`: ESLint configuration using eslint-config-eslint
- `.editorconfig`: Code formatting rules
- `Procfile`: Production deployment config for Dokku
- `.gitignore`: Excludes node_modules, coverage, .env, *.pem files

### Common Command Outputs

#### Repository Root Files
```bash
$ ls -la
.editorconfig
.git/
.github/
.gitignore
.npmrc
CONTRIBUTING.md
LICENSE
Procfile
README.md
docs/
eslint.config.js
package-lock.json
package.json
src/
tests/
```

#### Package.json Scripts
```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "npm run lint -- --fix",
    "start": "node ./src/app.js",
    "test": "jest --colors --verbose --coverage"
  }
}
```

#### Test Coverage Summary
```
All files                 |   98.31 |     93.1 |   98.36 |   98.21 |
Test Suites: 6 passed, 6 total
Tests:       284 passed, 284 total
Time:        ~3 seconds
```

## Troubleshooting

### Node.js Version Warnings
- Repository expects Node.js 22.x but works on 20.x with warnings
- Engine warnings are normal and do not prevent functionality
- All commands and tests work correctly despite version mismatch

### Server Won't Start
- Ensure `.env` file exists with required environment variables
- `PRIVATE_KEY` must be valid PEM format (can be test key for local development)
- Server defaults to port 3000, check for port conflicts

### Test Failures
- Run `npm install` to ensure dependencies are current
- Check that changes don't break existing plugin functionality
- Verify new tests follow existing patterns in `tests/plugins/` structure

### Deployment Notes
- Production deployment uses Dokku to github-bot.eslint.org
- Health check endpoint: https://github-bot.eslint.org/ping
- Webhook URL: /api/github/webhooks (Probot default)
- Uses `Procfile` for production process management

## Development Workflow

1. Make changes to plugin code in `src/plugins/`
2. Update or add tests in `tests/plugins/`
3. Run `npm test` to verify all tests pass (NEVER CANCEL - takes ~3 seconds)
4. Run `npm run lint` to check code style (NEVER CANCEL - takes ~1.5 seconds)
5. Test server functionality: `npm start` and verify `/ping` responds
6. For plugin changes, manually test relevant GitHub webhook scenarios if possible

Always follow this complete validation workflow before committing changes.
