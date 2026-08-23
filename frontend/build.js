const { execSync } = require("child_process");

if (process.env.VERCEL === "1" || process.env.OPEN_NEXT_BUILDING === "true") {
  console.log("--> Running Next.js build (next build --webpack)...");
  execSync("npx next build --webpack", { stdio: "inherit" });
} else {
  console.log("--> Running Cloudflare OpenNext build (opennextjs-cloudflare build)...");
  execSync("npx opennextjs-cloudflare build", {
    stdio: "inherit",
    env: { ...process.env, OPEN_NEXT_BUILDING: "true" },
  });
}
