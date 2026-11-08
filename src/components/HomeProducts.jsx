import React, { useState } from 'react';
import { 
  Smartphone, 
  RotateCcw, 
  Headphones, 
  LayoutGrid, 
  Package, 
  ShoppingCart, 
  ShoppingBag, 
  Coins, 
  Search, 
  ScanLine, 
  SlidersHorizontal, 
  MoreVertical,
  Plus,
  Bell,
  User,
  Check,
  TrendingUp,
  Tag,
  Sparkles,
  Activity,
  Coffee,
  HeartHandshake
} from 'lucide-react';

export default function HomeProducts({
  products,
  stats,
  onOpenScanner,
  onAddToCart,
  onRestockProduct,
  onEditProduct,
  onAddNewProduct
}) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Exchange rate USD -> KHR (4,000 Riel = $1)
  const KHR_RATE = 4000;

  // Dynamically extract categories STRICTLY from scanned products in inventory
  const uniqueProductCats = Array.from(
    new Set(products.map(p => (p.category || '').trim()).filter(Boolean))
  );

  // Intelligent icon assigner for auto-created categories
  const getCategoryIcon = (catName) => {
    const name = String(catName || '').toLowerCase();
    if (name.includes('សម្អាង') || name.includes('ស្បែក') || name.includes('cosmetic') || name.includes('beauty')) return Sparkles;
    if (name.includes('ឱសថ') || name.includes('សុខភាព') || name.includes('health') || name.includes('pharmacy')) return Activity;
    if (name.includes('ភេសជ្ជៈ') || name.includes('កាហ្វេ') || name.includes('drink') || name.includes('beverage')) return Coffee;
    if (name.includes('ទូរស័ព្ទ') || name.includes('phone')) return Smartphone;
    if (name.includes('គ្រឿងបន្លាស់') || name.includes('case') || name.includes('accessory')) return Headphones;
    return Package;
  };

  // Pure dynamic categories list: All + whatever categories exist in products
  const dynamicCategories = [
    { id: 'all', nameKh: 'ទាំងអស់', icon: LayoutGrid },
    ...uniqueProductCats.map(cat => ({
      id: `cat-${cat}`,
      nameKh: cat,
      matchKey: cat,
      icon: getCategoryIcon(cat)
    }))
  ];

  // Counts for each category
  const getCatCount = (cat) => {
    if (cat.id === 'all') return products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const key = cat.matchKey || cat.nameKh;
    return products
      .filter(p => (p.category || '').toLowerCase() === key.toLowerCase())
      .reduce((sum, p) => sum + (p.stock || 0), 0);
  };

  // Filtered products list
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedCategory === 'all') return true;
    const cat = dynamicCategories.find(c => c.id === selectedCategory);
    const key = cat?.matchKey || cat?.nameKh;
    return key ? (p.category || '').toLowerCase() === key.toLowerCase() : true;
  });

  const totalStockUnits = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const totalStockValue = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0);

  // Format currency helpers
  const formatUSD = (val) => `$${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const formatKHR = (usdVal) => `${Number((usdVal || 0) * KHR_RATE).toLocaleString('en-US')} ៛`;

  const getBadgeStyle = (badge, cat) => {
    const b = (badge || cat || '').toLowerCase();
    if (b.includes('ថ្មី') || b.includes('new')) {
      return 'bg-blue-600 text-white';
    }
    if (b.includes('មួយទឹក') || b.includes('used')) {
      return 'bg-amber-500 text-white';
    }
    return 'bg-indigo-500 text-white';
  };

  return (
    <div className="space-y-4 pb-6">
      
      {/* 1. Header (Royal Blue matching image) */}
      <div className="-mx-4 -mt-4 bg-gradient-to-b from-blue-700 via-blue-600 to-blue-700 px-5 pt-6 pb-8 text-white rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-inner">
              <Smartphone size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-tight">
                Kiri.pos
              </h1>
              <p className="text-xs text-blue-100/90 font-medium">
                គ្រប់គ្រងស្តុក និងការលក់
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert('ប្រព័ន្ធដំណើរការធម្មតា (System Normal)')}
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white relative transition"
            >
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-blue-600" />
            </button>
            <div className="w-9 h-9 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold text-sm shadow">
              <User size={18} />
            </div>
          </div>
        </div>

        {/* Search Bar with integrated Scan button */}
        <div className="mt-5 relative">
          <div className="bg-white rounded-2xl shadow-xl flex items-center px-4 py-3 text-slate-800">
            <Search size={18} className="text-slate-400 mr-2.5 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ស្វែងរកផលិតផល (ឈ្មោះ, ម៉ូដែល, កូដ...)"
              className="w-full text-xs text-slate-900 placeholder-slate-400 bg-transparent border-0 outline-none border-none focus:outline-none shadow-none"
              style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
            />
            <button
              onClick={onOpenScanner}
              className="p-1 text-blue-600 hover:text-blue-800 transition shrink-0 border-l border-slate-200 pl-2.5 ml-1"
              title="បើកម៉ាស៊ីនស្កេន (Open Scanner)"
            >
              <ScanLine size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Retail Barcode Category Cards (Purely Dynamic - Auto-Created on Scan) */}
      {dynamicCategories.length > 1 ? (
        <div className="flex gap-2.5 overflow-x-auto pb-1.5 pt-1 no-scrollbar animate-in fade-in">
          {dynamicCategories.map((cat) => {
            const Icon = cat.icon || Tag;
            const isActive = selectedCategory === cat.id;
            const count = getCatCount(cat);

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`min-w-[85px] flex-1 px-3 py-2.5 rounded-2xl flex flex-col items-center justify-center transition shadow-sm border shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/30'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
              >
                <div className={`p-2 rounded-xl mb-1 ${isActive ? 'bg-white/20' : 'bg-blue-50 text-blue-600'}`}>
                  <Icon size={18} />
                </div>
                <span className="text-[11px] font-semibold text-center leading-tight whitespace-nowrap">
                  {cat.nameKh}
                </span>
                <span className={`text-[10px] font-mono mt-0.5 ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {/* 3. Summary Metric Cards (2x2 Grid) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Total Stock */}
        <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Package size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-slate-500 block leading-tight">ស្តុកសរុប</span>
            <span className="text-base font-extrabold text-slate-900 font-mono">
              {totalStockUnits}
            </span>
          </div>
        </div>

        {/* Stock Value */}
        <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShoppingCart size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-slate-500 block leading-tight">តម្លៃសរុបស្តុក</span>
            <span className="text-base font-extrabold text-emerald-600 font-mono truncate block">
              {formatUSD(totalStockValue)}
            </span>
          </div>
        </div>

        {/* Today's Sales */}
        <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <ShoppingBag size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-slate-500 block leading-tight">លក់ថ្ងៃនេះ</span>
            <span className="text-base font-extrabold text-indigo-600 font-mono block">
              {formatUSD(stats?.todayRevenue ?? 0)}
            </span>
          </div>
        </div>

        {/* Today's Profit */}
        <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Coins size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-slate-500 block leading-tight">ចំណេញថ្ងៃនេះ</span>
            <span className="text-base font-extrabold text-amber-600 font-mono block">
              {formatUSD(stats?.todayProfit ?? 0)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Product List Section Header */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-sm font-bold text-slate-900">
          បញ្ជីផលិតផល <span className="text-slate-500 font-mono">({filteredProducts.length})</span>
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onAddNewProduct}
            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
          >
            <Plus size={14} />
            <span>ថែមថ្មី</span>
          </button>
          <button
            onClick={() => alert('តម្រៀបតាមតម្លៃ ឬចំនួនស្តុក')}
            className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-600 flex items-center gap-1 transition shadow-sm"
          >
            <SlidersHorizontal size={13} />
            <span>តម្រៀប/ចម្រោះ</span>
          </button>
        </div>
      </div>

      {/* 5. Product Cards List */}
      <div className="space-y-2.5">
        {filteredProducts.map((prod) => (
          <div
            key={prod.id || prod.barcode}
            className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-blue-300 transition flex items-center justify-between gap-3 relative"
          >
            {/* Thumbnail Image */}
            <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
              {prod.image ? (
                <img
                  src={prod.image}
                  alt={prod.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <Smartphone size={24} className="text-slate-400" />
              )}
            </div>

            {/* Product Meta Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-slate-900 text-xs truncate">
                  {prod.name}
                </h3>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${getBadgeStyle(prod.badge, prod.category)}`}>
                  {prod.badge || 'ថ្មី'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 truncate">
                <span className="font-mono">កូដ: {prod.barcode}</span>
                <span>|</span>
                <span>{prod.condition ? prod.condition : `ប្រភេទ: ${prod.category || 'ទូរស័ព្ទ'}`}</span>
              </div>

              {/* Price & Stock Display on Mobile */}
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-sm font-extrabold text-blue-600 font-mono">
                  ${Number(prod.price).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  (≈ {formatKHR(prod.price)})
                </span>
              </div>
            </div>

            {/* Right Side: Stock Badge & 3-Dots Menu */}
            <div className="flex flex-col items-end justify-between h-14 shrink-0">
              {/* Actions Dropdown Toggle */}
              <div className="relative">
                <button
                  onClick={() => setActiveMenuId(activeMenuId === prod.barcode ? null : prod.barcode)}
                  className="p-1 text-slate-400 hover:text-slate-700 transition rounded-lg hover:bg-slate-100"
                >
                  <MoreVertical size={16} />
                </button>

                {/* Popover Action Menu */}
                {activeMenuId === prod.barcode && (
                  <div className="absolute right-0 top-6 z-20 w-36 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs animate-in fade-in">
                    <button
                      onClick={() => {
                        onAddToCart(prod);
                        setActiveMenuId(null);
                      }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                    >
                      <ShoppingCart size={14} className="text-blue-600" />
                      <span>ដាក់ក្នុងកន្ត្រក (Sell)</span>
                    </button>
                    <button
                      onClick={() => {
                        onRestockProduct(prod);
                        setActiveMenuId(null);
                      }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                    >
                      <Package size={14} className="text-emerald-600" />
                      <span>បន្ថែមស្តុក (Stock)</span>
                    </button>
                    <button
                      onClick={() => {
                        onEditProduct(prod);
                        setActiveMenuId(null);
                      }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                    >
                      <Tag size={14} className="text-slate-600" />
                      <span>កែប្រែ (Edit)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Stock Quantity Badge */}
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                prod.stock > 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                ស្តុក: {prod.stock} គ្រឿង
              </span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
