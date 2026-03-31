const fs = require('fs');
const file = 'src/pages/products/ProductsPage.tsx';
let c = fs.readFileSync(file, 'utf8');

const str1 = 'className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"';
const str2 = 'className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"';
const str3 = 'className="rounded-md bg-blue-700 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-800"';
const str4 = 'className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"';

const rxGlass = 'className="inline-flex min-h-[2rem] items-center justify-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/80 px-3 py-1 text-[11px] uppercase tracking-wider font-bold text-rose-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40"';
const bxGlass = 'className="inline-flex min-h-[2rem] items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-1 text-[11px] uppercase tracking-wider font-bold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"';

c = c.replaceAll(str1, rxGlass).replaceAll(str2, rxGlass).replaceAll(str3, bxGlass).replaceAll(str4, bxGlass);

fs.writeFileSync(file, c);
console.log('Replaced custom buttons with premium styling!');
