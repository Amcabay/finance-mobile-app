# Finance Flow (Android Production Version)

A minimalist mobile interface engineered to eliminate daily financial anxiety by converting complex monthly budgets into clear, action-oriented daily spending boundaries.

## Project Status: Production Ready v1.0.1
The core mobile application architecture and design system are fully implemented. Stable Android binary assets (.apk) are available under the Releases pipeline.

## Main Features Included
- Overview Dashboard: Calculates your dynamic "Today's Limit" to separate fluid discretionary spending from long-term liabilities.
- Spends Ledger: High-speed transaction logging utilizing an immediate currency formatting system.
- Schedules Calendar: A unified visual timeline tracking upcoming recurring payment windows to prevent cashflow surprises.
- Bills Tracker: Dedicated allocation container to securely lock fixed liabilities and track multi-month installment progression.

## Local Development Setup
1. Clone the repository to your local directory.
2. Run `npm install` or `yarn install` to synchronize core dependencies.
3. Execute `npx expo prebuild --platform android` to generate native wrapper files.
4. Run `npx expo start` to initialize the Bundler interface.

## Next Evolution Roadmap
- Receipt AI Scanner: Instant price and category extraction from receipt images without manual entry.
- Multi-Wallet Bucket: Granular daily spending limits isolation across physical cash, e-wallets, or bank accounts.
- Spending Velocity Analytics: Interactive line charts tracking real-time daily consumption pace.
