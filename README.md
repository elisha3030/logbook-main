# 📋 Student Logbook & Document Management System

A robust, modern student tracking and document management system designed for school offices. This system features a student-facing kiosk, a faculty management dashboard, real-time email notifications, and bidirectional cloud synchronization.

## 🚀 Key Features

- **Student Kiosk**: Scan barcodes or enter IDs to log visits, request documents, or claim ready documents.
- **Faculty Dashboard**: Real-time queue management, service tracking, and document status updates (In/Out).
- **Email Notifications**: Automated alerts for students at every stage:
  - **📥 Received**: When a document request is first logged.
  - **⚙️ Processing**: When faculty begins working on the request.
  - **📦 Ready**: When the document is completed and ready for pickup.
  - **📄 Claimed**: Confirmation when the document is physically picked up.
- **Smart Filtering**: Automatic identification of document-related requests based on keywords (TOR, Clearance, Certificate, etc.).
- **Cloud Sync**: Hybrid architecture using local SQLite for offline reliability and Firebase Firestore for cloud backup and multi-office synchronization.
- **Audit Logging**: Comprehensive tracking of all administrative and faculty actions.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express
- **Database**: SQLite (Local), Firebase Firestore (Cloud)
- **Email**: Nodemailer (SMTP/Gmail)
- **Frontend**: Vanilla JavaScript, Tailwind CSS, Lucide Icons, ZXing (Barcode Scanning)
- **Reporting**: jsPDF, AutoTable

## 📥 Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd logbook-main-main
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Initialize the local database**:
   ```bash
   npm run init-db
   ```

4. **Configure Environment Variables**:
   Create a `.env` file in the root directory based on the provided template:
   ```env
   PORT=3000
   SESSION_SECRET=your_random_secret
   FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-key.json
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   OFFICE_NAME=Engineering Office
   ```

## 📂 Project Structure

- `/public`: Frontend assets (HTML, CSS, JS)
  - `student-logs.html`: The Kiosk entry point.
  - `faculty.html`: The Faculty dashboard.
  - `admin.html`: System settings and user management.
- `/scripts`: Database initialization and maintenance scripts.
- `server.js`: Core Express server and API logic.
- `local.db`: Local SQLite database (generated after init).

## 💡 Troubleshooting

### Email Alerts Not Sending
- Ensure `SMTP_USER` and `SMTP_PASS` (App Password) are correct in `.env`.
- Check if the student record has a valid email address.
- Verify that the activity name contains one of the document keywords (e.g., "Request", "Form", "Clearance").

### Document Not Showing in Pickup
- Ensure the Faculty has marked the request as **"Done"**.
- Check that the `docStatus` is set to **"In"** (default when marking Done).
- Verify the student scanned the same ID/Barcode used during the initial request.

## 📄 License

This project is licensed under the ISC License.