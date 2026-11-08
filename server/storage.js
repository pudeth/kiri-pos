import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const PRODUCTS_FILE = path.join(DATA_DIR, 'inventory.json');
const SALES_FILE = path.join(DATA_DIR, 'sales.json');

// Initial seed products for immediate testing
const INITIAL_PRODUCTS = [
  {
    id: 'prod-1',
    barcode: '8850123456789',
    name: 'Cold Brew Coffee (Bottle)',
    category: 'Beverage',
    costPrice: 1.50,
    price: 3.50,
    stock: 24,
    minStockAlert: 5,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-2',
    barcode: '8850987654321',
    name: 'Almond Snack Pack 50g',
    category: 'Snacks',
    costPrice: 0.80,
    price: 1.99,
    stock: 15,
    minStockAlert: 8,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-3',
    barcode: 'ITEM-1003',
    name: 'Premium USB-C Cable 1m',
    category: 'Electronics',
    costPrice: 2.20,
    price: 6.99,
    stock: 6,
    minStockAlert: 10,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-4',
    barcode: 'ITEM-1004',
    name: 'Eco Cotton Tote Bag',
    category: 'General',
    costPrice: 2.00,
    price: 5.00,
    stock: 2,
    minStockAlert: 5,
    updatedAt: new Date().toISOString()
  }
];

export function getProducts() {
  try {
    if (!fs.existsSync(PRODUCTS_FILE)) {
      fs.writeFileSync(PRODUCTS_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    const data = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading products:', err);
    return [];
  }
}

export function saveProducts(products) {
  try {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving products:', err);
    return false;
  }
}

export function getSales() {
  try {
    if (!fs.existsSync(SALES_FILE)) {
      fs.writeFileSync(SALES_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    const data = fs.readFileSync(SALES_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading sales:', err);
    return [];
  }
}

export function saveSales(sales) {
  try {
    fs.writeFileSync(SALES_FILE, JSON.stringify(sales, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving sales:', err);
    return false;
  }
}
