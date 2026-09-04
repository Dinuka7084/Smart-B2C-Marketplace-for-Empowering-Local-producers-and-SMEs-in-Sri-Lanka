import assert from 'node:assert/strict';
import test from 'node:test';

import { explainRecommendation } from './strategy.ts';

test('recommendation explanations prefer personal category affinity', () => {
  assert.equal(explainRecommendation({ categoryAffinity: 3, recentUnitsSold: 10, publishedRecently: true }, 'Home & craft'), 'Based on your interest in Home & craft');
});

test('recommendation explanations provide popularity and recency fallbacks', () => {
  assert.equal(explainRecommendation({ categoryAffinity: 0, recentUnitsSold: 4, publishedRecently: true }, 'Wellness'), 'Popular with Smart Lanka customers');
  assert.equal(explainRecommendation({ categoryAffinity: 0, recentUnitsSold: 0, publishedRecently: true }, 'Wellness'), 'A recent addition from a local seller');
});
