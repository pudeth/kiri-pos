import React, { useState } from 'react';
import { Banknote, QrCode, CreditCard, Check, X, AlertCircle } from 'lucide-react';
import { playBeep } from './SoundEffects';

export default function CheckoutModal({
  cart,
  onClose,
  onCompleteSale
}) {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'qr' | 'card'
  const [discount, setDiscount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const numDiscount = Number(discount) || 0;
  const finalTotal = Math.max(0, subtotal - numDiscount);
  const numPaid = amountPaid !== '' ? Number(amountPaid) : finalTotal;
  const change = Math.max(0, numPaid - finalTotal);

  const handleQuickCash = (amt) => {
    setAmountPaid(String(amt));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (paymentMethod === 'cash' && numPaid < finalTotal) {
      setError(`ចំនួនលុយទទួល ($${numPaid.toFixed(2)}) តិចជាងចំនួនត្រូវទូទាត់ ($${finalTotal.toFixed(2)})`);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        items: cart,
        paymentMethod,
        discount: numDiscount,
        amountPaid: numPaid,
        customerName: customerName.trim() || 'អតិថិជនទូទៅ'
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete transaction');
      }

      playBeep('sale');
      onCompleteSale(data.receipt, data.updatedProducts);
    } catch (err) {
      setError(err.message);
      playBeep('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-backdrop-in">
      <div className="bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 max-h-[92vh] overflow-y-auto shadow-2xl animate-sheet-up">
        {/* iOS Handle Pill */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">ទូទាត់ប្រាក់ (Checkout)</h2>
            <p className="text-xs text-slate-500">ចំនួនទំនិញសរុប: {cart.reduce((s, i) => s + i.quantity, 0)} គ្រឿង</p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Order Summary Box */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>សរុបបណ្តោះអាសន្ន (Subtotal)</span>
              <span className="font-mono text-slate-900 font-bold">${subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">បញ្ចុះតម្លៃ Discount ($)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max={subtotal}
                placeholder="0.00"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-right font-mono text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
              <span className="text-sm font-bold text-slate-800">ចំនួនទឹកប្រាក់ត្រូវទូទាត់:</span>
              <span className="text-2xl font-black font-mono text-emerald-600">
                ${finalTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              វិធីសាស្ត្រទូទាត់ (Payment Method)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cash', label: 'សាច់ប្រាក់', icon: Banknote },
                { id: 'qr', label: 'QR Pay', icon: QrCode },
                { id: 'card', label: 'កាតធនាគារ', icon: CreditCard }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(id);
                    if (id !== 'cash') setAmountPaid(String(finalTotal));
                  }}
                  className={`py-3 px-2 rounded-2xl flex flex-col items-center gap-1.5 border text-xs font-bold transition active:scale-95 ${
                    paymentMethod === id
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cash Payment Calculations */}
          {paymentMethod === 'cash' && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  លុយទទួលពីភ្ញៀវ ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={finalTotal.toFixed(2)}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-lg font-bold font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Quick Cash Presets */}
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickCash(finalTotal)}
                  className="py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-blue-600 hover:bg-slate-50 shadow-sm"
                >
                  គ្រប់ចំនួន
                </button>
                {[Math.ceil(finalTotal / 5) * 5, Math.ceil(finalTotal / 10) * 10, Math.ceil(finalTotal / 20) * 20]
                  .filter((v, i, a) => v > finalTotal && a.indexOf(v) === i)
                  .slice(0, 3)
                  .map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleQuickCash(val)}
                      className="py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
                    >
                      ${val}
                    </button>
                  ))}
              </div>

              {/* Change return calculation */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex justify-between items-center">
                <span className="text-xs text-slate-700 font-medium">លុយអាប់ជូនភ្ញៀវ:</span>
                <span className={`text-lg font-mono font-black ${change >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  ${change.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* QR Pay info */}
          {paymentMethod === 'qr' && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
              <div className="w-28 h-28 mx-auto bg-white p-2 rounded-2xl border border-slate-200 flex items-center justify-center shadow-sm">
                <QrCode size={90} className="text-slate-900" />
              </div>
              <p className="text-xs text-slate-800 font-bold">ស្កេន KHQR ដើម្បីទូទាត់ប្រាក់</p>
              <p className="text-xs text-blue-600 font-mono font-bold">ចំនួន: ${finalTotal.toFixed(2)}</p>
            </div>
          )}

          {/* Customer Name */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              ឈ្មោះអតិថិជន / សម្គាល់ (Optional)
            </label>
            <input
              type="text"
              placeholder="ឧ. អតិថិជនទូទៅ / តុលេខ ១"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
            />
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
              disabled={submitting}
              className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold transition shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5"
            >
              <Check size={18} />
              {submitting ? 'កំពុងដំណើរការ...' : `បញ្ជាក់ការលក់ & កាត់ស្តុក`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
