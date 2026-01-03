# UK Charity Commission Clients - Claude Code Guide

## Project Overview

A TypeScript library providing unified access to all three UK charity regulators:

| Regulator | Jurisdiction | API Status |
|-----------|--------------|------------|
| **CCEW** | England & Wales | REST API (requires API key) |
| **OSCR** | Scotland | REST API (requires API key) |
| **CCNI** | Northern Ireland | REST API (no auth required) |

**Goal**: BaseClient with shared HTTP/retry logic → Commission-specific clients → Normalized charity data model.

## Quick Start

```bash
npm install
npm run build
npm test
```

## Git Workflow

### Branching Strategy

**All development must occur on feature/fix branches - NEVER commit directly to main.**

| Branch Type | Naming Convention | Example |
|-------------|-------------------|---------|
| New feature | `feat/<description>` | `feat/ccni-client` |
| Bug fix | `fix/<description>` | `fix/http-error-handling` |
| Maintenance | `chore/<description>` | `chore/update-dependencies` |
| Documentation | `docs/<description>` | `docs/update-readme` |
| Refactoring | `refactor/<description>` | `refactor/base-client` |

### Conventional Commits

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

[optional body]

[optional footer(s)]
```

| Type | Purpose |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `chore` | Maintenance, tooling, dependencies |
| `docs` | Documentation only |
| `refactor` | Code refactoring (no feature change) |
| `test` | Adding or updating tests |
| `style` | Formatting, whitespace (no code change) |
| `perf` | Performance improvements |

**Examples:**
```bash
git commit -m "feat: add CCNI client implementation"
git commit -m "fix: handle rate limit errors in BaseClient"
git commit -m "chore: update typescript to v5.4"
git commit -m "docs: add API usage examples to README"
```

### Workflow

1. Create feature branch from `main`: `git checkout -b feat/my-feature`
2. Make changes and commit using conventional commits
3. Push branch and create PR (or merge directly for small changes)
4. Delete feature branch after merge

## Architecture Summary

See `ARCHITECTURE.md` for full details. Key points:

- **Pattern**: Abstract `BaseClient` extended by `CCEWClient`, `OSCRClient`, `CCNIClient`
- **Auth differs per client**: CCEW uses `Ocp-Apim-Subscription-Key`, OSCR uses `x-functions-key`, CCNI has no auth
- **Normalized output**: All clients return `Charity` interface regardless of source

## Directory Structure

```
src/
├── types/
│   ├── charity.ts          # Normalized Charity interface
│   ├── search.ts           # SearchQuery, SearchResult types
│   └── raw/                # Raw API response types per regulator
│       ├── ccew.ts
│       ├── oscr.ts
│       └── ccni.ts
├── core/
│   ├── base-client.ts      # Abstract base with HTTP, retry, rate limiting
│   ├── http.ts             # Fetch wrapper
│   └── errors.ts           # Custom error types
├── clients/
│   ├── ccew/
│   │   ├── client.ts
│   │   └── transform.ts    # CCEW raw → normalized
│   ├── oscr/
│   │   ├── client.ts
│   │   └── transform.ts
│   └── ccni/
│       ├── client.ts
│       └── transform.ts
└── index.ts                # Public exports
```

## Implementation Order

1. **Types first** - Define all interfaces before implementation
2. **CCNI client** - Easiest (no auth, richest API, good for validation)
3. **OSCR client** - Simple API structure
4. **CCEW client** - Most complex (multiple endpoints)
5. **Unified client** - Optional aggregator across all three

## API Endpoints Reference

### CCNI (No Auth)

```
Base: https://www.charitycommissionni.org.uk/umbraco/api/charityApi

GET /getSearchResults?searchText=&pageNumber=1&contextId=2153
GET /getCharityDetails?regId={number}&subId={number}
```

### OSCR (x-functions-key header)

```
Base: https://oscrapi.azurewebsites.net/api

GET /all_charities?page={n}&charitynumber={SC...}
GET /annualreturns?charityid={uuid}
```

### CCEW (Ocp-Apim-Subscription-Key header)

```
Base: https://api.charitycommission.gov.uk/register/api

Multiple endpoints - see ARCHITECTURE.md for full list
```

## Key Design Decisions

### Why Inheritance over Composition

Each commission client IS-A charity data client. The shared behaviour (auth headers, retry logic, rate limiting) is genuinely inherited. TypeScript's `abstract` methods enforce that each client implements required operations.

### Normalized vs Raw Types

- Raw types (`CCNICharityDetails`, `OSCRCharity`) match API responses exactly
- Normalized type (`Charity`) is the public interface
- Transform functions handle the mapping
- Raw data preserved in `_raw` field for escape hatch

### Error Handling Strategy

```typescript
// All clients throw these error types:
CharityNotFoundError      // 404 or empty result
RateLimitError           // 429 or rate limit response
AuthenticationError      // 401/403
NetworkError             // Connection failures
ApiError                 // Other API errors
```

## Testing Approach

- **Unit tests**: Transform functions, error handling
- **Integration tests**: Real API calls (use test charity numbers)
- **Mock data**: Stored in `tests/fixtures/` for offline testing

### Known Test Charity Numbers

| Regulator | Number | Name |
|-----------|--------|------|
| CCNI | 100002 | Cancer Lifeline |
| OSCR | SC000001 | Stoneyburn Community Education Centre |
| CCEW | 1234567 | (find a stable test charity) |

## Common Tasks

### Adding a new endpoint

1. Add raw response type to `src/types/raw/{regulator}.ts`
2. Add method to client class
3. Add transform function if normalizing
4. Add tests

### Updating normalized type

1. Update `src/types/charity.ts`
2. Update ALL transform functions in `src/clients/*/transform.ts`
3. Update tests

## Code Style

- Strict TypeScript (`strict: true`)
- Explicit return types on public methods
- JSDoc comments on public APIs
- No `any` - use `unknown` and narrow

## Environment Variables

```bash
CCEW_API_KEY=xxx        # Required for CCEW client
OSCR_API_KEY=xxx        # Required for OSCR client
# CCNI requires no API key
```

## Links

- [CCEW Developer Portal](https://api-portal.charitycommission.gov.uk/)
- [OSCR API Documentation](https://www.oscr.org.uk/about-charities/search-the-register/download-the-scottish-charity-register/oscr-public-apis/)
- [CCNI Charity Search](https://www.charitycommissionni.org.uk/charity-search/)