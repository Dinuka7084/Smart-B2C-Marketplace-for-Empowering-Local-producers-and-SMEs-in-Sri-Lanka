import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;

const deriveKey = (password: string, salt: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      {
        cost: COST,
        blockSize: BLOCK_SIZE,
        parallelization: PARALLELIZATION,
        maxmem: 64 * 1024 * 1024,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      },
    );
  });

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const derivedKey = await deriveKey(password, salt);

  return [
    'scrypt',
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$');
};

export const verifyPassword = async (
  password: string,
  encodedHash: string,
): Promise<boolean> => {
  const [algorithm, cost, blockSize, parallelization, saltText, hashText] =
    encodedHash.split('$');

  if (
    algorithm !== 'scrypt' ||
    Number(cost) !== COST ||
    Number(blockSize) !== BLOCK_SIZE ||
    Number(parallelization) !== PARALLELIZATION ||
    !saltText ||
    !hashText
  ) {
    return false;
  }

  try {
    const storedKey = Buffer.from(hashText, 'base64url');
    const derivedKey = await deriveKey(
      password,
      Buffer.from(saltText, 'base64url'),
    );

    return (
      storedKey.length === derivedKey.length &&
      timingSafeEqual(storedKey, derivedKey)
    );
  } catch {
    return false;
  }
};
