import assert from 'node:assert/strict';
import test from 'node:test';

import { createCloudinarySignature } from './signature.ts';

test('Cloudinary signatures sort parameters and append the secret', () => {
  assert.equal(
    createCloudinarySignature(
      {
        timestamp: 1_315_060_510,
        eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop',
        public_id: 'sample_image',
      },
      'abcd',
    ),
    'bfd09f95f331f558cbd1320e67aa8d488770583e',
  );
});
