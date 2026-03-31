const fs = require('fs');
const file = 'src/pages/products/ProductsPage.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/className="([^"]*)border-b border-([a-z]+)-200 bg-\2-50( px-\d py-\d)?[^"]*"/g, (match, prefix, color) => {
    // If it's a known header block, we enforce high-res design
    if (color === 'gray' || color === 'slate' || color === 'sky' || color === 'amber' || color === 'cyan' || color === 'rose' || color === 'indigo' || color === 'violet') {
        const pre = prefix ? prefix.trim() + ' ' : '';
        return `className="${pre}border-b border-${color}-200/60 bg-${color}-50/50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-${color}-800 backdrop-blur-sm"`;
    }
    return match;
});

c = c.replace(/className="rounded-xl border border-([a-z]+)-200 bg-white shadow-sm/g, (match, p1) => {
    return `className="overflow-hidden rounded-2xl border border-${p1}-200/60 bg-white shadow-sm ring-1 ring-${p1}-900/5 transition-all hover:shadow-md`;
});

c = c.replace(/className="space-y-6 rounded-xl border border-slate-200 bg-white p-5/g, 'className="space-y-6 rounded-2xl border border-slate-200/60 bg-slate-50/30 p-5 sm:p-6 shadow-[inset_0_2px_15px_rgba(0,0,0,0.02)] ring-1 ring-slate-900/5');

c = c.replace(/\[&_input\]:border-slate-300/g, '[&_input]:border-slate-200/80 [&_input]:shadow-sm [&_input]:transition-all [&_input]:focus:border-indigo-400 [&_input]:focus:ring-2 [&_input]:focus:ring-indigo-100');
c = c.replace(/\[&_select\]:border-slate-300/g, '[&_select]:border-slate-200/80 [&_select]:shadow-sm [&_select]:transition-all [&_select]:focus:border-indigo-400 [&_select]:focus:ring-2 [&_select]:focus:ring-indigo-100');
c = c.replace(/\[&_textarea\]:border-slate-300/g, '[&_textarea]:border-slate-200/80 [&_textarea]:shadow-sm [&_textarea]:transition-all [&_textarea]:focus:border-indigo-400 [&_textarea]:focus:ring-2 [&_textarea]:focus:ring-indigo-100');

fs.writeFileSync(file, c);
console.log('Panels Upgraded!');
