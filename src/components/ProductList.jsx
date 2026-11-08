import React, { useState } from 'react';
import { Search, Plus, AlertTriangle, Package, Edit, Trash2, Filter } from 'lucide-react';

export default function ProductList({
  products,
  onSelectProduct,
  onAddNewProduct,
  onQuickAdjustStock,
  onDeleteProduct
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'low' | 'out'

  const filtered = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.toLowerCase().includes(search.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (filter === 'low') {
      return p.stock > 0 && p.stock <= (p.minStockAlert || 5);
    }
    if (filter === 'out') {
      return p.stock === 0;
    }
    return true;
  });

  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= (p.minStockAlert || 5)).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;

  return (
    <div className="space-y-3.5">
      {/* Search & Actions Bar (Clean Light Mode) */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ស្វែងរកតាមឈ្មោះ ឬកូដបារកូដ..."
            className="w-full bg-white border border-slate-200 rounded-2xl pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={onAddNewProduct}
          className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm shrink-0 flex items-center justify-center"
          title="បន្ថែមទំនិញថ្មី (Add New Product)"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Filter Tabs (Clean Light Mode) */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setFilter('all')}
          className={`py-1.5 px-3 rounded-xl font-semibold whitespace-nowrap transition shadow-sm ${
            filter === 'all'
              ? 'bg-blue-600 text-white border border-blue-600'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          ទាំងអស់ ({products.length})
        </button>
        <button
          onClick={() => setFilter('low')}
          className={`py-1.5 px-3 rounded-xl font-semibold whitespace-nowrap transition flex items-center gap-1.5 shadow-sm ${
            filter === 'low'
              ? 'bg-amber-500 text-white border border-amber-500'
              : 'bg-white border border-slate-200 text-amber-600 hover:bg-amber-50'
          }`}
        >
          <AlertTriangle size={13} />
          ជិតអស់ស្តុក ({lowStockCount})
        </button>
        <button
          onClick={() => setFilter('out')}
          className={`py-1.5 px-3 rounded-xl font-semibold whitespace-nowrap transition shadow-sm ${
            filter === 'out'
              ? 'bg-rose-600 text-white border border-rose-600'
              : 'bg-white border border-slate-200 text-rose-600 hover:bg-rose-50'
          }`}
        >
          អស់ពីស្តុក ({outOfStockCount})
        </button>
      </div>

      {/* Products List (Clean Light Mode Cards) */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 shadow-sm">
          <Package size={36} className="mx-auto mb-2 text-slate-400 stroke-[1.5]" />
          <p className="text-sm font-semibold text-slate-700">រកមិនឃើញទំនិញទេ</p>
          <p className="text-xs text-slate-400 mt-1">សូមសាកល្បងស្វែងរកម្តងទៀត ឬបន្ថែមទំនិញថ្មី</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((prod) => {
            const isOutOfStock = prod.stock === 0;
            const isLowStock = prod.stock > 0 && prod.stock <= (prod.minStockAlert || 5);

            return (
              <div
                key={prod.id || prod.barcode}
                className="p-3.5 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 transition flex items-center justify-between gap-3 shadow-sm"
              >
                {/* Product Info */}
                <div
                  onClick={() => onSelectProduct(prod)}
                  className="flex-1 min-w-0 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-xs truncate">{prod.name}</h4>
                    {isOutOfStock && (
                      <span className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-full font-bold border border-rose-200">
                        អស់
                      </span>
                    )}
                    {isLowStock && (
                      <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full font-bold border border-amber-200">
                        ជិតអស់
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                    <span className="font-mono text-blue-600 font-bold">${Number(prod.price).toFixed(2)}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono text-slate-400 truncate max-w-[120px]">កូដ: {prod.barcode}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">{prod.category || 'ទូរស័ព្ទ'}</span>
                  </div>
                </div>

                {/* Stock Badge & Quick Adjust */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 font-medium">ស្តុក</div>
                    <div className={`font-mono text-sm font-bold ${
                      isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {prod.stock} គ្រឿង
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => onQuickAdjustStock(prod.barcode, 1)}
                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-bold flex items-center justify-center transition border border-slate-200"
                      title="បន្ថែម +1 ស្តុក"
                    >
                      +
                    </button>
                    <button
                      onClick={() => onQuickAdjustStock(prod.barcode, -1)}
                      disabled={prod.stock <= 0}
                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-rose-600 hover:text-white disabled:opacity-30 text-slate-700 text-xs font-bold flex items-center justify-center transition border border-slate-200"
                      title="បន្ថយ -1 ស្តុក"
                    >
                      -
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
