# Project Overview

This mobile-based personal finance management application is architected with a strict focus on local data synchronization precision, optimized component visualization, daily budget threshold tracking, and real-time billing cycle management. The application architecture prioritizes high performance and reliable offline-first capabilities by separating core business logic from storage infrastructure details. Through this approach, the application guarantees service availability independent of active network connectivity, while maintaining absolute data consistency via a highly structured local database schema.

# Technical Stack and Architecture

The application is built upon the following modern technology stack:
- **Framework Core**: React Native with Expo SDK (Managed Workflow). This choice streamlines cross-platform development while delivering native-like performance through modern JavaScript engines.
- **Routing System**: Expo Router utilizing a file-based routing approach. This declarative paradigm automates route mapping based on the physical directory structure, minimizing boilerplate code and simplifying navigation state management.
- **Language**: TypeScript with strict type-safety configuration. All modules are implemented with strict static typing to prevent runtime errors and facilitate long-term codebase refactoring.
- **Local Persistence**: SQLite via the expo-sqlite library for offline data query processing. Database transactions are executed locally to eliminate network latency and ensure the application remains fully functional without active internet connectivity.
- **Vector Graphics**: react-native-svg for custom mathematical coordinate-based financial chart rendering. Charts are computed dynamically on the client side to produce precise and responsive visualizations without external performance overhead.

# Core Modules and Technical Implementation

## 1. Dashboard Screen (app/(tabs)/index.tsx)

The dashboard acts as the central hub for aggregating the user's financial metrics with the following technical implementation details:
- **Data Aggregation Cycle**: Utilizes react-navigation `useFocusEffect` to trigger instant re-fetch queries of SQLite aggregation metrics (Income, Outcome, Wealth) whenever the screen regains focus. This prevents stale data by ensuring core metrics reflect the latest transaction states without reloading the entire application.
- **Dynamic Expense Distribution**: Renders charts using circle angle calculations based on real-time expense proportions for accurate Cost Analysis visualization. Mathematical vector computations are performed on-the-fly to produce precise visual representations of user expenditures categorized by classification.
- **Daily Budget Threshold Tracking**: Computes a dynamic progress bar evaluating accumulated current transactions against the maximum daily budget (daily cap). It provides a visual feedback mechanism via a contrasting component color transformation (#EF4444) upon detecting an over-budget status, supported by an integrated modal for direct budget limit mutations to the database.
- **Local Timezone Normalization**: Implements date string calculations using local timezone offsets to eliminate time synchronization discrepancies between global UTC and the device's local time. This step guarantees that daily transaction logs remain consistent across all physical time zones.

## 2. Transaction Management (app/(tabs)/spends.tsx)

Transaction management offers a highly granular interface for logging and analyzing expenditures:
- **Linear Interpolation Wave Chart**: Financial trend representation through interactive Y-coordinate calculations mapped linearly based on minimum and maximum transaction bounds, complete with Peak Value markers. The trend line is rendered procedurally to produce a smooth, informative curve.
- **Multi-Criteria Filtering Engine**: Real-time client-side transaction filtering based on text queries, specific categories, structured date ranges, and nominal value sorting options. The filtering engine is optimized to minimize mobile CPU utilization through efficient array manipulation.
- **Structural Data Parsing**: Transaction description storage scheme utilizing a string-split encapsulation method to segregate entity names and additional note details within a single database column. This design keeps the SQLite table schema compact while retaining rich data payload capabilities.

## 3. Task and Schedule Planner (app/(tabs)/schedule.tsx)

The schedule planner facilitates precise tracking of financial obligations and scheduled notes over time:
- **Calendar State Management**: Dynamic calendar navigation control directly bound to SQLite monthly query parameters to display relevant notes periodically. Month transitions instantly trigger SQLite query execution with a WHERE clause filter formatted as YYYY-MM.
- **Current Date Anchor**: Implements a static visual indicator with a distinct marker color on the date grid to facilitate easy identification of today (Today). Detection logic uses the device's local time to match day, month, and year values during calendar grid rendering.
- **Class-Based Note Categorization**: Categorizes notes into Urgent, Reminder, and Daily classes, featuring conditional form rendering that integrates the Native Date Picker component to secure due date input validity.

## 4. Billing Tracker (app/(tabs)/bills.tsx)

The billing tracker is designed to mitigate late payment risks through a proactive monitoring interface:
- **Conditional State Card**: An adaptive billing status review component that automatically transitions its color scheme to a sharp warning color and modifies the action button label to "Check now" upon detecting active bills exceeding their due date (overdue).
- **Focused Layout Mode**: Implements a toggle view on the "See all" functionality that restructures the interface hierarchy by hiding entry forms to focus the user's view on the Recent Bills list, without losing access to main navigation or the Floating Action Button (FAB).
- **Comprehensive Billing Matrix**: Complex data entry form parameters including billing type dropdowns, installment tenor input, monthly/annual billing cycle days, and date range boundaries (Start and End Date).
- **Contextual Data Mutation**: Supports data mutation operations (Edit and Delete) via rapid-access contextual option modals mapped directly to SQLite database query executions.

# Development Roadmap

- **Next Phase**: Integration of an OCR (Optical Character Recognition) module for automated bill/receipt photo scanning to populate entry parameters on the Bills form. This module is planned to run using a highly optimized local mobile-native engine to preserve the offline-first paradigm.
