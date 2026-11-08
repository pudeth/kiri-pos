import React, { useState } from 'react';
import { DollarSign, TrendingUp, ShoppingBag, Receipt, Calendar, CreditCard, Banknote, QrCode } from 'lucide-react';

export default function SalesHistory({
  sales,
  stats,
  onViewReceipt
}) {
  const [filterPeriod, setFilterPeriod] = useState('all'); // 'all' | 'today'

  const todayStr = new Date().toISOString().slice(0, 10);
  const displayedSales = filterPeriod === 'today'
    ? sales.filter(s => s.createdAt.startsWith(todayStr))
    : sales;

  return (
    <div className="space-y-4">
      {/* Overview Analytics Cards (Clean Light Mode) */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>លក់បានថ្ងៃនេះ</span>
            <DollarSign size={15} className="text-emerald-600" />
          </div>
          <div className="text-lg font-black font-mono text-emerald-600">
            ${(stats?.todayRevenue || 0).toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {stats?.todaySalesCount || 0} ការលក់ • {stats?.todayItemsSold || 0} គ្រឿង
          </div>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>លក់សរុបទាំងអស់</span>
            <TrendingUp size={15} className="text-blue-600" />
          </div>
          <div className="text-lg font-black font-mono text-blue-600">
            ${(stats?.allTimeRevenue || 0).toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {stats?.allTimeSalesCount || 0} ប្រតិបត្តិការ
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterPeriod('all')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition shadow-sm ${
            filterPeriod === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          ប្រវត្តិទាំងអស់ ({sales.length})
        </button>
        <button
          onClick={() => setFilterPeriod('today')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition shadow-sm ${
            filterPeriod === 'today'
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          ថ្ងៃនេះ ({sales.filter(s => s.createdAt.startsWith(todayStr)).length})
        </button>
      </div>

      {/* Transactions List */}
      {displayedSales.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 shadow-sm">
          <Receipt size={36} className="mx-auto mb-2 text-slate-400 stroke-[1.5]" />
          <p className="text-sm font-semibold text-slate-700">មិនទាន់មានការលក់នៅឡើយទេ</p>
          <p className="text-xs text-slate-400 mt-1">ស្កេនទំនិញក្នុងផ្ទាំង "ការលក់" ដើម្បីចាប់ផ្តើមលក់!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedSales.map((sale) => (
            <div
              key={sale.id}
              onClick={() => onViewReceipt(sale)}
              className="p-3.5 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 cursor-pointer transition flex items-center justify-between gap-3 shadow-sm"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold font-mono text-xs text-slate-900">{sale.receiptNo}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 capitalize">
                    {sale.paymentMethod}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 mt-1 truncate">
                  {sale.customerName} • {sale.itemCount} មុខទំនិញ
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(sale.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-extrabold font-mono text-emerald-600">
                  ${Number(sale.total).toFixed(2)}
                </div>
                <span className="text-[10px] text-blue-600 hover:underline font-semibold">
                  មើលវិក្កយបត្រ
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
