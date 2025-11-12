import request from "supertest";
import type { Request, Response, NextFunction } from "express";

import { createAppWithMiddleware } from "../helpers/app-helper";
import { isEntitled } from "../../lib/middleware/is-entitled";
import { UnauthorizedError, UnauthenticatedError } from "../../lib/errors";

Feature("is-entitled middleware", () => {
  const app = createAppWithMiddleware();

  Scenario("Requesting locked article as logged in user", () => {
    const requiredEntitlements = [ "ent1" ];
    const requiredEntitlements2 = [ "ent2" ];

    Given("we have a locked article", () => {
      app.get("/locked-article", isEntitled(requiredEntitlements), (_, res) => {
        return res.send(true);
      });
      app.get("/locked-article2", isEntitled(requiredEntitlements2), (_, res) => {
        return res.send(true);
      });
    });

    And("we handle UnauthorizedError", () => {
      app.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
        if (err instanceof UnauthorizedError) {
          return res.sendStatus(401);
        }
        return next(err);
      });
    });

    let user: Record<string, any>;
    And("user is logged in", () => {
      user = {
        sub: "user-123",
        email: "test@test.test",
        ent: requiredEntitlements,
      };
    });

    let protectedResult: request.Response;
    When("requesting a locked article WITHOUT having the correct entitlement", async () => {
      protectedResult = await request(app)
        .get("/locked-article2")
        .set("x-bnlogin-user", JSON.stringify(user));
    });

    Then("we CANNOT read the article", () => {
      expect(protectedResult.status).to.eql(401);
    });

    When("requesting a locked article with the correct entitlement", async () => {
      protectedResult = await request(app)
        .get("/locked-article")
        .set("x-bnlogin-user", JSON.stringify(user));
    });

    Then("we CAN read the article", () => {
      expect(protectedResult.status).to.eql(200);
      expect(protectedResult.body).to.eql(true);
    });

  });

  Scenario("Unauthenticated users are rejected", () => {
    Given("we have a protected admin route using isEntitled", () => {
      app.get("/admin", isEntitled([ "admin" ]), (_, res) => {
        return res.json({ message: "Admin area" });
      });
    });

    And("we handle authentication and authorization errors", () => {
      app.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
        if (err instanceof UnauthenticatedError) {
          return res.status(401).json({ error: "Not authenticated" });
        }
        if (err instanceof UnauthorizedError) {
          return res.status(403).json({ error: "Not authorized" });
        }
        return next(err);
      });
    });

    let result: request.Response;
    When("an unauthenticated user tries to access the admin route", async () => {
      result = await request(app).get("/admin");
    });

    Then("they receive a 401 Unauthenticated error", () => {
      expect(result.status).to.eql(401);
      expect(result.body.error).to.eql("Not authenticated");
    });
  });
});
