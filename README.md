# StockPOS Express - Mobile Barcode/QR Scanner & POS Web App

A modern, mobile-first web application designed for smartphones to **scan barcodes and QR codes**, **manage stock inventory (replenish / add stock)**, and **handle point-of-sale (selling & checkout)** with automatic stock deduction.

---

## 📱 Features

1. **Mobile Camera Barcode & QR Code Scanner**:
   - High-performance live camera scanning powered by `html5-qrcode`.
   - Supports 1D barcodes (**EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, ITF**) and 2D **QR Codes**.
   - Rear camera selection by default on smartphones.
   - Built-in flashlight toggle (for dark storage rooms).
   - Instant audio beep & haptic vibration on successful scan via Web Audio API.
   - **Photo / Gallery mode fallback**: Snap pictures directly using your phone's native camera.
   - **Manual code entry**: In case a physical barcode is smudged or unscannable.

2. **Add Stock (Inventory Replenishment & Registration)**:
   - **Scan existing item**: Shows product details and current stock count. Quick tap `+1`, `+5`, `+10`, `+20` or enter custom quantity to restock.
   - **Scan new / unregistered barcode**: Automatically opens the registration modal with the scanned code pre-filled. Enter product name, category, cost price, selling price, and initial stock.
   - Instant inventory update.

3. **Sell / Point of Sale (POS Mode)**:
   - Rapid scanning directly into the customer's cart.
   - Real-time stock validation: prevents overselling items that are out of stock.
   - Quantity increment/decrement and item removal in cart.
   - **Checkout**:
     - **Cash**: Quick bill buttons ($5, $10, $20, $50, $100, Exact) and automatic change calculator.
     - **QR Pay**: Customer scan-to-pay view.
     - **Card**: Credit / Debit card processing.
     - Optional discounts and customer name/table reference.
   - **Stock Deduction**: Automatically decrements quantities from inventory upon sale completion.
   - **Digital Receipt**: Itemized receipt with printable view and "Next Sale" shortcut.

4. **Inventory Catalog & Management**:
   - Live search by product name, category, or barcode.
   - Quick filters: **All**, **Low Stock**, **Out of Stock**.
   - One-tap `+` / `-` quick stock adjustments.
   - Edit prices, stock thresholds, or delete products.

5. **Sales Analytics & History**:
   - View past transactions with date, time, receipt ID, customer, payment method, and total.
   - Daily and all-time revenue metrics, items sold, and transaction counts.

---

## 🚀 Quick Start

### 1. Start the Application
Run in your terminal:
```bash
npm start
```
*(Or `node server/index.js`)*

The server will display:
```
🚀 Stock & POS Scanner Server running on port 4000
Local Access:  http://localhost:4000
Mobile Access: http://192.168.x.x:4000
```

### 2. Open on Your Smartphone
1. Connect your smartphone to the **same Wi-Fi network** as your computer.
2. Open Chrome or Safari on your phone and navigate to the **Mobile Access URL** shown in the terminal (e.g. `http://192.168.2.30:4000`).
3. Tap **Allow** when the browser asks for camera permission.
4. *Tip:* Tap the **"Phone Connect"** button in the app header at any time to see the connection address.

---

## 🏷️ Test Barcodes (Ready to scan or enter manually)

You can test these pre-loaded items right away:

| Barcode / QR | Product Name | Category | Price | Stock |
| :--- | :--- | :--- | :--- | :--- |
| `8850123456789` | Cold Brew Coffee (Bottle) | Beverage | $3.50 | 27 |
| `8850987654321` | Almond Snack Pack 50g | Snacks | $1.99 | 15 |
| `ITEM-1003` | Premium USB-C Cable 1m | Electronics | $6.99 | 6 |
| `ITEM-1004` | Eco Cotton Tote Bag | General | $5.00 | 2 (Low) |

*You can also scan any real barcode on snacks, beverages, or books around your desk to test registering new items!*

---

## 📁 Project Structure

```
d:\SYS\
├── data/
│   ├── inventory.json     # Persistent product database
│   └── sales.json         # Persistent sales & receipts database
├── server/
│   ├── index.js           # Express REST API & static file server
│   └── storage.js         # Safe JSON database engine
├── src/
│   ├── components/
│   │   ├── Scanner.jsx            # html5-qrcode camera & barcode scanner
│   │   ├── AddStockModal.jsx      # Stock replenishment & new product modal
│   │   ├── POSCart.jsx            # Mobile shopping cart with stock check
│   │   ├── CheckoutModal.jsx      # Cash/QR/Card checkout & change calculator
│   │   ├── ReceiptModal.jsx       # Digital receipt & print view
│   │   ├── ProductList.jsx        # Product catalog & stock filters
│   │   ├── ProductModal.jsx       # Manual product creator & editor
│   │   ├── SalesHistory.jsx       # Sales transactions & analytics
│   │   ├── MobileConnectModal.jsx # Network Wi-Fi pairing helper
│   │   └── SoundEffects.js        # Web Audio API synthesizers
│   ├── App.jsx            # Main app shell with mobile bottom navigation
│   ├── index.css          # Mobile-optimized UI styles & scan animations
│   └── main.jsx           # React root
├── index.html             # Mobile viewport & PWA meta tags
├── vite.config.js         # Build & development config
└── package.json
```
