# Finance Flow Mobile

An offline-first, highly secure personal asset and liability management application built for high-precision wealth tracking.

## Executive Summary

Finance Flow Mobile is a specialized mobile application designed to serve as a high-performance, offline-first personal asset and liability manager. The product's fundamental design philosophy is built upon three core pillars: exceptional visual scannability, an uncluttered minimalist interface, and absolute data privacy achieved through fully localized client-side ledger processing. By retaining all data operations on-device without external telemetry or dependency on centralized cloud storage, the application guarantees maximum confidentiality, sub-millisecond query performance, and operational continuity regardless of network availability.

## Core Functional Capabilities

The platform delivers comprehensive personal finance tracking through several integrated, specialized subsystems designed to maximize user utility and minimize entry friction:

*   **Multi-Wallet Ledger:** Enables consolidated balance tracking across diverse payment methodologies, including physical cash reserves and digital banking systems. The ledger automatically calculates active balances and global net-wealth deltas in real-time, providing immediate financial visibility.
*   **Dynamic Cash Flow Logging:** Streamlines transaction logging by employing contextual interface changes based on whether a transaction is classified as income or expenditure. This adaptive behavior dynamically populates category selections and controls, significantly reducing input latency and human input errors.
*   **Structured Debt Management:** Provides dedicated operational tracks for complex financial obligations. This includes automated monthly rollover calculations for recurring service subscriptions, alongside structured step-progress visualization for long-term amortized installment contracts.
*   **Ledger Safety Guards:** Implements robust database-level self-healing synchronization logic. In the event of a transaction purge, the system automatically runs corrective synchronization queries to recalibrate wallet ledgers, ensuring the complete elimination of orphaned or negative balance states.

## Architectural Foundation

The application is engineered on top of a highly reliable, industry-standard mobile development stack optimized for security, modularity, and predictable runtime behavior:

*   **Framework Core:** React Native and the Expo SDK framework, enabling platform-native performance, predictable rendering lifecycles, and a stable cross-platform code execution layer.
*   **Navigation Architecture:** Expo Router utilizes a file-system-based routing convention supporting structured Tab navigation, ensuring stable state management and clear separation of concerns across visual views.
*   **Storage Infrastructure:** SQLite database utilizing the expo-sqlite driver, delivering robust local data persistence with full ACID compliance to safeguard against data corruption during unexpected application terminations.

## Local Deployment Guide

To initialize the development environment and run the application locally, follow these standard technical onboarding procedures.

### System Prerequisites
Before initialization, ensure that the host machine satisfies the following environmental requirements:
*   **Node.js Runtime Environment:** Installed LTS release of the Node.js runtime.
*   **Package Manager:** A stable installation of the npm or yarn package manager.
*   **Expo Go Container:** The Expo Go application installed on a physical iOS or Android testing device, or a configured Android Emulator / iOS Simulator instance.

### Installation and Boot Procedures

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/Amcabay/finance-mobile-app.git
    cd finance-manager-mobile
    ```

2.  **Dependency Resolution**
    Initialize the package manager to download and link all required library assets to the node_modules directory:
    ```bash
    npm install
    ```

3.  **Metro Bundler Startup**
    Launch the native development server, explicitly executing cache clearance protocols to ensure state consistency:
    ```bash
    npx expo start -c
    ```

4.  **Client Connection**
    Scan the generated QR code using the camera utility on your physical iOS device or the Expo Go interface on your Android device to load the bundle. Alternatively, press the corresponding keyboard shortcuts in the terminal to deploy to your active emulator.
