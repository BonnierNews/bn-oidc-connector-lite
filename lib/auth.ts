import {
  Router as createRouter,
  type Router,
} from "express";

import type { AuthOptions } from "./types";
import { oidcContext, idToken } from "./middleware";

/**
 * Express middleware to be used to handle headers set by Bonnier News Fastly Compute
 * OIDC integration. This middleware will parse the `x-bnlogin-user` header and attach
 * the decoded claims to the request object.
 */
function auth(options?: AuthOptions): Router {
  const userHeader = options?.headers?.user ?? "x-bnlogin-user";
  const router = createRouter();

  router.use(oidcContext);
  router.use(idToken(userHeader));

  return router;
}

export { auth };
