import React, { useState, useEffect, useCallback } from 'react';
import { 
  Home,
  ScanLine, 
  PackagePlus, 
  ShoppingCart, 
  BarChart3,
  Smartphone, 
  CheckCircle,
  CheckCircle2,
  Plus,
  Search,
  Sparkles,
  Package,
  Edit3,
  AlertTriangle,
  X
} from 'lucide-react';

import HomeProducts from './components/HomeProducts';
import Scanner from './components/Scanner';
import AddStockModal from './components/AddStockModal';
import POSCart from './components/POSCart';
import CheckoutModal from './components/CheckoutModal';
import ReceiptModal from './components/ReceiptModal';
import ProductList from './components/ProductList';
import ProductModal from './components/ProductModal';
import SalesHistory from './components/SalesHistory';
import { playBeep } from './components/SoundEffects';

const DEFAULT_SEED_PRODUCTS = [
  {
    id: 'prod-tusin',
    barcode: '8809581078888',
    name: 'ថ្នាំក្អកកុមារ Tusin Syrup 95ml (Children’s Cold Remedy)',
    category: 'ឱសថ / សុខភាព',
    badge: 'ឱសថ',
    brand: 'Tusin (GENUONE Sciences Korea)',
    costPrice: 2.50,
    price: 4.00,
    stock: 25,
    minStockAlert: 5,
    description: 'Tusin Syrup 95ml - Children’s Cold Remedy. Made in Korea.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-jolly',
    barcode: '063038602899',
    name: 'JOLLY Cotton Buds 260pcs (សំឡីត្បារត្រចៀក)',
    category: 'សម្ភារៈប្រើប្រាស់',
    badge: 'អនាម័យ',
    brand: 'JOLLY',
    costPrice: 0.60,
    price: 1.00,
    stock: 25,
    minStockAlert: 5,
    description: 'JOLLY Cotton Buds 260pcs Pure Cotton 100%.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-vaseline',
    barcode: '8809758325685',
    name: 'Vaseline Collagen Moisture Lotion 1000ml (ឡេលាបខ្លួន)',
    category: 'គ្រឿងសម្អាង / ថែរក្សាស្បែក',
    badge: 'ឡេលាបខ្លួន',
    brand: 'Vaseline',
    costPrice: 5.00,
    price: 8.50,
    stock: 20,
    minStockAlert: 5,
    description: 'Vaseline Collagen Moisture Lotion 1000ml.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-khmer-can',
    barcode: '8847100741219',
    name: 'ភេសជ្ជៈប៉ូវកម្លាំង Khmer Beverages 250ml (Red Can)',
    category: 'ភេសជ្ជៈ & អាហារ',
    badge: 'ភេសជ្ជៈ',
    brand: 'Khmer Beverages',
    costPrice: 0.50,
    price: 0.75,
    stock: 30,
    minStockAlert: 5,
    description: 'ភេសជ្ជៈកំប៉ុងក្រហម Khmer Beverages 250ml. Made in Cambodia.',
    updatedAt: new Date().toISOString()
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'scan' | 'stock' | 'sell' | 'history'
  
  // Data State
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cart State (for POS / Selling)
  const [cart, setCart] = useState([]);

  // Modals & Active Scans
  const [scannedForStock, setScannedForStock] = useState(null); // { barcode, product }
  const [showCheckout, setShowCheckout] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null); // for editing
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [scanToast, setScanToast] = useState(null);
  const [scannerAutoOpen, setScannerAutoOpen] = useState(false);
  const [scannedFoundProduct, setScannedFoundProduct] = useState(null);
  const [scannedNotFoundCode, setScannedNotFoundCode] = useState(null);
  const [scanSearchQuery, setScanSearchQuery] = useState('');

  // Fetch initial data with automatic LocalStorage caching & offline fallback
  const loadData = useCallback(async () => {
    try {
      const [prodRes, salesRes, statsRes] = await Promise.all([
        fetch('/api/products').catch(() => null),
        fetch('/api/sales').catch(() => null),
        fetch('/api/stats').catch(() => null)
      ]);

      let prods = null;
      let sls = null;
      let st = null;

      if (prodRes && prodRes.ok) {
        try { prods = await prodRes.json(); } catch {}
      }
      if (salesRes && salesRes.ok) {
        try { sls = await salesRes.json(); } catch {}
      }
      if (statsRes && statsRes.ok) {
        try { st = await statsRes.json(); } catch {}
      }

      if (Array.isArray(prods) && prods.length > 0) {
        setProducts(prods);
        try { localStorage.setItem('kiri_pos_products', JSON.stringify(prods)); } catch {}
      } else {
        const localProds = localStorage.getItem('kiri_pos_products');
        if (localProds) {
          try { setProducts(JSON.parse(localProds)); } catch {}
        } else {
          setProducts(DEFAULT_SEED_PRODUCTS);
          try { localStorage.setItem('kiri_pos_products', JSON.stringify(DEFAULT_SEED_PRODUCTS)); } catch {}
        }
      }

      if (Array.isArray(sls)) {
        setSales(sls);
        try { localStorage.setItem('kiri_pos_sales', JSON.stringify(sls)); } catch {}
      } else {
        const localSales = localStorage.getItem('kiri_pos_sales');
        if (localSales) {
          try { setSales(JSON.parse(localSales)); } catch {}
        }
      }

      if (st) {
        setStats(st);
      }
    } catch (err) {
      console.warn('Offline mode active:', err);
      const localProds = localStorage.getItem('kiri_pos_products');
      setProducts(localProds ? JSON.parse(localProds) : DEFAULT_SEED_PRODUCTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sync products and sales to localStorage whenever updated
  useEffect(() => {
    if (products && products.length > 0) {
      try { localStorage.setItem('kiri_pos_products', JSON.stringify(products)); } catch {}
    }
  }, [products]);

  useEffect(() => {
    if (sales && sales.length > 0) {
      try { localStorage.setItem('kiri_pos_sales', JSON.stringify(sales)); } catch {}
    }
  }, [sales]);

  // Flash feedback toast
  const triggerToast = (msg, type = 'success') => {
    setScanToast({ message: msg, type });
    setTimeout(() => setScanToast(null), 3000);
  };

  // Add product to cart directly (from home or scan)
  const handleAddToCart = (product) => {
    if (!product || product.stock <= 0) {
      playBeep('error');
      triggerToast(`"${product?.name || 'ផលិតផល'}" អស់ពីស្តុកហើយ! (Out of stock)`, 'error');
      return;
    }

    setCart(prevCart => {
      const existing = prevCart.find(i => i.barcode === product.barcode);
      if (existing) {
        if (existing.quantity >= product.stock) {
          playBeep('error');
          triggerToast(`ស្តុកមានត្រឹមតែ ${product.stock} ប៉ុណ្ណោះ`, 'error');
          return prevCart;
        }
        playBeep('success');
        triggerToast(`បានបន្ថែម "${product.name}" ទៅកន្ត្រក`);
        return prevCart.map(i => 
          i.barcode === product.barcode 
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      } else {
        playBeep('success');
        triggerToast(`បានបន្ថែម "${product.name}" ទៅកន្ត្រក`);
        return [...prevCart, {
          productId: product.id,
          barcode: product.barcode,
          name: product.name,
          price: product.price,
          quantity: 1
        }];
      }
    });
  };

  // Scan in POS Mode
  const handleScanInPOS = (barcode) => {
    const cleanBarcode = barcode.trim();
    const product = products.find(p => p.barcode.toLowerCase() === cleanBarcode.toLowerCase());

    if (!product) {
      playBeep('error');
      triggerToast(`រកមិនឃើញកូដ "${cleanBarcode}" ក្នុងស្តុកទេ`, 'error');
      return;
    }

    handleAddToCart(product);
  };

  // Scan in Stock Mode
  const handleScanInStock = async (barcode) => {
    const cleanBarcode = barcode.trim();
    // 1. Check existing products first
    const existing = products.find(p => p.barcode.toLowerCase() === cleanBarcode.toLowerCase());
    if (existing) {
      setScannedForStock({
        barcode: cleanBarcode,
        product: existing
      });
      return;
    }

    try {
      const res = await fetch(`/api/products/lookup/${encodeURIComponent(cleanBarcode)}`);
      if (res.ok) {
        const data = await res.json();
        setScannedForStock({
          barcode: cleanBarcode,
          product: data.found ? data.product : null
        });
        return;
      }
    } catch (err) {
      console.warn('Lookup error:', err);
    }

    setScannedForStock({
      barcode: cleanBarcode,
      product: null
    });
  };

  // Scan to Find Product (Check Price, Stock & Info)
  const handleScanToFind = async (barcode) => {
    const cleanBarcode = String(barcode || '').trim();
    if (!cleanBarcode) return;

    // 1. Check in local products state
    const prod = products.find(p => p.barcode.toLowerCase() === cleanBarcode.toLowerCase());
    if (prod) {
      setScannedFoundProduct(prod);
      setScannedNotFoundCode(null);
      playBeep('success');
      triggerToast(`រកឃើញ: ${prod.name}`);
      return;
    }

    // 2. Check seed catalog fallback
    const seedProd = DEFAULT_SEED_PRODUCTS.find(p => p.barcode.toLowerCase() === cleanBarcode.toLowerCase());
    if (seedProd) {
      setScannedNotFoundCode({
        code: cleanBarcode,
        suggestion: seedProd
      });
      setScannedFoundProduct(null);
      playBeep('notice');
      return;
    }

    // 3. Query server barcode lookup API
    try {
      const res = await fetch(`/api/barcode/lookup/${encodeURIComponent(cleanBarcode)}`);
      const data = await res.json();
      if (data && data.found && data.product) {
        if (data.source === 'inventory') {
          setScannedFoundProduct(data.product);
          setScannedNotFoundCode(null);
          playBeep('success');
          triggerToast(`រកឃើញ: ${data.product.name}`);
          loadData();
        } else {
          // Found online / catalog but not yet in active inventory
          setScannedNotFoundCode({
            code: cleanBarcode,
            suggestion: data.product
          });
          setScannedFoundProduct(null);
          playBeep('notice');
        }
      } else {
        setScannedNotFoundCode({ code: cleanBarcode });
        setScannedFoundProduct(null);
        playBeep('error');
      }
    } catch {
      setScannedNotFoundCode({ code: cleanBarcode });
      setScannedFoundProduct(null);
    }
  };

  // Quick Restock from Home or List
  const handleRestockProduct = (product) => {
    setScannedForStock({
      barcode: product.barcode,
      product: product
    });
  };

  // Cart Qty Adjustments
  const handleUpdateCartQty = (barcode, newQty) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter(item => item.barcode !== barcode));
      return;
    }
    setCart(prev => prev.map(item => 
      item.barcode === barcode ? { ...item, quantity: newQty } : item
    ));
  };

  const handleRemoveCartItem = (barcode) => {
    setCart(prev => prev.filter(item => item.barcode !== barcode));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans pb-24">
      
      {/* Real-time Toast Banner */}
      {scanToast && (
        <div className={`fixed top-4 left-4 right-4 z-50 p-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-semibold backdrop-blur-md animate-in slide-in-from-top-3 ${
          scanToast.type === 'error'
            ? 'bg-rose-900 text-white'
            : 'bg-emerald-900 text-white'
        }`}>
          <CheckCircle size={16} className={scanToast.type === 'error' ? 'text-rose-300' : 'text-emerald-300'} />
          <span className="flex-1 truncate">{scanToast.message}</span>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4">
        
        {/* TAB 1: ផ្ទាំងដើម (HOME PRODUCTS) */}
        {activeTab === 'home' && (
          <HomeProducts
            products={products}
            stats={stats}
            onOpenScanner={() => {
              setScannerAutoOpen(true);
              setActiveTab('scan');
            }}
            onAddToCart={handleAddToCart}
            onRestockProduct={handleRestockProduct}
            onEditProduct={(p) => setSelectedProduct(p)}
            onAddNewProduct={() => setShowNewProductModal(true)}
          />
        )}

        {/* TAB 2: ស្កេន (SCAN & FIND PRODUCTS) */}
        {activeTab === 'scan' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Header & Title */}
            <div className="pb-1">
              <h2 className="text-base font-bold text-slate-900">ស្កេនស្វែងរកទំនិញ (Find Products)</h2>
              <p className="text-xs text-slate-500">ស្កេនបារកូដដើម្បីឆែកតម្លៃ ចំនួនស្តុក និងព័ត៌មានលម្អិត</p>
            </div>

            {/* Live Camera Barcode Scanner */}
            <Scanner
              key="find-scanner"
              active={activeTab === 'scan'}
              defaultOpen={scannerAutoOpen}
              onOpenStateChange={(open) => setScannerAutoOpen(open)}
              onScan={handleScanToFind}
              colorAccent="blue"
              modeTitle="ស្កេនស្វែងរកទំនិញ (Find Product)"
              subText="ដាក់បារកូដក្នុងប្រអប់ដើម្បីឆែកតម្លៃ និងចំនួនស្តុក"
            />

            {/* RESULT 1: Product Found Card */}
            {scannedFoundProduct && (
              <div className="bg-white border-2 border-emerald-500/50 rounded-3xl p-5 shadow-xl animate-in zoom-in-95 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      រកឃើញទំនិញ (Product Found)
                    </span>
                  </div>
                  <button
                    onClick={() => setScannedFoundProduct(null)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                    title="បិទ (Close)"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {scannedFoundProduct.image ? (
                      <img
                        src={scannedFoundProduct.image}
                        alt={scannedFoundProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package size={32} className="text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                      {scannedFoundProduct.name}
                    </h3>
                    <p className="text-xs font-mono text-blue-600 mt-1 font-semibold flex items-center gap-1">
                      <span>បារកូដ:</span>
                      <span className="bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                        {scannedFoundProduct.barcode}
                      </span>
                    </p>
                    <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {scannedFoundProduct.category || 'ទូទៅ'}
                    </span>
                  </div>
                </div>

                {/* Price and Stock Grid */}
                <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      តម្លៃលក់ចេញ (Price)
                    </span>
                    <div className="text-lg font-black text-blue-600 font-mono mt-0.5">
                      ${Number(scannedFoundProduct.price).toFixed(2)}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500">
                      {(Number(scannedFoundProduct.price) * 4000).toLocaleString()} ៛
                    </div>
                  </div>

                  <div className="border-l border-slate-200 pl-3.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      ស្តុកនៅសល់ (Stock)
                    </span>
                    <div className={`text-lg font-black font-mono mt-0.5 ${
                      scannedFoundProduct.stock <= (scannedFoundProduct.minStockAlert || 5)
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}>
                      {scannedFoundProduct.stock}{' '}
                      <span className="text-xs font-semibold text-slate-500">គ្រឿង</span>
                    </div>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      scannedFoundProduct.stock > 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {scannedFoundProduct.stock > 0 ? 'មានក្នុងស្តុក (In Stock)' : 'អស់ពីស្តុក (Out of Stock)'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={() => {
                      handleAddToCart(scannedFoundProduct);
                      triggerToast(`បានបន្ថែម "${scannedFoundProduct.name}" ទៅកន្ត្រក`);
                    }}
                    className="py-2.5 px-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-600/30 flex items-center justify-center gap-1.5 transition"
                  >
                    <ShoppingCart size={15} />
                    <span>ដាក់លក់</span>
                  </button>

                  <button
                    onClick={() => handleRestockProduct(scannedFoundProduct)}
                    className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition"
                  >
                    <PackagePlus size={15} />
                    <span>ថែមស្តុក</span>
                  </button>

                  <button
                    onClick={() => setSelectedProduct(scannedFoundProduct)}
                    className="py-2.5 px-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 rounded-2xl text-xs font-bold border border-slate-200 flex items-center justify-center gap-1.5 transition"
                  >
                    <Edit3 size={15} />
                    <span>កែប្រែ</span>
                  </button>
                </div>
              </div>
            )}

            {/* RESULT 2: Not in inventory card */}
            {scannedNotFoundCode && (
              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-sm animate-in zoom-in-95 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-600" />
                    <span className="text-xs font-bold text-amber-900">
                      រកមិនឃើញទំនិញក្នុងស្តុក (Not in Inventory)
                    </span>
                  </div>
                  <button
                    onClick={() => setScannedNotFoundCode(null)}
                    className="p-1 rounded-full text-amber-500 hover:bg-amber-100 transition"
                  >
                    <X size={16} />
                  </button>
                </div>

                <p className="text-xs text-amber-800">
                  បារកូដ: <strong className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200">{scannedNotFoundCode.code}</strong> មិនទាន់មានក្នុងបញ្ជីស្តុករបស់អ្នកនៅឡើយទេ។
                </p>

                <button
                  onClick={() => {
                    handleScanInStock(scannedNotFoundCode.code);
                    setScannedNotFoundCode(null);
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold rounded-2xl shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition"
                >
                  <Plus size={16} />
                  <span>ចុះបញ្ជីទំនិញនេះភ្លាមៗ (Register Product)</span>
                </button>
              </div>
            )}

            {/* Search & Actions Bar (Clean Light Mode - matching Image 2 design) */}
            <div className="flex items-center gap-2 mt-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={scanSearchQuery}
                  onChange={(e) => setScanSearchQuery(e.target.value)}
                  placeholder="ស្វែងរកតាមឈ្មោះ ឬកូដបារកូដ..."
                  style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-9 pr-9 py-2.5 text-xs text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:border-blue-500"
                />
                {scanSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setScanSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowNewProductModal(true)}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm shrink-0 flex items-center justify-center active:scale-95"
                title="បន្ថែមទំនិញថ្មី (Add New Product)"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Filtered Products List matching search query */}
            {scanSearchQuery.trim() && (
              <div className="bg-white border border-slate-200 rounded-3xl p-3 shadow-sm space-y-2 max-h-72 overflow-y-auto">
                <div className="text-[11px] font-bold text-slate-500 px-2 py-1">
                  លទ្ធផលស្វែងរក ({products.filter(p => p.name.toLowerCase().includes(scanSearchQuery.toLowerCase()) || p.barcode.toLowerCase().includes(scanSearchQuery.toLowerCase())).length})
                </div>
                {products
                  .filter(p => p.name.toLowerCase().includes(scanSearchQuery.toLowerCase()) || p.barcode.toLowerCase().includes(scanSearchQuery.toLowerCase()))
                  .map(p => (
                    <div
                      key={p.id}
                      onClick={() => setScannedFoundProduct(p)}
                      className="p-2.5 rounded-2xl hover:bg-slate-50 border border-slate-100 flex items-center justify-between cursor-pointer transition active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={18} className="text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                          <p className="text-[10px] font-mono text-slate-500">{p.barcode}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-blue-600 font-mono">${Number(p.price).toFixed(2)}</p>
                        <p className="text-[10px] text-slate-500 font-mono">ស្តុក: {p.stock}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Quick Inventory / Recent Items when not searching */}
            {!scanSearchQuery.trim() && (
              <div className="space-y-3">
                {products.length > 0 ? (
                  <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <h3 className="text-xs font-bold text-slate-800">
                          ទំនិញក្នុងស្តុក ({products.length})
                        </h3>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        ចុចលើទំនិញដើម្បីឆែកព័ត៌មាន
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                      {products.map(p => (
                        <div
                          key={p.id}
                          onClick={() => setScannedFoundProduct(p)}
                          className="py-2.5 px-1.5 flex items-center justify-between hover:bg-slate-50 rounded-2xl cursor-pointer transition active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                              {p.image ? (
                                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package size={20} className="text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {p.barcode}
                                </span>
                                <span className="text-[10px] text-slate-400">{p.category || 'ទូទៅ'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-xs font-black text-blue-600 font-mono">
                              ${Number(p.price).toFixed(2)}
                            </div>
                            <div className="text-[10px] font-bold mt-0.5">
                              <span className={`px-1.5 py-0.5 rounded-full ${
                                p.stock <= (p.minStockAlert || 5)
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                ស្តុក: {p.stock}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Modern Empty State Card */
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 mx-auto flex items-center justify-center">
                      <PackagePlus size={26} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">មិនទាន់មានទំនិញក្នុងស្តុកទេ</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                        ស្កេនបារកូដទំនិញដំបូងរបស់អ្នក ដើម្បីឆែកតម្លៃ ឬចុះបញ្ជីទំនិញថ្មីភ្លាមៗ
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewProductModal(true)}
                      className="inline-flex items-center gap-2 py-2.5 px-5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-600/25 transition"
                    >
                      <Plus size={16} />
                      <span>ចុះបញ្ជីទំនិញដំបូង (Add First Product)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {cart.length > 0 && (
              <div className="mt-4">
                <POSCart
                  cart={cart}
                  products={products}
                  onUpdateQty={handleUpdateCartQty}
                  onRemoveItem={handleRemoveCartItem}
                  onClearCart={handleClearCart}
                  onCheckout={() => setShowCheckout(true)}
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 3: បន្ថែមស្តុក (ADD STOCK) */}
        {activeTab === 'stock' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h2 className="text-base font-bold text-slate-900">បន្ថែមស្តុកទំនិញ (Restock)</h2>
                <p className="text-xs text-slate-500">ស្កេនបារកូដដើម្បីបញ្ចូលចំនួនស្តុកថ្មី</p>
              </div>
            </div>

            <Scanner
              key="restock-scanner"
              active={activeTab === 'stock'}
              defaultOpen={false}
              onScan={handleScanInStock}
              colorAccent="blue"
              modeTitle="ស្កេនបន្ថែមស្តុក"
              subText="ស្កេនបារកូដទំនិញដើម្បីបន្ថែមស្តុក"
            />

            <ProductList
              products={products}
              onSelectProduct={(p) => setSelectedProduct(p)}
              onAddNewProduct={() => setShowNewProductModal(true)}
              onQuickAdjustStock={async (barcode, delta) => {
                const res = await fetch('/api/products/restock', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ barcode, quantity: delta })
                });
                const data = await res.json();
                if (res.ok) {
                  setProducts(prev => prev.map(p => p.barcode === barcode ? data.product : p));
                  triggerToast(`បានកែប្រែស្តុក: ${data.product.name} (${data.product.stock})`);
                }
              }}
              onDeleteProduct={async (id) => {
                await fetch(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
                setProducts(prev => prev.filter(p => p.id !== id && p.barcode !== id));
                triggerToast('បានលុបទំនិញ');
              }}
            />
          </div>
        )}

        {/* TAB 4: ការលក់ (SELL / POS) */}
        {activeTab === 'sell' && (
          <div className="space-y-4 animate-in fade-in">
            <Scanner
              key="sell-scanner"
              active={activeTab === 'sell'}
              defaultOpen={false}
              onScan={handleScanInPOS}
              colorAccent="emerald"
              modeTitle="ស្កេនគិតលុយ"
              subText="ស្កេនទំនិញដើម្បីដាក់ក្នុងកន្ត្រក"
            />

            <POSCart
              cart={cart}
              products={products}
              onUpdateQty={handleUpdateCartQty}
              onRemoveItem={handleRemoveCartItem}
              onClearCart={handleClearCart}
              onCheckout={() => setShowCheckout(true)}
            />
          </div>
        )}

        {/* TAB 5: របាយការណ៍ (REPORTS / SALES) */}
        {activeTab === 'history' && (
          <div className="animate-in fade-in">
            <SalesHistory
              sales={sales}
              stats={stats}
              onViewReceipt={(receipt) => setActiveReceipt(receipt)}
            />
          </div>
        )}

      </main>

      {/* 5-Tab Bottom Navigation matching Image 2 */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-lg mx-auto grid grid-cols-5 gap-1">
          
          {/* 1. ផ្ទាំងដើម (Home) */}
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center py-1.5 px-1 rounded-2xl transition ${
              activeTab === 'home'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-xl ${activeTab === 'home' ? 'bg-blue-50 text-blue-600' : ''}`}>
              <Home size={22} />
            </div>
            <span className="text-[10px] mt-0.5 leading-tight">ផ្ទាំងដើម</span>
          </button>

          {/* 2. ស្កេន (Scan) */}
          <button
            onClick={() => {
              setScannerAutoOpen(false);
              setActiveTab('scan');
            }}
            className={`flex flex-col items-center py-1.5 px-1 rounded-2xl transition ${
              activeTab === 'scan'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-xl ${activeTab === 'scan' ? 'bg-blue-50 text-blue-600' : ''}`}>
              <ScanLine size={22} />
            </div>
            <span className="text-[10px] mt-0.5 leading-tight">ស្កេន</span>
          </button>

          {/* 3. បន្ថែមស្តុក (Add Stock) */}
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex flex-col items-center py-1.5 px-1 rounded-2xl transition ${
              activeTab === 'stock'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-xl ${activeTab === 'stock' ? 'bg-blue-50 text-blue-600' : ''}`}>
              <PackagePlus size={22} />
            </div>
            <span className="text-[10px] mt-0.5 leading-tight">បន្ថែមស្តុក</span>
          </button>

          {/* 4. ការលក់ (Sell / POS) */}
          <button
            onClick={() => setActiveTab('sell')}
            className={`flex flex-col items-center py-1.5 px-1 rounded-2xl transition relative ${
              activeTab === 'sell'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-xl relative ${activeTab === 'sell' ? 'bg-blue-50 text-blue-600' : ''}`}>
              <ShoppingCart size={22} />
              {totalCartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {totalCartCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 leading-tight">ការលក់</span>
          </button>

          {/* 5. របាយការណ៍ (Reports / Sales) */}
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center py-1.5 px-1 rounded-2xl transition ${
              activeTab === 'history'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-xl ${activeTab === 'history' ? 'bg-blue-50 text-blue-600' : ''}`}>
              <BarChart3 size={22} />
            </div>
            <span className="text-[10px] mt-0.5 leading-tight">របាយការណ៍</span>
          </button>

        </div>
      </nav>

      {/* MODAL 1: Add Stock Modal */}
      {scannedForStock && (
        <AddStockModal
          scannedCode={scannedForStock.barcode}
          product={scannedForStock.product}
          onClose={() => setScannedForStock(null)}
          onSave={(updated) => {
            setProducts(prev => prev.map(p => p.barcode === updated.barcode ? updated : p));
            triggerToast(`បានបន្ថែមស្តុក ${updated.name}! ស្តុកថ្មី: ${updated.stock}`);
            loadData();
          }}
          onProductCreated={(newProd) => {
            setProducts(prev => [newProd, ...prev]);
            triggerToast(`បានចុះបញ្ជី "${newProd.name}" (${newProd.stock} គ្រឿង)`);
            loadData();
          }}
        />
      )}

      {/* MODAL 2: Checkout Modal */}
      {showCheckout && (
        <CheckoutModal
          cart={cart}
          onClose={() => setShowCheckout(false)}
          onCompleteSale={(receipt, updatedProducts) => {
            setShowCheckout(false);
            setCart([]);
            setProducts(updatedProducts);
            setActiveReceipt(receipt);
            loadData();
          }}
        />
      )}

      {/* MODAL 3: Receipt Modal */}
      {activeReceipt && (
        <ReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
          onNewSale={() => {
            setActiveReceipt(null);
            setActiveTab('home');
          }}
        />
      )}

      {/* MODAL 4: Product Detail / Edit Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onSave={(updated) => {
            setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
            triggerToast(`បានរក្សាទុក "${updated.name}"`);
            loadData();
          }}
          onDelete={(id) => {
            setProducts(prev => prev.filter(p => p.id !== id && p.barcode !== id));
            triggerToast('បានលុបទំនិញ');
          }}
        />
      )}

      {/* MODAL 5: Add New Product Manually */}
      {showNewProductModal && (
        <ProductModal
          product={null}
          onClose={() => setShowNewProductModal(false)}
          onSave={(newProd) => {
            setProducts(prev => [newProd, ...prev]);
            triggerToast(`បានបន្ថែមទំនិញ "${newProd.name}"`);
            loadData();
          }}
        />
      )}

    </div>
  );
}
