import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import dotenv from "dotenv";
import fs from "fs";
import { defineConfig } from "vite";
import htmlPlugin from "vite-plugin-html-config";
import tsconfigPaths from "vite-tsconfig-paths";

dotenv.config();

const TITLE = "Jarvis - your private, personal assistant";

export default defineConfig({
  worker: {
    format: "es",
  },
  server: {
    ...(fs.existsSync(process.env.SSL_KEY || "") &&
    fs.existsSync(process.env.SSL_CRT || "")
      ? {
          https: {
            key: fs.readFileSync(process.env.SSL_KEY || ""),
            cert: fs.readFileSync(process.env.SSL_CRT || ""),
          },
        }
      : {}),
    port: process.env.PORT ? parseInt(process.env.PORT) : 8080,
  },
  plugins: [
    preact(),
    tsconfigPaths(),
    tailwindcss(),
    htmlPlugin({
      title: TITLE,
    }),
  ],
});
