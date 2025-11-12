# @bonniernews/bn-oidc-connector-express

Express middleware for handling user authentication from Bonnier News Fastly Compute OIDC headers.

## Overview

This library provides Express.js middleware to handle authentication and authorization for applications running behind Bonnier News's Fastly Compute infrastructure. The Fastly Compute service performs complete OIDC (OpenID Connect) authentication and passes user information to your Node.js application via HTTP headers.

## Installation

```bash
npm install @bonniernews/bn-oidc-connector-express
```

## Quick Start

```typescript
import express from "express";
import { auth, isAuthenticated, isEntitled } from "@bonniernews/bn-oidc-connector-express";

const app = express();

// Apply OIDC middleware to parse headers from Fastly Compute
app.use(auth());

// Protected route requiring authentication
app.get("/profile", isAuthenticated, (req, res) => {
  res.json({
    user: req.oidc.user,
    claims: req.oidc.idTokenClaims
  });
});

// Protected route requiring specific entitlements
app.get("/premium-content", isEntitled(["premium", "subscriber"]), (req, res) => {
  res.json({ content: "Premium content here" });
});

// Handle authentication/authorization errors
app.use((err, req, res, next) => {
  if (err.name === "UnauthenticatedError") {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (err.name === "UnauthorizedError") {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  next(err);
});

app.listen(3000);
```

## API Reference

### `auth(options?)`

Main middleware function that sets up OIDC context and parses user headers from Fastly Compute.

**Parameters:**
- `options` (optional): Configuration object
  - `headers.user` (string, default: `"x-bnlogin-user"`): Name of the HTTP header containing user information

**Returns:** Express Router with OIDC middleware configured

**Example:**
```typescript
// Use default header name
app.use(auth());

// Use custom header name
app.use(auth({ headers: { user: "x-custom-user" } }));
```

### `isAuthenticated`

Middleware that requires the user to be authenticated. Throws `UnauthenticatedError` if the user is not logged in.

**Example:**
```typescript
app.get("/protected", isAuthenticated, (req, res) => {
  res.json({ message: "You are authenticated!" });
});
```

### `isEntitled(validEntitlements)`

Middleware factory that requires the user to have specific entitlements.

**Parameters:**
- `validEntitlements` (string[]): Array of entitlement strings. User needs at least one of these entitlements.

**Returns:** Express middleware function

**Throws:**
- `UnauthenticatedError` if user is not authenticated
- `UnauthorizedError` if user lacks required entitlements

**Example:**
```typescript
// Require any of the specified entitlements
app.get("/admin", isEntitled(["admin", "superuser"]), (req, res) => {
  res.json({ message: "Admin access granted" });
});

// Empty array allows all authenticated users
app.get("/members", isEntitled([]), (req, res) => {
  res.json({ message: "Members only" });
});
```

## Request Object Extension

The middleware extends the Express Request object with an `oidc` property:

```typescript
interface Request {
  oidc: {
    isAuthenticated: boolean;
    user?: {
      id: string;
      email?: string;
    };
    idTokenClaims?: Record<string, any>;
    isEntitled: (validEntitlements: string[]) => boolean;
  };
}
```

### Properties

- **`isAuthenticated`**: Boolean indicating if the user is authenticated
- **`user`**: User object containing basic user information
  - `id`: User's unique identifier (from `sub` claim)
  - `email`: User's email address (if available)
- **`idTokenClaims`**: Raw JWT claims from the ID token
- **`isEntitled(validEntitlements)`**: Function to check if user has required entitlements

### Example Usage

```typescript
app.get("/api/user", (req, res) => {
  if (!req.oidc.isAuthenticated) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  // Check entitlements programmatically
  if (req.oidc.isEntitled(["premium"])) {
    // User has premium access
    return res.json({
      user: req.oidc.user,
      isPremium: true,
      allClaims: req.oidc.idTokenClaims
    });
  }

  res.json({
    user: req.oidc.user,
    isPremium: false
  });
});
```

## Error Handling

The library provides specific error types for different authentication/authorization scenarios:

```typescript
import {
  UnauthenticatedError,
  UnauthorizedError
} from "@bonniernews/bn-oidc-connector-express";

app.use((err, req, res, next) => {
  if (err instanceof UnauthenticatedError) {
    return res.status(401).json({
      error: "Authentication required",
      message: err.message
    });
  }

  if (err instanceof UnauthorizedError) {
    return res.status(403).json({
      error: "Insufficient permissions",
      message: err.message
    });
  }

  // Handle other errors
  next(err);
});
```

### Error Types

- **`UnauthenticatedError`**: User is not logged in
- **`UnauthorizedError`**: User is authenticated but lacks required permissions
- **`OidcError`**: Base error class for OIDC-related errors

## How It Works

1. **Fastly Compute OIDC Service**: Handles the complete OIDC flow (authorization, token exchange, validation)
2. **Header Transmission**: Fastly sets the `x-bnlogin-user` header with JWT claims as JSON
3. **Middleware Processing**: This library parses the header and creates the OIDC context
4. **Request Enhancement**: Each request gets an `oidc` object with user information and helper methods

## TypeScript Support

The library is written in TypeScript and includes full type definitions. The Express Request interface is automatically extended when you import the library.

```typescript
import { Request } from "express";

// The oidc property is automatically available and typed
function handleRequest(req: Request) {
  // TypeScript knows about req.oidc
  if (req.oidc.isAuthenticated) {
    console.log(`User ID: ${req.oidc.user?.id}`);
  }
}
```

## Configuration

### Custom Header Names

If your Fastly Compute service uses different header names, you can configure them:

```typescript
app.use(auth({
  headers: {
    user: "x-custom-user-header"
  }
}));
```

## Examples

### Basic Authentication Check

```typescript
app.get("/dashboard", isAuthenticated, (req, res) => {
  res.render("dashboard", {
    user: req.oidc.user,
    userClaims: req.oidc.idTokenClaims
  });
});
```

### Role-Based Access Control

```typescript
// Admin-only route
app.get("/admin", isEntitled(["admin"]), (req, res) => {
  res.json({ message: "Admin dashboard" });
});

// Multiple role options
app.get("/content", isEntitled(["editor", "admin", "content-manager"]), (req, res) => {
  res.json({ message: "Content management" });
});
```

### Conditional Logic

```typescript
app.get("/article/:id", (req, res) => {
  const article = getArticle(req.params.id);

  // Public article
  if (!article.isPremium) {
    return res.json(article);
  }

  // Premium article - check authentication and entitlements
  if (!req.oidc.isAuthenticated) {
    return res.status(401).json({ error: "Login required for premium content" });
  }

  if (!req.oidc.isEntitled(["premium", "subscriber"])) {
    return res.status(403).json({ error: "Premium subscription required" });
  }

  res.json(article);
});
```

### Programmatic Entitlement Checking

```typescript
app.get("/features", (req, res) => {
  const features = {
    basicFeatures: true,
    premiumFeatures: req.oidc.isEntitled(["premium"]),
    adminFeatures: req.oidc.isEntitled(["admin"]),
    betaFeatures: req.oidc.isEntitled(["beta-tester"])
  };

  res.json(features);
});
```
