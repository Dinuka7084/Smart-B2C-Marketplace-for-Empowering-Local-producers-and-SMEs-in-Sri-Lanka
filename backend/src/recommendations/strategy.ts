export type RecommendationSignals = {
  categoryAffinity: number;
  recentUnitsSold: number;
  publishedRecently: boolean;
};

export const recommendationStrategy = 'category-affinity-popularity-recency-v1';

export const explainRecommendation = ({
  categoryAffinity,
  recentUnitsSold,
  publishedRecently,
}: RecommendationSignals, categoryName: string): string => {
  if (categoryAffinity > 0) return `Based on your interest in ${categoryName}`;
  if (recentUnitsSold > 0) return 'Popular with Smart Lanka customers';
  if (publishedRecently) return 'A recent addition from a local seller';
  return 'Discover something from a local seller';
};
