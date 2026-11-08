/* Day's End Deals: the store page for ANY store id, in the store's own branding.
 * /s/<id> (served by 404.html for ids without their own file), /s/?id=<id>, and the per-store files all load this.
 * Live stores: the public store mirror in Firestore (stores/<id>, readable when visible) + its visible live deals.
 * Demo stores (pantrix, krm): built-in demo data. Anything else: "Store not found". */
(function () {
  var PROJECT = 'days-end-deals', KEY = ['AIza', 'SyAi71kPo8ynMhKsmPt5F63PqkIDzr8A_oY'].join('') /* Firebase web key: public by design, same as in the app */, MEDIA = 'https://daysenddeals-api.daysenddeals.workers.dev/media/';
  var FS = 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents';
  var DEMO = {"pantrix": {"name": "Pantrix", "address": "180 Hooper Street, Brooklyn, NY 11211", "phone": "+1 (929) 568-6780", "primary": "#E8742A", "logo": "/s/logo/pantrix.jpg", "logoBg": "#000000", "tagline": "Food, Distributed Smarter.", "hours": [["Sunday", "8:00 AM", "6:00 PM"], ["Monday", "9:00 AM", "6:00 PM"], ["Tuesday", "9:00 AM", "6:00 PM"], ["Wednesday", "9:00 AM", "6:00 PM"], ["Thursday", "9:00 AM", "8:00 PM"], ["Friday", "8:00 AM", "2:00 PM"], ["Saturday", "8:00 PM", "11:30 PM"]], "deals": [{"t": "Iced coffee", "s": "Cold brew with milk · 16 oz", "img": "https://zalmydev-max.github.io/p/p-icedcoffee.jpg", "was": 4.75, "now": 2.99}, {"t": "Tri-color cake", "s": "1 lb container · rainbow layers", "img": "https://zalmydev-max.github.io/p/p-tricolor.jpg", "was": 12.99, "now": 8.49}, {"t": "Chocolate babka", "s": "Whole loaf · baked this morning", "img": "https://zalmydev-max.github.io/p2/p-babka2.jpg", "was": 12.99, "now": 7.49}, {"t": "Cinnamon babka", "s": "Whole loaf · swirled with cinnamon", "img": "https://zalmydev-max.github.io/p/p-cinnamon.jpg", "was": 11.99, "now": 6.99}, {"t": "Rugelach, 1 lb container", "s": "Chocolate and cinnamon mix", "img": "https://zalmydev-max.github.io/p/p-rugbox.jpg", "was": 13.99, "now": 8.99}, {"t": "Rugelach (loose)", "s": "By the pound · pick your mix", "img": "https://zalmydev-max.github.io/p/p-rugelach.jpg", "was": 12.99, "now": 7.99}, {"t": "Fresh challah", "s": "Plain or sesame · baked this morning", "img": "https://zalmydev-max.github.io/p/p-challah.jpg", "was": 6.5, "now": 3.5}, {"t": "Black & white cookies", "s": "Big NYC-style cookies", "img": "https://zalmydev-max.github.io/p/p-blackwhite.jpg", "was": 3.25, "now": 1.99}]}, "krm": {"name": "KRM Kollel (demo)", "address": "100 Demo Ave, Brooklyn, NY 11219", "phone": "(718) 555-0100", "primary": "#0B3D91", "logo": "/s/logo/krm.png", "logoBg": "#FFFFFF", "tagline": "Demo store with made-up prices", "hours": [["Sunday", "8:30 AM", "8:00 PM"], ["Monday", "8:30 AM", "8:00 PM"], ["Tuesday", "8:30 AM", "8:00 PM"], ["Wednesday", "8:30 AM", "8:00 PM"], ["Thursday", "8:30 AM", "10:00 PM"], ["Friday", "8:30 AM", "12:00 PM"]], "deals": [{"t": "Dark Chicken Cutlets", "s": "(Family Pack) · per lb", "img": null, "was": 8.09, "now": 5.99}, {"t": "Chicken Thighs", "s": "(Family Pack) · per lb", "img": null, "was": 3.23, "now": 2.39}, {"t": "Chicken Drumsticks", "s": "(Family Pack) · per lb", "img": null, "was": 4.04, "now": 2.99}, {"t": "Chicken Cutlets", "s": "(Family Pack) · per lb", "img": null, "was": 9.17, "now": 6.79}, {"t": "Chicken Wings", "s": "(Family Pack) · per lb", "img": null, "was": 2.69, "now": 1.99}, {"t": "London Broil", "s": "Grain Finished · per lb", "img": null, "was": 13.49, "now": 9.99}, {"t": "Silver Tip Roast", "s": "Grain Finished · per lb", "img": null, "was": 16.19, "now": 11.99}, {"t": "Premium Pepper Steak", "s": "Grain Finished · per lb", "img": null, "was": 16.19, "now": 11.99}]}};
  var TEAL = '#006A62', INK = '#15181B';

  // ---------- color (same rules as the app's qrColors / onColor) ----------
  function rgb(c) { var h = c.slice(1); if (h.length === 3) h = h.replace(/./g, '$&$&'); return [0, 2, 4].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }
  function lum(c) { return rgb(c).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce(function (a, v, i) { return a + v * [0.2126, 0.7152, 0.0722][i]; }, 0); }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function safe(c, f) { return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c || '') ? c : f; }
  function onColor(bg) { return contrast(bg, '#FFFFFF') >= contrast(bg, INK) ? '#FFFFFF' : INK; }
  function readable(c) { // the brand color if it reads on white (4.5:1), else a darker shade of it, else ink
    c = safe(c, INK); if (contrast(c, '#FFFFFF') >= 4.5) return c;
    var v = rgb(c); for (var i = 0; i < 14; i++) { v = v.map(function (x) { return Math.round(x * 0.88); }); var h = '#' + v.map(function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); if (contrast(h, '#FFFFFF') >= 4.5) return h; }
    return INK;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function money(n) { n = Number(n); return isFinite(n) ? '$' + (Number.isInteger(n) ? n : n.toFixed(2)) : ''; }
  function media(p) { if (!p || typeof p !== 'string') return null; if (/^https:\/\//.test(p) || p.charAt(0) === '/') return p; return MEDIA + p.replace(/^\/+/, ''); }

  // ---------- id ----------
  var q = new URLSearchParams(location.search);
  var m = location.pathname.replace(/\/+$/, '').match(/^\/s\/([A-Za-z0-9_-]{1,64})(?:\.html)?$/);
  var id = (q.get('id') || (m && m[1]) || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  var root = document.getElementById('store');

  // ---------- Firestore REST (public, read-only) ----------
  function val(v) {
    if (!v) return null;
    if ('stringValue' in v) return v.stringValue; if ('integerValue' in v) return Number(v.integerValue); if ('doubleValue' in v) return v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue; if ('timestampValue' in v) return Date.parse(v.timestampValue); if ('nullValue' in v) return null;
    if ('mapValue' in v) return obj(v.mapValue.fields || {}); if ('arrayValue' in v) return (v.arrayValue.values || []).map(val);
    return null;
  }
  function obj(f) { var o = {}; for (var k in f) o[k] = val(f[k]); return o; }
  function liveStore(id) {
    return fetch(FS + '/stores/' + encodeURIComponent(id) + '?key=' + KEY).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !d.fields) return null; var s = obj(d.fields); if (s.visible !== true) return null;
      var b = s.branding || {};
      return { name: s.name || s.orgName || 'Store', address: s.address || '', phone: s.phone || '', hours: s.hours, primary: b.primary, logo: media(b.logoUrl || b.logoPath), logoBg: b.logoBg || '#FFFFFF', live: true };
    });
  }
  function liveDeals(id) {
    var body = { structuredQuery: { from: [{ collectionId: 'deals' }], where: { compositeFilter: { op: 'AND', filters: [
      { fieldFilter: { field: { fieldPath: 'locationId' }, op: 'EQUAL', value: { stringValue: id } } },
      { fieldFilter: { field: { fieldPath: 'visible' }, op: 'EQUAL', value: { booleanValue: true } } }] } }, limit: 60 } };
    return fetch(FS + ':runQuery?key=' + KEY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.ok ? r.json() : []; }).then(function (rows) {
        var now = Date.now();
        return (rows || []).filter(function (r) { return r.document; }).map(function (r) { return obj(r.document.fields || {}); })
          .filter(function (d) { return d.status === 'live' && (!d.endsAt || d.endsAt > now); })
          .map(function (d) { return { t: d.title, s: d.sub, img: media((d.photos || [])[0]), was: d.priceWas, now: d.priceNow, ends: d.endsAt }; });
      }).catch(function () { return []; });
  }

  // ---------- page ----------
  function todayHours(h) {
    if (!Array.isArray(h)) return typeof h === 'string' ? h : '';
    var day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
    for (var i = 0; i < h.length; i++) { var x = h[i]; var d = Array.isArray(x) ? x[0] : x && x.day; if (d === day) { var o = Array.isArray(x) ? x[1] : x.open, c = Array.isArray(x) ? x[2] : x.close; return o && c && !(x && x.closed) ? 'Open today ' + o + ' to ' + c : 'Closed today'; } }
    return 'Closed today';
  }
  function appLink(id) {
    var back = location.origin + '/s/' + id + '?noapp=1';
    return 'intent://s/' + id + '#Intent;scheme=daysenddeals;package=com.daysenddeals.app;S.browser_fallback_url=' + encodeURIComponent(back) + ';end';
  }
  function render(s, deals) {
    var brand = safe(s.primary, TEAL), on = onColor(brand), ink = readable(brand);
    document.title = s.name + (deals.length ? ' \u00b7 ' + deals.length + ' deals tonight' : '') + " \u00b7 Day's End Deals";
    var tm = document.querySelector('meta[name=theme-color]'); if (tm) tm.setAttribute('content', brand);
    document.documentElement.style.setProperty('--brand', brand); document.documentElement.style.setProperty('--on', on); document.documentElement.style.setProperty('--ink', ink);
    var logo = s.logo ? '<span class="logo" style="background:' + esc(safe(s.logoBg, '#FFFFFF')) + '"><img src="' + esc(s.logo) + '" alt=""></span>'
      : '<span class="logo initials">' + esc(s.name.replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 3).toUpperCase()) + '</span>';
    var hours = todayHours(s.hours);
    var html = '<header class="band">' + logo + '<div class="who"><h1>' + esc(s.name) + '</h1>' + (s.tagline ? '<p>' + esc(s.tagline) + '</p>' : '') + '</div></header><div class="w">';
    html += '<div class="facts">' + (s.address ? '<a class="fact" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.address) + '">' + esc(s.address) + '</a>' : '')
      + (hours ? '<div class="fact">' + esc(hours) + '</div>' : '') + (s.phone ? '<a class="fact" href="tel:' + esc(String(s.phone).replace(/[^+\d]/g, '')) + '">' + esc(s.phone) + '</a>' : '') + '</div>';
    if (/Android/i.test(navigator.userAgent) && !q.get('noapp')) html += '<a class="btn" href="' + appLink(id) + '">Open in the app</a>';
    if (q.get('noapp')) html += '<p class="muted">The Day\u2019s End Deals app isn\u2019t on this phone yet. Tonight\u2019s deals are below.</p>';
    html += '<h2>' + (deals.length ? 'Tonight\u2019s deals' : 'No deals posted right now') + '</h2>';
    if (!deals.length) html += '<p class="muted">Deals show up here in the evening, before the store closes.</p>';
    deals.forEach(function (d) {
      var pct = d.was > 0 && d.now < d.was ? Math.round((1 - d.now / d.was) * 100) : 0;
      html += '<div class="deal">' + (d.img ? '<img src="' + esc(d.img) + '" alt="" loading="lazy">' : '<div class="noimg">' + esc((d.t || '?').charAt(0)) + '</div>')
        + '<div class="b"><div class="t">' + esc(d.t) + '</div>' + (d.s ? '<div class="muted">' + esc(d.s) + '</div>' : '')
        + '<div class="p"><span class="now">' + money(d.now) + '</span>' + (d.was > d.now ? '<span class="was">' + money(d.was) + '</span>' : '') + (pct ? '<span class="pct">' + pct + '% off</span>' : '') + '</div></div></div>';
    });
    if (s.demo) html += '<p class="muted small">Demo store with made-up deals.</p>';
    html += '</div>';
    root.innerHTML = html;
  }
  function notFound() {
    document.title = "Store not found \u00b7 Day's End Deals";
    root.innerHTML = '<header class="band"><span class="logo initials">?</span><div class="who"><h1>Store not found</h1></div></header><div class="w">'
      + '<p>We couldn\u2019t find this store. The code may be old, or the store isn\u2019t on Day\u2019s End Deals yet.</p><a class="btn" href="/">Go to the home page</a></div>';
  }
  if (!id) return notFound();
  var demo = DEMO[id.toLowerCase()];
  if (demo) { demo.demo = /demo/i.test(demo.name); return render(demo, demo.deals || []); }
  root.innerHTML = '<div class="w"><p class="muted">Loading the store\u2026</p></div>';
  liveStore(id).then(function (s) { if (!s) return notFound(); return liveDeals(id).then(function (d) { render(s, d); }); }).catch(notFound);
})();
