import path from "path";
import dotenv from "dotenv";

const envFile = process.env.ENV_FILE || ".env";
const envPath = path.resolve(process.cwd(), envFile);

dotenv.config({ path: envPath });
