import request from "supertest";
import type { Request, Response, NextFunction } from "express";

import { createAppWithMiddleware } from "../helpers/app-helper";
import { isAuthenticated } from "../../lib/middleware/is-authenticated";
import { UnauthenticatedError } from "../../lib/errors";

Feature("is-authenticated middleware", () => {
  const app = createAppWithMiddleware();

  Scenario("Requesting protected resource", () => {
    Given("we have a protected resource", () => {
      app.get("/protected-resource", isAuthenticated, (_, res) => {
        return res.send(true);
      });
    });

    And("we handle UnauthenticatedError", () => {
      app.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
        if (err instanceof UnauthenticatedError) {
          return res.sendStatus(401);
        }
        return next(err);
      });
    });

    let protectedResult: request.Response;
    When("requesting a protected resource without being logged in", async () => {
      protectedResult = await request(app).get("/protected-resource");
    });

    Then("we CANNOT read the resource", () => {
      expect(protectedResult.status).to.eql(401);
    });

    When("requesting a protected resource as a logged in user", async () => {
      protectedResult = await request(app)
        .get("/protected-resource")
        .set("x-bnlogin-user", JSON.stringify({
          sub: "user-123",
          email: "test@test.test",
          ent: [],
        }));
    });

    Then("we CAN read the resource", () => {
      expect(protectedResult.status).to.eql(200);
    });
  });
});
