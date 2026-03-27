import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import path from "path";
import helmet from "helmet";
import sanitizeMiddleware from "./middlewares/sanitize.js";
import { notFoundHandler } from "./middlewares/notFoundHandler.js";
import compression from "compression";
import { startCronJobs } from "./crons/index.js";
import {
  configureServerTimeouts,
  registerServerLifecycle,
} from "./utils/serverConfig.js";

dotenv.config();
const app = express();
app.set("trust proxy", 1);

app.use(cors());
app.use(helmet());
app.use(compression({
    filter: (req, res) => {
        if (req.headers.accept && req.headers.accept.includes("text/event-stream")) {
            return false;
        }
        return compression.filter(req, res);
    },
}));
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
  limit: process.env.JSON_BODY_LIMIT ?? "20mb",
}));
app.use(sanitizeMiddleware);

app.use("/uploads", express.static(path.join(process.cwd(), "public/uploads")));

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  startCronJobs();
});

configureServerTimeouts(server);
registerServerLifecycle(server);