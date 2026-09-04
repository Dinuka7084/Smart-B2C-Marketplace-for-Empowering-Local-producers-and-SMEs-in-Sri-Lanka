import { env } from '../config/env.ts';
import { validateReleaseConfig } from './config-validation.ts';

const production = process.argv.includes('--production');
const result = validateReleaseConfig({
  databaseUrl: env.DATABASE_URL,
  sessionSecret: env.SESSION_SECRET,
  frontendUrl: env.FRONTEND_URL,
  groqApiKey: env.GROQ_API_KEY,
  cloudinaryCloudName: env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: env.CLOUDINARY_API_SECRET,
}, production);

for (const warning of result.warnings) console.warn(`WARNING: ${warning}`);
if (result.errors.length) {
  for (const error of result.errors) console.error(`ERROR: ${error}`);
  process.exitCode = 1;
} else {
  console.log(`${production ? 'Production' : 'Local'} environment validation passed.`);
}
