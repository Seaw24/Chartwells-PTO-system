import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const account = "836548369971";
const region = "us-east-2";
const bucket = `chartwells-pto-app-${account}`;
const distribution = "E28QGWFC6YNZD5";
const domain = "d2hxxrhfzq1k3r.cloudfront.net";
const instance = "i-0ab29bf3040dc6657";
const functionsRoot = "/opt/chartwells/chartwells-supabase/volumes/functions";
// Outside functionsRoot: every folder in there is served as a function.
const backupRoot = "/opt/chartwells/function-backups";
const onlyFunction = process.argv
  .find((arg) => arg.startsWith("--function="))
  ?.slice("--function=".length);
const functionNames = ["employee-access", "notify"].filter(
  (name) => !onlyFunction || name === onlyFunction,
);
if (onlyFunction && functionNames.length === 0) {
  throw new Error(`Unknown function: ${onlyFunction}`);
}
const dryRun = process.argv.includes("--dry-run");
const frontendOnly = process.argv.includes("--frontend-only");
const functionOnly = process.argv.includes("--function-only");
if (frontendOnly && functionOnly) {
  throw new Error("Choose either --frontend-only or --function-only.");
}
const deployFrontend = !functionOnly;
const deployFunction = !frontendOnly;

function run(program, args) {
  return execFileSync(program, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    env: { ...process.env, AWS_PAGER: "", AWS_DEFAULT_REGION: region },
  }).trim();
}

function aws(...args) {
  return run("aws", args);
}

function envValue(name) {
  const line = readFileSync(resolve(".env.local"), "utf8")
    .split(/\r?\n/)
    .find((item) => item.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim();
}

function waitForCommand(commandId) {
  for (let attempt = 0; attempt < 60; attempt++) {
    let invocation;
    try {
      invocation = JSON.parse(
        aws(
          "ssm", "get-command-invocation",
          "--command-id", commandId,
          "--instance-id", instance,
          "--output", "json",
        ),
      );
    } catch {
      // SSM can take a moment to register the invocation.
    }
    if (invocation && !["Pending", "InProgress", "Delayed"].includes(invocation.Status)) {
      if (invocation.Status !== "Success") {
        throw new Error(`Function deployment failed: ${invocation.StandardErrorContent || invocation.StandardOutputContent}`);
      }
      return invocation.StandardOutputContent?.trim();
    }
    run("sleep", ["2"]);
  }
  throw new Error("Timed out waiting for the Edge Function deployment.");
}

function ssm(commands) {
  const commandId = aws(
    "ssm", "send-command",
    "--instance-ids", instance,
    "--document-name", "AWS-RunShellScript",
    "--parameters", JSON.stringify({ commands }),
    "--query", "Command.CommandId",
    "--output", "text",
  );
  return waitForCommand(commandId);
}

const signedInAccount = aws("sts", "get-caller-identity", "--query", "Account", "--output", "text");
if (signedInAccount !== account) {
  throw new Error(`AWS is signed in to ${signedInAccount}; expected ${account}.`);
}
const origin = aws(
  "cloudfront", "get-distribution-config", "--id", distribution,
  "--query", "DistributionConfig.DefaultCacheBehavior.TargetOriginId", "--output", "text",
);
if (origin !== "s3-spa") throw new Error(`Unexpected CloudFront origin: ${origin}`);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
console.log(`AWS account ${account}; ${dryRun ? "checking" : "deploying"} ${deployFunction && deployFrontend ? "function and frontend" : deployFunction ? "function" : "frontend"}.`);

if (deployFrontend) {
  const url = envValue("VITE_SUPABASE_URL");
  const key = envValue("VITE_SUPABASE_ANON_KEY");
  if (!url || new URL(url).hostname !== domain || !key || key.includes("fixture")) {
    throw new Error(".env.local must point at the live CloudFront Supabase endpoint with its public anon key.");
  }
  run(process.execPath, ["scripts/check-source.mjs"]);
  run(process.execPath, ["scripts/run-vite.mjs"]);
  console.log("Source check and production build passed.");
}

if (dryRun) {
  console.log("Dry run complete. No AWS resources were changed.");
  process.exit(0);
}

if (deployFunction) {
  for (const name of functionNames) {
    const dir = resolve("supabase/functions", name);
    const target = `${functionsRoot}/${name}`;
    const backup = `${backupRoot}/${stamp}/${name}`;
    const staging = `${backupRoot}/${stamp}/${name}.next`;
    ssm(["set -eu", `mkdir -p '${staging}'`]);
    // One command per file keeps each SSM call well under its parameter size limit.
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts")).sort()) {
      const source = readFileSync(resolve(dir, file));
      const sha = createHash("sha256").update(source).digest("hex");
      ssm([
        "set -eu",
        `printf '%s' '${source.toString("base64")}' | base64 -d > '${staging}/${file}'`,
        `echo '${sha}  ${staging}/${file}' | sha256sum -c - >/dev/null`,
      ]);
    }
    ssm([
      "set -eu",
      `chmod 755 '${staging}'`,
      `chmod 644 '${staging}'/*`,
      // Move the old folder aside, then the new one in; if that second move fails, put the old
      // folder straight back so the function is never left missing.
      `if [ -e '${target}' ]; then mv '${target}' '${backup}'; fi; if ! mv '${staging}' '${target}'; then [ -e '${backup}' ] && mv '${backup}' '${target}'; exit 1; fi`,
    ]);
    console.log(`Edge Function ${name} deployed. Server backup: ${backup}`);
  }
  ssm(["set -eu", "docker restart supabase-edge-functions >/dev/null"]);
  console.log("Edge Functions restarted.");
}

if (deployFrontend) {
  const backupKey = `deploy-backups/${stamp}/index.html`;
  aws("s3api", "copy-object", "--bucket", bucket, "--copy-source", `${bucket}/index.html`, "--key", backupKey);
  aws("s3", "sync", "dist/assets/", `s3://${bucket}/assets/`,
    "--cache-control", "public,max-age=31536000,immutable");
  aws("s3", "cp", "dist/favicon.svg", `s3://${bucket}/favicon.svg`,
    "--content-type", "image/svg+xml", "--cache-control", "public,max-age=86400");
  aws("s3", "cp", "dist/index.html", `s3://${bucket}/index.html`,
    "--content-type", "text/html", "--cache-control", "no-cache");
  const invalidation = aws(
    "cloudfront", "create-invalidation", "--distribution-id", distribution,
    "--paths", "/", "/index.html", "/favicon.svg",
    "--query", "Invalidation.Id", "--output", "text",
  );
  console.log(`Frontend deployed. Index backup: s3://${bucket}/${backupKey}`);
  console.log(`CloudFront invalidation: ${invalidation}`);
}
