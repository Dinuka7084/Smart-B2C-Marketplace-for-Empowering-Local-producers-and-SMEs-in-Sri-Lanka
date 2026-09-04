# Vendor insights API

These routes use the `/api/v1/vendor` prefix and require an authenticated, approved vendor. Results are always restricted to the requesting vendor's records.

## Sales analytics

`GET /analytics` returns a rolling 30-day view with:

- delivered revenue, delivered-order count, average order value, and units sold;
- one daily revenue and order-count point for every day, including zero-sale days;
- current counts for every order status; and
- the five products with the highest delivered revenue during the period.

Revenue is recognized only when a vendor order is marked `delivered`. Values use integer cents and the `LKR` currency code. This makes the analytics reconcile with immutable order-item and vendor-order records.

## Groq product-description draft

`POST /ai/product-description`

Example body:

```json
{
  "productName": "Ceylon Cinnamon Sticks",
  "categoryName": "Spices",
  "keyFeatures": "Hand-selected in Matale and packed in a reusable pouch.",
  "tone": "traditional"
}
```

Supported tones are `warm`, `professional`, and `traditional`. `keyFeatures` must contain 10–1,000 characters. An optional `audience` can contain 3–200 characters.

The endpoint returns an editable description and the model identifier. It does not save or publish the draft. Product creation remains a separate, explicit vendor action.

## Configuration and failure behavior

Set these values in `backend/.env`:

```dotenv
GROQ_API_KEY="your-groq-api-key"
GROQ_MODEL="llama-3.1-8b-instant"
```

The API key is used only by Express and is never returned to the browser. Missing configuration returns `503`; upstream timeouts, rate limits, invalid model responses, and Groq service failures return explicit errors. The frontend preserves the normal editable description field as the non-AI fallback.
