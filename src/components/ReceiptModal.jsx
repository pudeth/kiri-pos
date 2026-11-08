import React from 'react';
import { Printer, CheckCircle2, X, Share2 } from 'lucide-react';

export default function ReceiptModal({
  receipt,
  onClose,
  onNewSale
}) {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-backdrop-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto animate-sheet-up">
        
        {/* Success Icon */}
        <div className="text-center pb-2">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-50 text-emerald-600 mb-2">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">ការលក់បានជោគជ័យ!</h2>
          <p className="text-xs text-slate-500">ស្តុកទំនិញត្រូវបានកាត់ដោយស្វ័យប្រវត្តិ</p>
        </div>

        {/* Paper Receipt Simulation */}
        <div className="bg-slate-50 text-slate-900 rounded-2xl p-4 text-xs font-mono space-y-3 my-2 border border-slate-200">
          <div className="text-center border-b border-dashed border-slate-300 pb-2">
            <div className="font-extrabold text-sm uppercase tracking-wider text-slate-900 font-sans">
              Kiri.pos (KIRI POS)
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-sans">វិក្កយបត្រលក់ទំនិញ</div>
            <div className="text-[10px] text-slate-500">
              {new Date(receipt.createdAt).toLocaleString()}
            </div>
            <div className="text-[11px] font-bold text-blue-600 mt-1">
              វិក្កយបត្រលេខ: {receipt.receiptNo}
            </div>
          </div>

          {/* Items */}
          <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-2">
            {receipt.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start text-[11px]">
                <div className="flex-1 pr-2">
                  <div className="font-semibold text-slate-900 font-sans">{item.name}</div>
                  <div className="text-[10px] text-slate-500">
                    {item.quantity} x ${Number(item.price).toFixed(2)}
                  </div>
                </div>
                <div className="font-bold text-slate-900 font-mono">
                  ${Number(item.total).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>សរុប (Subtotal):</span>
              <span className="font-mono">${receipt.subtotal.toFixed(2)}</span>
            </div>
            {receipt.discount > 0 && (
              <div className="flex justify-between text-rose-600 font-semibold">
                <span>បញ្ចុះតម្លៃ (Discount):</span>
                <span className="font-mono">-${receipt.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-slate-300 text-slate-900">
              <span>សរុបរួម (TOTAL):</span>
              <span className="font-mono text-emerald-600 text-base">${receipt.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-600 pt-1">
              <span>បានបង់ ({receipt.paymentMethod.toUpperCase()}):</span>
              <span className="font-mono">${receipt.amountPaid.toFixed(2)}</span>
            </div>
            {receipt.paymentMethod === 'cash' && (
              <div className="flex justify-between text-[10px] font-bold text-emerald-700">
                <span>លុយអាប់:</span>
                <span className="font-mono">${receipt.change.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="text-center text-[10px] text-slate-500 border-t border-dashed border-slate-300 pt-2 font-sans">
            អតិថិជន: {receipt.customerName}<br />
            សូមអរគុណសម្រាប់ការទិញទំនិញ!
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-2xl flex items-center justify-center gap-1.5 transition border border-slate-200"
            >
              <Printer size={15} />
              បោះពុម្ព (Print)
            </button>
            <button
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-2xl transition border border-slate-200"
            >
              បិទ
            </button>
          </div>
          <button
            onClick={onNewSale}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-emerald-600/25 transition active:scale-[0.98]"
          >
            ចាប់ផ្តើមការលក់បន្ទាប់
          </button>
        </div>
      </div>
    </div>
  );
}
