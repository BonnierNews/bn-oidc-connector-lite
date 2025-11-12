import express from "express";

import { auth } from "../../index";

const createApp = () => {
  const app = express();
  app.use(express.json());
  return app;
};

const createAppWithMiddleware = () => {
  const app = createApp();
  app.use(auth());
  return app;
};

export {
  createApp,
  createAppWithMiddleware,
};
