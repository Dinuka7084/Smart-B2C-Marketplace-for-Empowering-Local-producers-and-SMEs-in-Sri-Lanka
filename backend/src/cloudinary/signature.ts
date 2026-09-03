import { createHash } from 'node:crypto';

export const createCloudinarySignature = (
  parameters: Record<string, string | number>,
  apiSecret: string,
): string => {
  const payload = Object.entries(parameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex');
};
