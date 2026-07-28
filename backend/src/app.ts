import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import apiRouter from "./routes/index.js";

const app = express();

app.disable("x-powered-by");

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(pinoHttp());

app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;