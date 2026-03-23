const { spawn } = require("child_process");
const path = require("path");
const dotenv = require("dotenv");

const [envFile, command, ...args] = process.argv.slice(2);

if (!envFile || !command) {
  console.error("Uso: node scripts/run-with-env.cjs <env-file> <command> [...args]");
  process.exit(1);
}

const envPath = path.resolve(process.cwd(), envFile);
const parsedEnv = dotenv.config({ path: envPath });

if (parsedEnv.error) {
  console.error(`Falha ao carregar ${envFile}:`, parsedEnv.error);
  process.exit(1);
}

const child = spawn(command, args, {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    ...parsedEnv.parsed,
    ENV_FILE: envFile,
  },
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(`Falha ao executar ${command}:`, error);
  process.exit(1);
});
