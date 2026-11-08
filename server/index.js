import express from 'express';
import cors from 'cors';
import os from 'os';
import path from 'path';
import http from 'http';
import https from 'https';
import selfsigned from 'selfsigned';
import { fileURLToPath } from 'url';
import { getProducts, saveProducts, getSales, saveSales } from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const HTTP_PORT = process.env.PORT || 4000;
const HTTPS_PORT = process.env.HTTPS_PORT || 4443;

app.use(cors());
app.use(express.json());

// Serve static frontend files if built
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Helper: Get local network IP addresses
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({ interface: name, address: net.address });
      }
    }
  }
  return addresses;
}

// System network info API
app.get('/api/system/network', (req, res) => {
  const ips = getLocalIPs();
  res.json({
    ips,
    httpPort: HTTP_PORT,
    httpsPort: HTTPS_PORT,
    httpUrls: ips.map(i => `http://${i.address}:${HTTP_PORT}`),
    httpsUrls: ips.map(i => `https://${i.address}:${HTTPS_PORT}`)
  });
});

// Products API
app.get('/api/products', (req, res) => {
  const products = getProducts();
  res.json(products);
});

// Smart Barcode Lookup API (Online databases + local knowledge + GS1 prefixes)
app.get('/api/barcode/lookup/:barcode', async (req, res) => {
  const { barcode } = req.params;
  const cleanCode = String(barcode || '').trim();
  if (!cleanCode) {
    return res.status(400).json({ found: false, error: 'Barcode is required' });
  }

  // 1. Check local inventory first
  const products = getProducts();
  const existing = products.find(p => p.barcode.toLowerCase() === cleanCode.toLowerCase());
  if (existing) {
    return res.json({ found: true, source: 'inventory', product: existing });
  }

  // 2. Specialized known Cambodian & retail barcodes
  const knownDict = {
    '8809758325685': {
      name: 'Vaseline Collagen Moisture Lotion 1000ml (ឡេលាបខ្លួន)',
      category: 'គ្រឿងសម្អាង / ថែរក្សាស្បែក',
      badge: 'ឡេលាបខ្លួន',
      brand: 'Vaseline',
      costPrice: 5.00,
      price: 8.50,
      stock: 20,
      minStockAlert: 5,
      description: 'Vaseline Collagen Moisture Lotion 1000ml (바세린 콜라겐 모이스처 로션) - Gentle woody scent. Moisturize dry, rough skin with collagen.',
      image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&auto=format&fit=crop&q=80'
    },
    '8809581078888': {
      name: 'ថ្នាំក្អកកុមារ Tusin Syrup 95ml (Children’s Cold Remedy)',
      category: 'ឱសថ / សុខភាព',
      badge: 'ឱសថ',
      brand: 'Tusin (GENUONE Sciences Korea)',
      costPrice: 2.50,
      price: 4.00,
      stock: 25,
      minStockAlert: 5,
      description: 'Tusin Syrup 95ml - Children’s Cold Remedy (Rx Prescription Drug). Manufactured by GENUONE Sciences Inc. Sejong-si, Korea. Distributed by K1000 CO., LTD. CAM R3 3303IP-06.',
      image: ''
    },
    '063038602899': {
      name: 'JOLLY Cotton Buds 260pcs (សំឡីត្បារត្រចៀក)',
      category: 'សម្ភារៈប្រើប្រាស់',
      badge: 'អនាម័យ',
      brand: 'JOLLY',
      costPrice: 0.60,
      price: 1.00,
      stock: 25,
      minStockAlert: 5,
      description: 'JOLLY Cotton Buds 260pcs (Pure Cotton 100%). Imported by S.A.K.A Trading Co.,Ltd, Phnom Penh, Cambodia. Made in P.R.C.',
      image: ''
    },
    '63038602899': {
      name: 'JOLLY Cotton Buds 260pcs (សំឡីត្បារត្រចៀក)',
      category: 'សម្ភារៈប្រើប្រាស់',
      badge: 'អនាម័យ',
      brand: 'JOLLY',
      costPrice: 0.60,
      price: 1.00,
      stock: 25,
      minStockAlert: 5,
      description: 'JOLLY Cotton Buds 260pcs (Pure Cotton 100%). Imported by S.A.K.A Trading Co.,Ltd, Phnom Penh, Cambodia. Made in P.R.C.',
      image: ''
    },
    '8847100741219': {
      name: 'ភេសជ្ជៈកំប៉ុងក្រហម (Red Can Drink 250ml)',
      category: 'ទំនិញទូទៅ',
      badge: 'ភេសជ្ជៈ',
      brand: 'Cambodia Beverage',
      costPrice: 0.50,
      price: 0.75,
      stock: 30,
      minStockAlert: 5,
      description: 'ភេសជ្ជៈកំប៉ុងផលិតនៅកម្ពុជា 250ml',
      image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80'
    },
    '91234567890': {
      name: 'ស្រោមទូរស័ព្ទថ្លា Clear Case MagSafe',
      category: 'គ្រឿងបន្លាស់',
      badge: 'គ្រឿងបន្លាស់',
      brand: 'Case Accessories',
      costPrice: 5.00,
      price: 15.00,
      stock: 25,
      minStockAlert: 5,
      description: 'ស្រោមថ្លា Shockproof MagSafe សម្រាប់ iPhone',
      image: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=300&auto=format&fit=crop&q=80'
    },
    '912345678908': {
      name: 'ស្រោមទូរស័ព្ទថ្លា Clear Case MagSafe (EAN)',
      category: 'គ្រឿងបន្លាស់',
      badge: 'គ្រឿងបន្លាស់',
      brand: 'Case Accessories',
      costPrice: 5.00,
      price: 15.00,
      stock: 25,
      minStockAlert: 5,
      description: 'ស្រោមថ្លា Shockproof MagSafe សម្រាប់ iPhone',
      image: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=300&auto=format&fit=crop&q=80'
    }
  };

  if (knownDict[cleanCode]) {
    return res.json({
      found: true,
      source: 'catalog',
      product: { barcode: cleanCode, ...knownDict[cleanCode] }
    });
  }

  // 3. Online Open Food Facts / Beauty Facts / Open Products APIs
  try {
    const urls = [
      `https://world.openbeautyfacts.org/api/v0/product/${cleanCode}.json`,
      `https://world.openfoodfacts.org/api/v0/product/${cleanCode}.json`,
      `https://world.openproductsfacts.org/api/v0/product/${cleanCode}.json`
    ];

    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        const resp = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.status === 1 && data.product) {
            const p = data.product;
            const pName = p.product_name_kh || p.product_name || p.product_name_en || p.generic_name || '';
            if (pName) {
              const brand = p.brands || '';
              const fullName = brand ? `${brand} - ${pName}` : pName;
              return res.json({
                found: true,
                source: 'online_db',
                product: {
                  barcode: cleanCode,
                  name: fullName,
                  category: 'ទំនិញទូទៅ',
                  badge: 'ទំនិញថ្មី',
                  brand: brand,
                  costPrice: 0,
                  price: 0,
                  stock: 10,
                  minStockAlert: 5,
                  description: p.ingredients_text || p.generic_name || '',
                  image: p.image_url || p.image_front_url || ''
                }
              });
            }
          }
        }
      } catch {
        // try next
      }
    }
  } catch (err) {
    console.warn('Online barcode lookup warning:', err);
  }

  // 4. Fallback: NEVER use country name as the product name!
  // Leave name empty so the user can easily type the real product name.
  let suggestedCategory = 'ទំនិញទូទៅ';
  if (/^(IP|IPHONE|A\d{4})/i.test(cleanCode)) {
    suggestedCategory = 'ទូរស័ព្ទថ្មី';
  } else if (/(CASE|COVER|GLASS|CHARGER|CABLE)/i.test(cleanCode)) {
    suggestedCategory = 'គ្រឿងបន្លាស់';
  }

  return res.json({
    found: true,
    source: 'ai_suggest',
    product: {
      barcode: cleanCode,
      name: '', // Empty: forces user to input the real name, NEVER country!
      category: suggestedCategory,
      badge: 'ទំនិញថ្មី',
      costPrice: 0,
      price: 0,
      stock: 10,
      minStockAlert: 5,
      description: `បារកូដ: ${cleanCode}`
    }
  });
});

app.get('/api/products/lookup/:barcode', (req, res) => {
  const { barcode } = req.params;
  const products = getProducts();
  const trimmed = barcode.trim();
  const product = products.find(p => p.barcode.toLowerCase() === trimmed.toLowerCase());
  if (product) {
    res.json({ found: true, product });
  } else {
    res.json({ found: false, barcode: trimmed });
  }
});

app.post('/api/products', (req, res) => {
  const { id, barcode, name, category, costPrice, price, stock, minStockAlert, description, image, badge, condition } = req.body;
  if (!barcode || !name) {
    return res.status(400).json({ error: 'Barcode and name are required' });
  }

  const products = getProducts();
  const cleanBarcode = barcode.trim();
  const existingIndex = products.findIndex(p => 
    (id && p.id === id) || p.barcode.toLowerCase() === cleanBarcode.toLowerCase()
  );

  const productData = {
    id: id || `prod-${Date.now()}`,
    barcode: cleanBarcode,
    name: name.trim(),
    category: category ? category.trim() : 'General',
    badge: badge || 'ថ្មី',
    condition: condition || 'ថ្មីប្រអប់',
    image: image || '',
    costPrice: Number(costPrice) || 0,
    price: Number(price) || 0,
    stock: Math.max(0, parseInt(stock, 10) || 0),
    minStockAlert: Math.max(0, parseInt(minStockAlert, 10) || 5),
    description: description ? description.trim() : '',
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    products[existingIndex] = { ...products[existingIndex], ...productData };
  } else {
    products.unshift(productData);
  }

  saveProducts(products);
  res.status(200).json({ success: true, product: productData });
});

app.post('/api/products/restock', (req, res) => {
  const { barcode, quantity, costPrice, price } = req.body;
  const addQty = parseInt(quantity, 10);
  if (!barcode || isNaN(addQty)) {
    return res.status(400).json({ error: 'Valid barcode and quantity are required' });
  }

  const products = getProducts();
  const product = products.find(p => p.barcode.toLowerCase() === barcode.trim().toLowerCase());

  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  product.stock = Math.max(0, (product.stock || 0) + addQty);
  if (costPrice !== undefined && costPrice !== null && !isNaN(Number(costPrice))) {
    product.costPrice = Number(costPrice);
  }
  if (price !== undefined && price !== null && !isNaN(Number(price))) {
    product.price = Number(price);
  }
  product.updatedAt = new Date().toISOString();

  saveProducts(products);
  res.json({
    success: true,
    message: `Updated stock: ${product.stock}`,
    product
  });
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const products = getProducts();
  const filtered = products.filter(p => p.id !== id && p.barcode !== id);
  if (filtered.length === products.length) {
    return res.status(404).json({ error: 'Product not found' });
  }
  saveProducts(filtered);
  res.json({ success: true, message: 'Product deleted' });
});

// Sales / POS API
app.post('/api/sales', (req, res) => {
  const { items, paymentMethod, amountPaid, customerName, discount = 0, tax = 0 } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Sale cart cannot be empty' });
  }

  const products = getProducts();
  const sales = getSales();

  for (const item of items) {
    const prod = products.find(p => p.id === item.productId || p.barcode === item.barcode);
    if (!prod) {
      return res.status(400).json({ error: `Product "${item.name || item.barcode}" not found` });
    }
    if (prod.stock < item.quantity) {
      return res.status(400).json({ 
        error: `Insufficient stock for "${prod.name}". Available: ${prod.stock}` 
      });
    }
  }

  let totalCost = 0;
  let subtotal = 0;
  const processedItems = items.map(item => {
    const prod = products.find(p => p.id === item.productId || p.barcode === item.barcode);
    prod.stock -= item.quantity;
    prod.updatedAt = new Date().toISOString();

    const itemTotal = Number(item.price) * item.quantity;
    subtotal += itemTotal;
    totalCost += (prod.costPrice || 0) * item.quantity;

    return {
      productId: prod.id,
      barcode: prod.barcode,
      name: prod.name,
      price: Number(item.price),
      costPrice: prod.costPrice || 0,
      quantity: item.quantity,
      total: itemTotal
    };
  });

  const finalTotal = Math.max(0, subtotal - Number(discount) + Number(tax));
  const change = Math.max(0, (Number(amountPaid) || finalTotal) - finalTotal);

  const saleRecord = {
    id: `SALE-${Date.now()}`,
    receiptNo: `REC-${Math.floor(100000 + Math.random() * 900000)}`,
    items: processedItems,
    itemCount: items.reduce((sum, it) => sum + it.quantity, 0),
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(Number(discount).toFixed(2)),
    tax: Number(Number(tax).toFixed(2)),
    total: Number(finalTotal.toFixed(2)),
    profit: Number((finalTotal - totalCost).toFixed(2)),
    paymentMethod: paymentMethod || 'cash',
    amountPaid: Number((Number(amountPaid) || finalTotal).toFixed(2)),
    change: Number(change.toFixed(2)),
    customerName: customerName ? customerName.trim() : 'Walk-in Customer',
    createdAt: new Date().toISOString()
  };

  saveProducts(products);
  sales.unshift(saleRecord);
  saveSales(sales);

  res.status(201).json({
    success: true,
    message: 'Sale completed successfully',
    receipt: saleRecord,
    updatedProducts: products
  });
});

app.get('/api/sales', (req, res) => {
  res.json(getSales());
});

app.get('/api/stats', (req, res) => {
  const products = getProducts();
  const sales = getSales();

  const totalProducts = products.length;
  const totalStockItems = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const lowStockCount = products.filter(p => p.stock <= (p.minStockAlert || 5)).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;
  const totalInventoryValue = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0);

  const today = new Date().toISOString().slice(0, 10);
  const todaysSales = sales.filter(s => s.createdAt.startsWith(today));
  const todayRevenue = todaysSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const todayProfit = todaysSales.reduce((sum, s) => sum + (s.profit || 0), 0);
  const todayItemsSold = todaysSales.reduce((sum, s) => sum + (s.itemCount || 0), 0);

  res.json({
    totalProducts,
    totalStockItems,
    lowStockCount,
    outOfStockCount,
    totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
    todayRevenue: Number(todayRevenue.toFixed(2)),
    todayProfit: Number(todayProfit.toFixed(2)),
    todaySalesCount: todaysSales.length,
    todayItemsSold,
    allTimeRevenue: Number(sales.reduce((sum, s) => sum + (s.total || 0), 0).toFixed(2)),
    allTimeSalesCount: sales.length
  });
});

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  const indexHtml = path.join(distPath, 'index.html');
  res.sendFile(indexHtml);
});

// Generate self-signed SSL certificate for HTTPS (Required for iPhone Camera on Safari/iOS)
const ips = getLocalIPs();
const altNames = [
  { type: 2, value: 'localhost' },
  { type: 7, ip: '127.0.0.1' },
  ...ips.map(i => ({ type: 7, ip: i.address }))
];

const pems = selfsigned.generate(
  [{ name: 'commonName', value: 'StockPOS Mobile' }],
  {
    days: 365,
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [{ name: 'subjectAltName', altNames }]
  }
);

// Start HTTP Server
const httpServer = http.createServer(app);
httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 StockPOS HTTP running on port ${HTTP_PORT}`);
  ips.forEach(i => console.log(`   HTTP:  http://${i.address}:${HTTP_PORT}`));
});

// Start HTTPS Server
const httpsServer = https.createServer({ key: pems.private, cert: pems.cert }, app);
httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
  console.log(`🔒 StockPOS HTTPS (For iPhone Camera) running on port ${HTTPS_PORT}`);
  ips.forEach(i => console.log(`   HTTPS: https://${i.address}:${HTTPS_PORT}`));
  console.log(`======================================================\n`);
});
