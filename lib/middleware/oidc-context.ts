import type { NextFunction, Request, Response } from "express";

import { isUserEntitled } from "../utils/claims";

function oidcContext(req: Request, _res: Response, next: NextFunction) {
  req.oidc = {
    isAuthenticated: false,
    isEntitled: (validEntitlements) => isUserEntitled(req, validEntitlements),
  };

  next();
}

export { oidcContext };
