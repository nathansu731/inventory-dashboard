#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const args = process.argv.slice(2);
const envFiles = [];
const optionalFiles = [];
let label = "";

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--optional") {
    optionalFiles.push(args[i + 1] || "");
    i += 1;
    continue;
  }
  if (arg === "--label") {
    label = args[i + 1] || "";
    i += 1;
    continue;
  }
  envFiles.push(arg);
}

const parseEnvValue = (rawValue) => {
  const value = rawValue.trim();
  if (!value) return "";
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }
  return value;
};

const loadEnvFile = (filePath, { optional }) => {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    if (optional) return;
    throw new Error(`Missing env file: ${resolved}`);
  }

  const content = fs.readFileSync(resolved, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1);
    if (!key) continue;
    process.env[key] = String(parseEnvValue(rawValue));
  }
};

try {
  for (const envFile of envFiles) {
    loadEnvFile(envFile, { optional: false });
  }
  for (const envFile of optionalFiles) {
    if (envFile) {
      loadEnvFile(envFile, { optional: true });
    }
  }
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}

const validatorScript = path.resolve(__dirname, "validate-production-config.js");
const validatorArgs = label ? ["--label", label] : [];
const result = spawnSync(process.execPath, [validatorScript, ...validatorArgs], {
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status || 0);
