const { execSync } = require("child_process");

if (process.env.VERCEL === "1" || process.env.NETLIFY === "true" || process.env.OPEN_NEXT_BUILDING === "true") {
  console.log("--> Running Next.js build (next build)...");
  execSync("npx next build", { stdio: "inherit" });
} else {
  console.log("--> Running Cloudflare OpenNext build (opennextjs-cloudflare build)...");
  execSync("npx opennextjs-cloudflare build", {
    stdio: "inherit",
    env: { ...process.env, OPEN_NEXT_BUILDING: "true" },
  });
}
