# Customer recommendations API

`GET /api/v1/recommendations` requires an authenticated customer session and returns up to eight currently purchasable products.

## Eligibility

A recommended product must be published, in stock, assigned to an active category, and owned by an approved vendor. The endpoint never recommends hidden, archived, draft, or unavailable products.

## Ranking strategy

The response identifies the strategy as `category-affinity-popularity-recency-v1`. Its deterministic score uses:

- category affinity from wishlist items;
- stronger category affinity from previous non-cancelled purchases;
- product units in delivered orders during the previous 90 days; and
- a small boost for products published during the previous 14 days.

Personal category affinity has the greatest weight. Popularity and recency provide a cold-start fallback for customers without wishlist or order history.

Each product includes a `reason` explaining the strongest applicable signal. Recommendations do not use Groq and do not silently change wishlist, cart, or order data. If this secondary request fails, the regular searchable catalog remains usable.
