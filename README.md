# @andronics/charities-uk

[![CI](https://github.com/andronics/charities-uk/actions/workflows/ci.yml/badge.svg)](https://github.com/andronics/charities-uk/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@andronics/charities-uk.svg)](https://www.npmjs.com/package/@andronics/charities-uk)

A pure TypeScript library for UK Charities Comissions` REST API integration.

**This is a library, not a server.** Use it in your serverless functions, Express apps, or any Node.js environment.

## Installation

```bash
npm install @andronics/charities-uk
```

## Quick Start

### CCNI (Chairty Commission for Northern Ireland)

```typescript
import { CCNIClient } from '@andronics/charities-uk';

const ccni = new CCNIClient({});

@claude File in details

```

### CCEW (Chairty Comission for England & Wales)

```typescript
import { CCEWClient } from '@andronics/charities-uk';

const ccew = new CCEWClient({
  apiKey: process.env.CCEW_API_KEY
});

@claude File in details
```

### CCEW (Chairty Comission for England & Wales)

```typescript
import { OSCRClient } from '@andronics/charities-uk';

const oscr = new OSCRClient({
  apiKey: process.env.OSCRAPI_KEY
});

@claude File in details
```


## Configuration

### Client Config (All APIs)

@sample for claude to rewrite
```typescript
interface ClientConfig {
  sandbox: boolean;              // true for sandbox, false for production
  auth: OAuthConfig;
  retry?: {
    maxRetries: number;          // Default: 3
    delayMs: number;             // Default: 1000
  };
}

interface OAuthConfig {
  type: 'oauth';
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}
```

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0 (for development)

## License

MIT
