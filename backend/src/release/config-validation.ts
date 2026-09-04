export type ReleaseConfig = {
  databaseUrl?: string | undefined;
  sessionSecret?: string | undefined;
  frontendUrl: string;
  groqApiKey?: string | undefined;
  cloudinaryCloudName?: string | undefined;
  cloudinaryApiKey?: string | undefined;
  cloudinaryApiSecret?: string | undefined;
};

export const validateReleaseConfig = (
  config: ReleaseConfig,
  production: boolean,
): { errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!config.databaseUrl) errors.push('DATABASE_URL is required.');
  if (!config.sessionSecret) errors.push('SESSION_SECRET is required.');
  else if (config.sessionSecret.toLowerCase().includes('replace-with')) errors.push('SESSION_SECRET still uses the example placeholder.');

  const frontend = new URL(config.frontendUrl);
  if (production && frontend.protocol !== 'https:') errors.push('FRONTEND_URL must use HTTPS in production.');

  const cloudinaryValues = [config.cloudinaryCloudName, config.cloudinaryApiKey, config.cloudinaryApiSecret];
  const cloudinaryCount = cloudinaryValues.filter(Boolean).length;
  if (cloudinaryCount > 0 && cloudinaryCount < cloudinaryValues.length) errors.push('Configure all three CLOUDINARY values or leave all three empty.');
  if (cloudinaryCount === 0) warnings.push('Cloudinary is disabled; local upload storage is used for product images.');
  if (!config.groqApiKey) warnings.push('Groq is disabled; vendors must write descriptions manually.');
  return { errors, warnings };
};
