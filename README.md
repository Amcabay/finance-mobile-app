# 🌌 Finance Flow Mobile

Welcome to **Finance Flow Mobile**, a premium, state-of-the-art finance tracker application designed for seamless personal finance management. Built with **React Native (Expo SDK 54)**, **Expo Router**, and backed by **Supabase** and **Expo SQLite**, this application delivers an ultra-smooth, secure, and offline-first mobile experience with a breathtaking modern dark aesthetic.

---

## ✨ Key Architectural Features

### 1. 🔐 Authentication Flow (Premium Deep Dark & Atmospheric Glow)
Our authentication subsystem (`login`, `register`, and `forgot-password`) is meticulously designed to create an immersive visual experience from the first interaction:
* **Premium Theme & Glow:** Implements a premium, custom **Deep Dark Theme** enhanced with sophisticated local asset-based **atmospheric glows**, smooth radial gradients, and elegant micro-animations for high-fidelity interactive fields.
* **Hybrid 8-Digit OTP Password Recovery:** Features a highly flexible **Hybrid OTP (One-Time Password)** system powered by Supabase. This dual-channel recovery flow is optimized for:
  * 📱 **Mobile Ecosystem:** Intuitive 8-digit token input fields with automatic focus-forwarding and ergonomic numeric pad integration.
  * 🌐 **Web Ecosystem:** Standardized secure confirmation links that seamlessly route back to the platform.
* **Secure Session Management:** Native session tokens are persisted securely using `ExpoSecureStoreAdapter` integrated into the core `supabase.ts` module to prevent exposure.

### 2. ⚡ Offline-First Database Layer (Local-First Engine)
To guarantee lightning-fast data mutations and uninterrupted access under weak or non-existent network conditions, the app leverages an advanced offline-first architecture:
* **Expo SQLite Engine:** Utilizing the modern `expo-sqlite` API, the application creates a highly reliable local-first persistence layer (`finance_flow.db`). All records are stored and queried instantly.
* **Modular Repository Architecture:** Clean separation of concerns is strictly enforced. Features such as **Bills** (`features/bills`) and **Budgets** (`features/budgets`) are decoupled through dedicated abstraction layers:
  * `BillRepository` & `BudgetRepository` serve as clean interfaces to isolate the business use-cases from the persistence engines.
  * Easy switching between local SQLite databases and remote Cloud Supabase syncing mechanisms.
* **Background Sync Foundation:** Every transaction, bill, or budget record in the SQLite tables includes a critical `sync_status` column (`pending` | `synced`). This column tracks local mutations and serves as the deterministic state engine for future automatic background synchronization routines to Supabase Cloud.

### 3. 🛡️ User Privacy & Data Masking Offset Layer
Security is baked into the core database architecture rather than being treated as an afterthought:
* **Masking Offset Aware (`getOffset`):** To enforce absolute data privacy and protect against potential cloud database leaks, a unique numerical masking offset algorithm is implemented. Before any financial nominal amounts are sent to Supabase:
  * The repository applies a deterministic user-specific offset (`getOffset(userId)`) to scramble the financial values.
  * Upon retrieval, the data is instantly unmasked by reverting the offset through the repository layer (`SupabaseTransactionRepository`, `SupabaseBudgetRepository`, `SupabaseBillRepository`) before reaching the UI.
  * *No raw transaction numbers ever live unmasked in the cloud storage.*
* **Row-Level Security (RLS) & Explicit Constraints:** All database mutations explicitly inject the active Supabase `user_id` constraint to strictly isolate tenant boundaries at the server level.

---

## 📂 Project Architecture

```bash
├── app/                      # Expo Router File-Based Routing
│   ├── (auth)/               # Authentication Pages (login, register, forgot-password)
│   ├── (tabs)/               # Bottom-Tab Navigation Main Screens
│   ├── _layout.tsx           # Global App Shell & Providers Setup
│   └── modal.tsx             # Interactive Settings/Details Modal
├── assets/                   # Static Visual Assets (Atmospheric Glows, Icons, Fonts)
├── components/               # Reusable Atomic UI Components (Buttons, Inputs, Cards)
├── core/                     # Core App Configuration & Shared Drivers
│   ├── database/             # expo-sqlite Database Initialization (sqlite.ts)
│   ├── entities/             # System-Wide TypeScript Domain Interfaces
│   └── formatters/           # Currency, Date, and Number Formatting Utilities
├── features/                 # Feature-Driven Modular Architecture
│   ├── bills/                # Bills & Subscriptions Module (Repository, Infrastructure, Use Cases)
│   ├── budgets/              # Budget Limit Tracker Module (Repository, Infrastructure)
│   └── transactions/         # Core Income/Expense Logging Engine
├── hooks/                    # Custom Global React Hooks (Theme, State, Security)
├── utils/                    # Utility Singletons & Adapters (supabase.ts + SecureStore)
```

---

## 🚀 Get Started

### 1. Install Dependencies
Ensure you have Node.js and the React Native development environment set up on your machine. Install the project dependencies by running:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file at the root of the project and populate it with your Supabase credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run the App Locally
Start the Expo development server:
```bash
npx expo start
```

In the Metro Bundler terminal output, you'll find various options to launch the app:
* Press **`a`** to open in the [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/).
* Press **`i`** to open in the [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/).
* Scan the QR code using the **Expo Go** app on your physical mobile device.
* Press **`w`** to view the app on web browsers.

---

## 📚 Learn More & Resources

For detailed guides and advanced implementation configurations, check out:
* 📘 [Expo Documentation](https://docs.expo.dev/) - Official fundamentals and advanced guides.
* 🎓 [Learn Expo Tutorial](https://docs.expo.dev/tutorial/introduction/) - Step-by-step universal app guides.
* 🚀 [Supabase JS Client SDK](https://supabase.com/docs/reference/javascript/introduction) - Remote backend and authentication reference.
* 💾 [Expo SQLite Reference](https://docs.expo.dev/versions/v54.0.0/sdk/sqlite/) - Version-specific Expo SQLite guidelines.

---

## 👥 Community & Support

Join the global community of developers crafting unified user experiences:
* **Expo GitHub:** [expo/expo](https://github.com/expo/expo)
* **Discord Community:** [chat.expo.dev](https://chat.expo.dev)

---
<p align="center">
  Crafted with ❤️ by the Finance Flow Engineering Team
</p>
