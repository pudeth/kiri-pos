import React, { useState, useEffect } from 'react';
import { PackagePlus, Check, X, Tag, DollarSign, Layers, AlertCircle, Sparkles } from 'lucide-react';
import { playBeep } from './SoundEffects';

const CATEGORIES = [
  'ទំនិញទូទៅ',
  'គ្រឿងសម្អាង / ថែរក្សាស្បែក',
  'ឱសថ / សុខភាព',
  'ភេសជ្ជៈ & អាហារ',
  'សម្ភារៈប្រើប្រាស់',
  'អេឡិចត្រូនិក & គ្រឿងបន្លាស់'
];

const CLIENT_KNOWN_LOOKUP = {
  '8809581078888': {
    name: 'ថ្នាំក្អកកុមារ Tusin Syrup 95ml (Children’s Cold Remedy)',
    category: 'ឱសថ / សុខភាព',
    costPrice: 2.50,
    price: 4.00,
    stock: 25,
    minStockAlert: 5
  },
  '063038602899': {
    name: 'JOLLY Cotton Buds 260pcs (សំឡីត្បារត្រចៀក)',
    category: 'សម្ភារៈប្រើប្រាស់',
    costPrice: 0.60,
    price: 1.00,
    stock: 25,
    minStockAlert: 5
  },
  '63038602899': {
    name: 'JOLLY Cotton Buds 260pcs (សំឡីត្បារត្រចៀក)',
    category: 'សម្ភារៈប្រើប្រាស់',
    costPrice: 0.60,
    price: 1.00,
    stock: 25,
    minStockAlert: 5
  },
  '8809758325685': {
    name: 'Vaseline Collagen Moisture Lotion 1000ml (ឡេលាបខ្លួន)',
    category: 'គ្រឿងសម្អាង / ថែរក្សាស្បែក',
    costPrice: 5.00,
    price: 8.50,
    stock: 20,
    minStockAlert: 5
  }
};

export default function AddStockModal({
  scannedCode,
  product,
  onClose,
  onSave,
  onProductCreated
}) {
  const isExisting = Boolean(product);

  const [addQty, setAddQty] = useState(1);
  const [costPrice, setCostPrice] = useState(product?.costPrice ?? '');
  const [sellPrice, setSellPrice] = useState(product?.price ?? '');

  const [name, setName] = useState('');
  const [category, setCategory] = useState('ទំនិញទូទៅ');
  const [newCostPrice, setNewCostPrice] = useState('');
  const [newSellPrice, setNewSellPrice] = useState('');
  const [initialStock, setInitialStock] = useState(10);
  const [minStockAlert, setMinStockAlert] = useState(5);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [autofilling, setAutofilling] = useState(false);
  const [autofillSuccess, setAutofillSuccess] = useState(false);

  // Auto lookup product information from barcode API if registering new product
  useEffect(() => {
    if (!product && scannedCode) {
      let isCancelled = false;
      const lookupBarcode = async () => {
        setAutofilling(true);
        setAutofillSuccess(false);

        // Instant catalog lookup
        const cleanCode = String(scannedCode).trim();
        if (CLIENT_KNOWN_LOOKUP[cleanCode]) {
          const item = CLIENT_KNOWN_LOOKUP[cleanCode];
          setName(item.name);
          setCategory(item.category);
          setNewCostPrice(item.costPrice);
          setNewSellPrice(item.price);
          setInitialStock(item.stock);
          setMinStockAlert(item.minStockAlert);
          setAutofillSuccess(true);
          setAutofilling(false);
          return;
        }

        try {
          const res = await fetch(`/api/barcode/lookup/${encodeURIComponent(cleanCode)}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data && data.found && data.product && !isCancelled) {
            const prodName = data.product.name || '';
            // Make sure product name is REAL name and NOT a country placeholder
            if (prodName && !prodName.includes('(USA') && !prodName.includes('(South Korea') && !prodName.includes('(Cambodia') && !prodName.includes('(Thailand') && !prodName.includes('ទំនិញថ្មី (')) {
              setName(prodName);
              setAutofillSuccess(true);
            }
            if (data.product.category) setCategory(data.product.category);
            if (data.product.costPrice) setNewCostPrice(data.product.costPrice);
            if (data.product.price) setNewSellPrice(data.product.price);
            if (data.product.stock) setInitialStock(data.product.stock);
            if (data.product.minStockAlert) setMinStockAlert(data.product.minStockAlert);
          }
        } catch (e) {
          console.warn('Barcode auto-fill warning:', e);
        } finally {
          if (!isCancelled) setAutofilling(false);
        }
      };

      lookupBarcode();
      return () => { isCancelled = true; };
    }
  }, [product, scannedCode]);

  useEffect(() => {
    if (product) {
      setCostPrice(product.costPrice ?? '');
      setSellPrice(product.price ?? '');
      setAddQty(1);
    }
  }, [product]);

  const handleExistingRestock = async (e) => {
    e.preventDefault();
    if (addQty <= 0) {
      setError('សូមបញ្ចូលចំនួនធំជាង 0');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/products/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: product.barcode,
          quantity: parseInt(addQty, 10),
          costPrice: costPrice !== '' ? Number(costPrice) : undefined,
          price: sellPrice !== '' ? Number(sellPrice) : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to restock');

      playBeep('success');
      onSave(data.product);
      onClose();
    } catch (err) {
      setError(err.message);
      playBeep('error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewProduct = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('សូមបញ្ចូលឈ្មោះផលិតផល');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: scannedCode,
          name: name.trim(),
          category,
          costPrice: Number(newCostPrice) || 0,
          price: Number(newSellPrice) || 0,
          stock: Math.max(0, parseInt(initialStock, 10) || 0),
          minStockAlert: Math.max(1, parseInt(minStockAlert, 10) || 5)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create product');

      playBeep('success');
      if (onProductCreated) onProductCreated(data.product);
      onClose();
    } catch (err) {
      setError(err.message);
      playBeep('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-backdrop-in">
      <div className="bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto shadow-2xl animate-sheet-up">
        {/* iOS Handle Pill */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-2xl ${isExisting ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {isExisting ? <PackagePlus size={22} /> : <Sparkles size={22} />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isExisting ? 'បន្ថែមស្តុកទំនិញ (Add Stock)' : 'ចុះបញ្ជីទំនិញថ្មី (Register New)'}
              </h2>
              <p className="text-xs font-mono text-slate-500">
                កូដបារកូដ: <span className="text-blue-600 font-bold">{scannedCode}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isExisting ? (
          /* Restock Form for Existing Product */
          <form onSubmit={handleExistingRestock} className="space-y-4">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{product.name}</h3>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-slate-200 text-slate-600">
                    {product.category || 'ទូរស័ព្ទ'}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-500">ស្តុកបច្ចុប្បន្ន</div>
                  <div className="text-lg font-extrabold text-blue-600 font-mono">
                    {product.stock} <span className="text-xs text-slate-400 font-normal">គ្រឿង</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quantity Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ចំនួនត្រូវបន្ថែម (+)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAddQty(prev => Math.max(1, prev - 1))}
                  className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-lg font-bold flex items-center justify-center transition border border-slate-200"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={addQty}
                  onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="flex-1 h-12 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xl font-bold font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setAddQty(prev => prev + 1)}
                  className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-lg font-bold flex items-center justify-center transition border border-slate-200"
                >
                  +
                </button>
              </div>

              {/* Quick increment buttons */}
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[1, 5, 10, 20].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setAddQty(num)}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      addQty === num
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    +{num}
                  </button>
                ))}
              </div>
            </div>

            {/* Projected Stock Preview */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between text-xs">
              <span className="text-slate-700 font-medium">ស្តុកសរុបថ្មីបន្ទាប់ពីបន្ថែម:</span>
              <span className="font-extrabold font-mono text-emerald-600 text-sm">
                {(product.stock || 0) + (parseInt(addQty, 10) || 0)} គ្រឿង
              </span>
            </div>

            {/* Price Updates */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  តម្លៃដើម / ទិញចូល ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  តម្លៃលក់ចេញ ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                បោះបង់
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold transition shadow-md shadow-blue-600/30 flex items-center justify-center gap-1.5"
              >
                <Check size={16} />
                {saving ? 'កំពុងរក្សាទុក...' : `បញ្ជាក់បន្ថែម +${addQty}`}
              </button>
            </div>
          </form>
        ) : (
          /* Form for Brand New Product */
          <form onSubmit={handleCreateNewProduct} className="space-y-3.5">
            {autofilling && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-2.5 text-xs text-blue-700 animate-pulse">
                <Sparkles size={16} className="text-blue-600 shrink-0" />
                <div>
                  <p className="font-bold">កំពុងទាញយកព័ត៌មានស្វ័យប្រវត្តិ...</p>
                  <p className="text-[10px] text-blue-600">Autofilling product details from barcode</p>
                </div>
              </div>
            )}

            {autofillSuccess && !autofilling && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 animate-in fade-in">
                <Check size={16} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">បានស្វែងរកឃើញព័ត៌មានស្វ័យប្រវត្តិតាមបារកូដ!</p>
                  <p className="text-[10px] text-emerald-600">Autofilled complete product specifications</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ឈ្មោះផលិតផល *
              </label>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ឧ. Vaseline Collagen Moisture Lotion, iPhone..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ប្រភេទផលិតផល
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  តម្លៃទិញចូល ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newCostPrice}
                  onChange={(e) => setNewCostPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  តម្លៃលក់ ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newSellPrice}
                  onChange={(e) => setNewSellPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  ចំនួនស្តុកដំបូង
                </label>
                <input
                  type="number"
                  min="0"
                  value={initialStock}
                  onChange={(e) => setInitialStock(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  ព្រមានពេលស្តុកនៅសល់
                </label>
                <input
                  type="number"
                  min="1"
                  value={minStockAlert}
                  onChange={(e) => setMinStockAlert(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                បោះបង់
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold transition shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5"
              >
                <Check size={16} />
                {saving ? 'កំពុងរក្សាទុក...' : 'ចុះបញ្ជី & រក្សាទុក'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
