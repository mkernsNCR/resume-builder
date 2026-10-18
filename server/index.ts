import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { env } from "./env";
import { errorHandler } from "./error-handler";
import { requireSameOrigin } from "./request-origin";
import { attachUser, sessionMiddleware } from "./auth";
import { registerAuthRoutes } from "./auth-routes";

const isTestEnv = env.NODE_ENV === "test";

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? Infinity : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: "RATE_LIMITED",
    message: "Too many requests, please try again later.",
  },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? Infinity : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: "RATE_LIMITED",
    message: "Too many upload requests, please try again later.",
  },
});

const app = express();
const httpServer = createServer(app);
app.disable("x-powered-by");
app.set("trust proxy", env.TRUST_PROXY_HOPS);
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "1mb" }));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:
          env.NODE_ENV === "production"
            ? ["'self'"]
            : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

app.use("/api", apiLimiter);
app.use("/api/upload", uploadLimiter);

app.use("/api", requireSameOrigin);
app.use(sessionMiddleware);
app.use(attachUser);

(async () => {
  registerAuthRoutes(app);
  await registerRoutes(httpServer, app);

  app.use("/api", (_req, res) => {
    res.status(404).json({ code: "NOT_FOUND", message: "API route not found" });
  });
  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = env.PORT;
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})().catch((error: unknown) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});
