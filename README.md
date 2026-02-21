# 🛒 QuickBill — Enterprise POS System

A full-stack **Point of Sale (POS)** application built for retail store management. Designed with a premium dark-themed UI and powered by a robust Node.js backend.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7.x-47A248?logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## ✨ Features

- **POS Terminal** — Barcode scanning, product search, real-time cart with instant checkout
- **Inventory Management** — Full CRUD for products with low-stock alerts
- **Sales Dashboard** — Today's sales, transaction count, and 7-day sales chart (Chart.js)
- **Transaction Reports** — Complete invoice history with payment method tracking
- **Customer Database** — Customer management with loyalty points tracking
- **Authentication** — User login & registration system
- **Receipt Printing** — Auto-generated thermal-style receipts
- **Keyboard Shortcuts** — `F2` for barcode scan, `F9` for quick checkout
- **Audio Feedback** — Web Audio API beeps for scan, success & error events
- **Responsive Design** — Works on desktop, tablet, and mobile

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB with Mongoose ODM |
| **Charts** | Chart.js |
| **Fonts** | Inter, Outfit (Google Fonts) |
| **Containerization** | Docker |

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/) running locally or a MongoDB Atlas URI

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/quickbill-pos.git
cd quickbill-pos

# Install dependencies
npm install

# (Optional) Create a .env file
echo MONGO_URI=mongodb://127.0.0.1:27017/cash-register > .env
# (Recommended for strict Google token audience validation)
# echo GOOGLE_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com >> .env

# In client/.env add:
# VITE_FIREBASE_API_KEY=your_firebase_api_key
# VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
# VITE_FIREBASE_PROJECT_ID=your_project_id
# VITE_FIREBASE_APP_ID=your_firebase_app_id
# VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
# VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id

# Seed the database with sample D-Mart products
node server/seed.js

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker

```bash
docker build -t quickbill-pos .
docker run -p 3000:3000 quickbill-pos
```

## 📁 Project Structure

```
quickbill-pos/
├── index.html              # Main SPA entry point
├── style.css               # Complete UI stylesheet (dark theme)
├── app.js                  # Frontend application logic
├── package.json
├── Dockerfile
└── server/
    ├── index.js            # Express server entry point
    ├── seed.js             # Database seeder (D-Mart products)
    ├── config/
    │   └── db.js           # MongoDB connection
    ├── controllers/
    │   ├── authController.js
    │   ├── invoiceController.js
    │   └── productController.js
    ├── middleware/
    │   └── errorMiddleware.js
    ├── models/
    │   ├── Customer.js
    │   ├── Invoice.js
    │   ├── Product.js
    │   └── User.js
    └── routes/
        ├── authRoutes.js
        ├── invoiceRoutes.js
        └── productRoutes.js
```

## 📜 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/products` | Get all products |
| `POST` | `/api/products` | Create a product |
| `PUT` | `/api/products/:id` | Update a product |
| `GET` | `/api/invoices` | Get all invoices |
| `POST` | `/api/invoices` | Create an invoice (checkout) |
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login |

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to open a PR.

## 📄 License

This project is [MIT](LICENSE) licensed.

---

<p align="center">Made with ❤️ by <strong>Anuj Ghodke</strong></p>
