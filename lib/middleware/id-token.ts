import type { Request, Response, NextFunction } from "express";

import type { OidcRequestContext } from "../types";

function idToken(userHeader: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.headers[userHeader]) {
      next();

      return;
    }

    const decodedClaims = JSON.parse(req.headers[userHeader] as string);

    req.oidc.idTokenClaims = decodedClaims;
    req.oidc.isAuthenticated = true;

    attachUserToContext(req, decodedClaims);

    next();
  };
}

function attachUserToContext(req: Request, decodedClaims: Record<string, any>) {
  const user: OidcRequestContext["user"] = {
    id: decodedClaims.sub,
    ...(decodedClaims.email && { email: decodedClaims.email }),
  };

  req.oidc.user = user;
}

export { idToken };
