import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "pg",
  "stripe",
  "uuid",
  "xlsx",
  "zod",
  "zod-validation-error",
  "mammoth",
];

// Keep pdfkit external: it loads its packaged AFM font data relative to the
// module directory at runtime, which is lost when the module is bundled.

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  await viteBuild();

  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    banner: {
      js: [
        `const { createRequire: __bundled_createRequire } = require("module");`,
        `const __bundled_require = __bundled_createRequire(__filename);`,
        `const __import_meta_url = require("url").pathToFileURL(__filename).href;`,
      ].join("\n"),
    },
    define: {
      "process.env.NODE_ENV": '"production"',
      "import.meta.url": "__import_meta_url",
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
