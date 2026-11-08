import React from 'react';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, AlertTriangle } from 'lucide-react';

export default function POSCart({
  cart,
  products,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onCheckout
}) {
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Check if any cart item exceeds available inventory
  const stockErrors = cart.filter(item => {
    const prod = products.find(p => p.id === item.productId || p.barcode === item.barcode);
    return !prod || prod.stock < item.quantity;
  });

  const hasStockError = stockErrors.length > 0;

  if (cart.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 shadow-sm">
        <ShoppingCart size={36} className="mx-auto mb-2 text-slate-400 stroke-[1.5]" />
        <p className="text-sm font-semibold text-slate-700">កន្ត្រកនៅទទេ (Cart is Empty)</p>
        <p className="text-xs text-slate-400 mt-1">ស្កេនបារកូដដើម្បីបន្ថែមទំនិញចូលកន្ត្រកលក់</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
      {/* Cart Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart size={18} className="text-blue-600" />
          <h3 className="font-bold text-slate-800 text-sm">
            កន្ត្រកទំនិញបច្ចុប្បន្ន <span className="text-blue-600 font-mono">({totalItemCount})</span>
          </h3>
        </div>
        <button
          onClick={onClearCart}
          className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold transition"
        >
          <Trash2 size={14} />
          សម្អាត (Clear)
        </button>
      </div>

      {/* Stock warning banner */}
      {hasStockError && (
        <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0 text-rose-600" />
          <span>ទំនិញមួយចំនួនក្នុងកន្ត្រកលើសពីចំនួនស្តុកជាក់ស្តែង!</span>
        </div>
      )}

      {/* Cart Item List */}
      <div className="divide-y divide-slate-100 max-h-[36vh] overflow-y-auto">
        {cart.map((item) => {
          const prod = products.find(p => p.id === item.productId || p.barcode === item.barcode);
          const currentStock = prod ? prod.stock : 0;
          const isOverStock = item.quantity > currentStock;

          return (
            <div key={item.barcode} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 text-xs truncate">{item.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono font-extrabold text-blue-600">
                    ${Number(item.price).toFixed(2)}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isOverStock ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-slate-100 text-slate-600'
                  }`}>
                    ស្តុក: {currentStock}
                  </span>
                </div>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onUpdateQty(item.barcode, item.quantity - 1)}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition border border-slate-200"
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center font-bold font-mono text-sm text-slate-900">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQty(item.barcode, item.quantity + 1)}
                  disabled={item.quantity >= currentStock}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 text-slate-700 flex items-center justify-center transition border border-slate-200"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Item Subtotal & Delete */}
              <div className="text-right pl-2">
                <div className="font-bold font-mono text-xs text-slate-900">
                  ${(item.price * item.quantity).toFixed(2)}
                </div>
                <button
                  onClick={() => onRemoveItem(item.barcode)}
                  className="text-slate-400 hover:text-rose-600 transition mt-1"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cart Summary & Checkout Bar */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>សរុបបណ្តោះអាសន្ន (Subtotal):</span>
          <span className="font-mono text-slate-900 font-bold">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-base font-extrabold text-slate-900">
          <span>ទឹកប្រាក់ត្រូវទូទាត់:</span>
          <span className="font-mono text-xl text-emerald-600">${subtotal.toFixed(2)}</span>
        </div>

        <button
          onClick={onCheckout}
          disabled={hasStockError || cart.length === 0}
          className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed active:scale-[0.98] text-white font-bold text-sm transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
        >
          <span>គិតលុយ (${subtotal.toFixed(2)})</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
