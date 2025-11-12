type AuthOptions = {
  headers?: {
    user?: string;
  };
};

type OidcRequestContext = {
  idTokenClaims?: Record<string, any>;
  isAuthenticated: boolean;
  isEntitled: (validEntitlements: string[]) => boolean;
  user?: Record<string, string | number | boolean>;
};

declare module "express-serve-static-core" {
  interface Request {
    oidc: OidcRequestContext;
  }
}

export type {
  AuthOptions,
  OidcRequestContext,
};
