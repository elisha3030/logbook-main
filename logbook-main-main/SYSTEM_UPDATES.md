# Logbook System - System Updates (v2.2)

This document summarizes the major improvements and architectural changes made to the system to ensure cross-device consistency and reliability.

## 1. UI & Navigation Overhaul
*   **Dedicated Settings Page:** Moved "System Settings" from the dashboard sidebar to its own full-width page (`settings.html`).
*   **Streamlined Access:** Added a "Settings" button to the portal header and a "Back to Portal" button for a distraction-free configuration experience.
*   **Refined Student Portal:** Cleaned up the "Visit In-Charge" selection screen to ensure a professional and focused student experience.

## 2. Permanent Faculty Hubs (Hybrid Hard-coding)
*   **The Problem:** Dynamic faculty added on one device wouldn't appear on others if the local database was fresh.
*   **The Solution:** Hard-coded the core Engineering team directly into the backend (`server.js`) so they appear on **every device** automatically without any setup.
*   **Preserved Flexibility:** You can still add *extra* staff via the settings menu; the system will intelligently merge your hard-coded team with your manual additions.
    *   **Core Team:** Mr. Alvin Destajo, Dr. Mariciel Teogangco, Ms. Arlene Evangelista.

## 3. Cloud Settings Sync (Portable Configuration)
*   **Cross-Device Persistence:** Your system settings (Office Name, Activities, etc.) are now synced to Firebase Firestore.
*   **Automatic Setup:** When you launch the app on a new device, it will automatically pull your existing configuration from the cloud.
*   **Authoritative Cloud Logic:** If you change a setting on one computer, it will "magically" update on your other devices within minutes.

## 4. Architectural Improvements
*   **Offline-First Resilience:** All data is still saved to the local **SQLite** database first. The app remains 100% functional without an internet connection.
*   **Bidirectional Sync:** Improved the handshake between local storage and Firebase to prevent data loss during startup and background operations.
*   **Sync Heartbeat:** Added a background process that keeps students, logs, and settings in sync without slowing down the user interface.

---
*Note: After making backend changes to `server.js`, always restart the app (`npm start`) to apply updates.*
