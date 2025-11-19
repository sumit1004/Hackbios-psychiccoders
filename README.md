FXcgo – Smart Import–Export Management Platform

fxcgo is a unified international trade platform that makes global exporting and importing safer, smarter, and more transparent.
It protects exporters from currency fluctuation, automates documentation, secures shipments, provides insurance insights, enables global payments, and offers dedicated dashboards for Exporters, Importers, and Admin.

This project was built for a Hackathon — fully functional with Firebase backend, dashboards, support system, eKYC, and marketplace.

Project Overview

International trade is full of problems:

Exporters lose money due to currency fluctuation

Shipments get delayed, damaged, or lost without insurance

Documentation is scattered across email, WhatsApp, PDFs

Importers don’t know where the cargo is

No real-time support

No unified system to manage payments, documents, products, insurance, forward contracts

FXcgo solves all of this in one platform.

🔹 Exporter Dashboard

A complete management system for exporters.

✔ Forward Contracts Simulator

Lock exchange rates in advance, predict volatility, get contract analysis, generate PDF.

✔ AI Insurance Recommendation

Suggests best shipment insurance based on cargo value, risk level, and route.

✔ Add Your Products

Create export catalogs for Importers and Marketplace.

✔ International Payments Module

Secure cross-border payments with real-time currency exchange.

✔ QR Shipment Documentation

Upload all shipment documents → Generate a single QR code for customs & importers.

✔ eKYC Verification Popup (One-Time Only)

Auto-fetch country from Firebase

Show country-specific ID dropdown

Upload identity proof, business proof, bank proof

Store documents in Firebase Storage

Save metadata in Firestore

Once completed → Button disappears forever

✔ Analytics

Contract performance, earnings, shipment stats.

✔ Support System

Chatbot

Admin live chat

FAQ integrated

Firebase-powered chat storage

✔ Marketplace

View products, pricing, and trade-ready catalogs.

### 🔹 Importer Dashboard

Specially designed for importers to manage purchases and shipments.

✔ Track Shipments

Live updates: In Transit, Arrived, Clearance, Delivered.

✔ View QR Documents

Importers can scan/open QR to see all customs documents uploaded by exporter.

✔ Make Payments

Pay exporter securely in multi-currency mode.

✔ iKYC Verification

One-time identity & business verification.

✔ Dispute Management

Raise issues for damaged goods, missing documents, delayed shipments.

✔ Support Bot + Admin Chat

Same support engine as exporter dashboard.

### 🔹 Admin Panel

The control center for the entire platform.

Manage exporters & importers

Approve/Reject eKYC & iKYC

Oversee marketplace & products

Manage disputes

Chat live with users

Set Admin Online/Offline status

View overall analytics

```
📦 root
 ┣ 📁 Admin
 ┃ ┣ admin-panel.html
 ┃ ┣ admin-script.js
 ┃ ┗ admin-styles.css
 ┃
 ┣ 📁 Export-Dashboard
 ┃ ┣ export-dashboard.html
 ┃ ┣ dashboard-script.js
 ┃ ┗ dashboard-styles.css
 ┃
 ┣ 📁 Importer-Dashboard
 ┃ ┣ importer-dashboard.html
 ┃ ┣ importer-dashboard.js
 ┃ ┗ importer-dashboard.css
 ┃
 ┣ 📁 marketplace
 ┃ ┣ marketplace.html
 ┃ ┣ marketplace.js
 ┃ ┣ marketplace.css
 ┃ ┣ checkout.html
 ┃ ┣ checkout.js
 ┃ ┗ checkout.css
 ┃
 ┣ index.html
 ┣ script.js
 ┣ styles.css
 ┣ README.md
 ┗ firebase-security-rules.json

```

🛠️ Tech Stack
Frontend

HTML

CSS

JavaScript

Responsive UI Design

Backend

Firebase Authentication

Firebase Realtime Database

Firebase Storage

Firebase Firestore

Security Rules

Tools

QR Code API

Chart.js

PDF Generation

Icons & Illustrations


What It Solves

FXcgo solves the biggest pain points in international trade:

Protects exporters from forex losses

Secures shipments with AI-driven insurance

Simplifies customs work with QR documentation

Provides full transparency to importers

Offers real-time support

Manages disputes & documents in one place

Challenges I Faced
1. Dynamic eKYC (India vs International)

Country-based dropdowns & auto-fetch logic caused UI issues initially.
Fix: Stored country in Firebase; rendered forms dynamically.

2. Preventing re-appearing eKYC popup

The modal kept opening even after KYC was done.
Fix: Added ekycCompleted flag in Firestore.

3. Firebase file upload errors

Some files were overwritten.
Fix: Added unique filenames + separated folder structure.

4. Real-time Support Chat

Switching between Admin online and bot mode was tricky.
Fix: Created adminOnline status + two engines: bot & admin.

What I Learned

Using Firebase as full backend

Designing dashboards for two different roles

Managing complex workflows (KYC, payments, shipping)

Global-ready UI/UX for trade platforms

Realtime architecture with Firebase

End-to-end authentication & security rules

Responsive design for large dashboards

## 🔮 Future Improvements

Integrate real bank APIs for forward contracts

Live forex data from financial API

WhatsApp alerts for shipments

AI document scanner

Blockchain-based immutable shipment logs

Smart OCR for invoices & customs papers

How to Run the Project
1. Clone Repo
 ```
git clone https://github.com/your-repo-name/fxcgo.git
```
3. Open index.html

Just open in browser.

3. Connect Firebase

Replace Firebase config in script.js / dashboard scripts

Enable Authentication

Create Storage buckets

Add rules

4. Run Exporter Dashboard
```
/Export-Dashboard/export-dashboard.html
```
5. Run Importer Dashboard
```
/Importer-Dashboard/importer-dashboard.html
```
6. Run Admin Panel
```
/Admin/admin-panel.html
```
