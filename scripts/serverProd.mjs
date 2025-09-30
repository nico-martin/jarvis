#!/usr/bin/env node
import { spawn } from "child_process";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");

// Load environment variables
dotenv.config({ path: path.join(projectRoot, ".env") });

const PORT = process.env.PORT || 8844;
const SSL_KEY = process.env.SSL_KEY;
const SSL_CRT = process.env.SSL_CRT;

async function buildProject() {
  console.log("🔨 Building production version...");

  return new Promise((resolve, reject) => {
    const buildProcess = spawn("npm", ["run", "build"], {
      cwd: projectRoot,
      stdio: "inherit",
    });

    buildProcess.on("close", (code) => {
      if (code === 0) {
        console.log("✅ Build completed successfully");
        resolve();
      } else {
        console.error("❌ Build failed");
        reject(new Error(`Build process exited with code ${code}`));
      }
    });

    buildProcess.on("error", (error) => {
      console.error("❌ Build process error:", error);
      reject(error);
    });
  });
}

async function startServer() {
  console.log("🚀 Starting production server...");

  const app = express();

  // Serve static files from dist directory
  const distPath = path.join(projectRoot, "dist");
  app.use(express.static(distPath));

  // Handle SPA routing - serve index.html for all routes that don't match static files
  app.use((req, res, next) => {
    // Check if the request is for a file (has an extension)
    if (path.extname(req.path)) {
      // Let express.static handle file requests
      next();
    } else {
      // For all other routes, serve the index.html (SPA routing)
      res.sendFile(path.join(distPath, "index.html"));
    }
  });

  // Check if SSL certificates exist
  if (!SSL_KEY || !SSL_CRT) {
    console.error("❌ SSL_KEY and SSL_CRT environment variables are required");
    process.exit(1);
  }

  if (!fs.existsSync(SSL_KEY)) {
    console.error(`❌ SSL key file not found: ${SSL_KEY}`);
    process.exit(1);
  }

  if (!fs.existsSync(SSL_CRT)) {
    console.error(`❌ SSL certificate file not found: ${SSL_CRT}`);
    process.exit(1);
  }

  // Create HTTPS server
  const options = {
    key: fs.readFileSync(SSL_KEY),
    cert: fs.readFileSync(SSL_CRT),
  };

  const server = https.createServer(options, app);

  server.listen(PORT, () => {
    console.log(`✅ Production server running at https://localhost:${PORT}/`);
    console.log("Press Ctrl+C to stop the server");
  });

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n👋 Shutting down server...");
    server.close(() => {
      console.log("✅ Server stopped");
      process.exit(0);
    });
  });
}

async function main() {
  try {
    await buildProject();
    await startServer();
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();
