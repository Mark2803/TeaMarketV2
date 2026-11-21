import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import { ALLOWED_ORIGINS } from "./config/http.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { moderatorCsrfProtection, moderatorCsrfToken } from "./middleware/moderator-csrf.js";
import indexingPolicyRouter from "./modules/seo/indexing-policy.routes.js";
import seoHtmlRouter from "./modules/seo/seo-html.routes.js";
import apiRouter from "./routes/index.js";

const app = express();

app.disable("x-powered-by");

// Trust forwarded client addresses only when the immediate proxy is local.
// Production Nginx must connect from loopback and overwrite X-Forwarded-For.
app.set("trust proxy", "loopback");

app.use(helmet());

app.use(
  cors({
    origin: [...ALLOWED_ORIGINS],
    credentials: true
  })
);

app.use(compression());
app.use(express.json());
app.use(pinoHttp());

// Apply CSRF checks before any moderator route, including nested delivery routes.
app.get("/api/moderator/csrf", moderatorCsrfToken);
app.use("/api/moderator", moderatorCsrfProtection);

app.use("/api/seo", indexingPolicyRouter);
app.use("/api/seo", seoHtmlRouter);
app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
