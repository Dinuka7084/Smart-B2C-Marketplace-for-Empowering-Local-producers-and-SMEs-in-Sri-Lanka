# Architecture Decision Log

## Confirmed

- **Product:** a smart B2C multi-vendor marketplace for Sri Lankan local producers and SMEs.
- **Roles:** customer, vendor, and administrator.
- **Database:** Neon PostgreSQL is the authoritative application database.
- **Currency and locale baseline:** LKR and English-first; localization can be added later.
- **Order structure:** one customer checkout may create multiple vendor-specific fulfillment orders.
- **Delivery approach:** build and verify complete vertical slices in milestone order.
- **Product name:** Smart Lanka.
- **Repository structure:** one Git repository containing fully independent `frontend` and `backend` Node.js projects. Each has its own manifest, lockfile, dependencies, and commands; the repository root is not an npm project.
- **Backend framework:** Express.js 5 with TypeScript.
- **Frontend framework:** Vite with React 19 and TypeScript.
- **Checkout:** simulated academic checkout for the initial release.
- **Product images:** Cloudinary.
- **AI provider:** Groq; the key remains in the backend environment only.

## Proposed defaults pending confirmation

- Initial deployment uses the project-compatible hosted runtime unless another host is required.

## Deferred deliberately

- Demand forecasting and dynamic pricing require enough historical order data to produce defensible outputs.
- Automated vendor ranking will not be activated until ranking factors and weights are agreed and visible to administrators.
- Refund, cancellation, commission, delivery-fee, and tax rules will be finalized with the checkout milestone.
