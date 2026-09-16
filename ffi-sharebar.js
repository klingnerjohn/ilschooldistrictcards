/* ─────────────────────────────────────────────────────────────
   ffi-sharebar.js — page-side share plumbing for FightForIllinois.org
   Host at: https://klingnerjohn.github.io/ilschooldistrictcards/ffi-sharebar.js

   Add to ANY data page. It finds every element with class "ffi-share",
   reads its data-share-* attributes, and turns it into a real link to
   the universal /share/ page, which draws the card and hands off to the
   phone's own share/save options.

   Usage on a topic page:
     <button class="ffi-share" type="button"
             data-share-pre="Illinois Pensions"
             data-share-num="$1.2M"
             data-share-label="is the average career pension for a retired superintendent"
             data-share-source="Source: Illinois TRS, 2024"></button>
     <script src="https://klingnerjohn.github.io/ilschooldistrictcards/ffi-sharebar.js"></script>

   Supported attributes (all optional except one of num / rank / rows):
     data-share-pre      small orange eyebrow above the stat
     data-share-num      the big number ("39%", "$1.2M")
     data-share-only     the word "Only" above the number
     data-share-label    caption under the number
     data-share-rank     ranking value ("#7")
     data-share-rank-of  qualifier under a rank ("of 3,136 counties")
     data-share-title    headline for table cards
     data-share-rows     JSON array of rows, e.g. '[["2010","$13,219"],["2024","$23,718"]]'
     data-share-bars     JSON array of [label, value] pairs drawn as a bar chart,
                         e.g. '[["2019","$17,607"],["2025","$25,646"]]' (last bar orange)
     data-share-hed      headline for bar cards
     data-share-bubble   change circle, e.g. "Up 79%"
     data-share-contrast a rebuttal line under the caption, e.g. "...yet only 39% read at grade level."
     data-share-source   source line printed at the bottom of the card
     data-share-icon     CSS selector for an <svg> on the page to draw on the card

   Optional page hook for pages whose stats change after load (e.g. a
   district picker): define window.FFI_SHARE_RESOLVE = function(btn, payload)
   and mutate/return the payload right before the link is built.
   ───────────────────────────────────────────────────────────── */
(function(){
  var SHARE_PAGE = window.FFI_SHARE_URL || 'https://fightforillinois.org/share/';

  function b64(str){
    try { return btoa(unescape(encodeURIComponent(str))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
    catch(e){ return ''; }
  }
  function payloadOf(btn){
    var g = function(k){ return btn.getAttribute('data-share-' + k) || ''; };
    var rows = null;
    try { rows = g('rows') ? JSON.parse(g('rows')) : null; } catch(e){}
    var bars = null;
    try { bars = g('bars') ? JSON.parse(g('bars')) : null; } catch(e){}
    var svgStr = '';
    var sel = g('icon');
    if (sel) {
      var el = document.querySelector(sel);
      if (el) { try { svgStr = new XMLSerializer().serializeToString(el); } catch(e){} }
    }
    var p = {
      pre: g('pre'), num: g('num'), only: g('only'), label: g('label'),
      rank: g('rank'), rankOf: g('rank-of'), title: g('title'),
      rows: rows, bars: bars, hed: g('hed'), bubble: g('bubble'), contrast: g('contrast'), source: g('source'), svgStr: svgStr
    };
    if (typeof window.FFI_SHARE_RESOLVE === 'function') {
      p = window.FFI_SHARE_RESOLVE(btn, p) || p;
    }
    return p;
  }
  function urlFor(btn){ return SHARE_PAGE + '#c=' + b64(JSON.stringify(payloadOf(btn))); }

  /* Share a finished card in one tap. Order: the Fight for Illinois app, then
     the phone browser's share sheet, then a download, then the share page. */
  /* Show the finished card and let the user confirm before the share sheet opens.
     The Share button runs in its own tap, so the native share still works. */
  function shareCard(blob, opts){
    opts = opts || {};
    if (window.FFI_SHARE_PREVIEW === false) { shareNow(blob, opts); return; }
    var old = document.getElementById('ffi-share-preview');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var url = null;
    try { url = URL.createObjectURL(blob); } catch (e) {}
    var ov = document.createElement('div');
    ov.id = 'ffi-share-preview';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'Preview your card before sharing');
    ov.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;z-index:100000;background:rgba(19,41,75,0.94);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:24px;font-family:Montserrat,sans-serif;-webkit-tap-highlight-color:transparent;';
    var img = document.createElement('img');
    img.alt = 'Your Fight for Illinois card';
    if (url) img.src = url;
    img.style.cssText = 'max-width:min(420px,86vw);max-height:56vh;width:auto;height:auto;border-radius:10px;box-shadow:0 18px 50px rgba(0,0,0,0.45);background:#fff;';
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;justify-content:center;align-items:center;';
    function mk(label, primary){
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.cssText = 'font-family:Montserrat,sans-serif;font-weight:800;font-size:15px;letter-spacing:0.03em;text-transform:uppercase;border-radius:6px;padding:14px 26px;min-height:48px;cursor:pointer;border:2px solid ' + (primary ? '#fe5f05' : 'rgba(255,255,255,0.7)') + ';background:' + (primary ? '#fe5f05' : 'transparent') + ';color:#fff;';
      return b;
    }
    var shareBtn = mk('Share', true);
    var saveBtn = mk('Save image', false);
    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'font-family:Montserrat,sans-serif;font-weight:700;font-size:14px;background:none;border:0;color:rgba(255,255,255,0.8);text-decoration:underline;padding:10px 14px;min-height:44px;cursor:pointer;';
    function onKey(e){ if (e.key === 'Escape' || e.keyCode === 27) close(); }
    function close(){
      document.removeEventListener('keydown', onKey);
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      if (url) setTimeout(function(){ try { URL.revokeObjectURL(url); } catch (e) {} }, 1500);
    }
    shareBtn.addEventListener('click', function(){ close(); shareNow(blob, opts); });
    saveBtn.addEventListener('click', function(){
      close();
      shareNow(blob, { filename: opts.filename, title: opts.title, fallbackUrl: opts.fallbackUrl, mode: 'download' });
    });
    cancelBtn.addEventListener('click', close);
    ov.addEventListener('click', function(e){ if (e.target === ov) close(); });
    document.addEventListener('keydown', onKey);
    row.appendChild(shareBtn);
    row.appendChild(saveBtn);
    ov.appendChild(img);
    ov.appendChild(row);
    ov.appendChild(cancelBtn);
    document.body.appendChild(ov);
    /* Android Chrome may not composite the new fixed layer until the next input
       event - the card would appear only after the user scrolls. Force frames. */
    function kick(){
      ov.style.transform = 'translateZ(0)';
      void ov.offsetHeight;
      if (window.requestAnimationFrame) {
        requestAnimationFrame(function(){
          ov.style.opacity = '0.999';
          void ov.offsetHeight;
          requestAnimationFrame(function(){ ov.style.opacity = ''; ov.style.transform = ''; });
        });
      }
    }
    kick();
    if (!img.complete) { img.addEventListener('load', kick); img.addEventListener('error', kick); }
    setTimeout(kick, 60);
    setTimeout(kick, 240);
    try { shareBtn.focus(); } catch (e) {}
  }
  function shareNow(blob, opts){
    opts = opts || {};
    var name = opts.filename || 'fight-for-illinois.png';
    var title = opts.title || 'Fight for Illinois';
    var fallbackUrl = opts.fallbackUrl || '';
    var file = null;
    try { file = new File([blob], name, { type: 'image/png' }); } catch (e) {}
    function toast(msg){
      var t = document.createElement('div');
      t.textContent = msg;
      t.setAttribute('role', 'status');
      t.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:99999;background:#13294b;color:#fff;font-family:Montserrat,sans-serif;font-weight:700;font-size:14px;line-height:1.4;padding:12px 18px;border-radius:6px;box-shadow:0 8px 24px rgba(19,41,75,0.35);max-width:min(340px,86vw);text-align:center;';
      document.body.appendChild(t);
      setTimeout(function(){ if (t.parentNode) t.parentNode.removeChild(t); }, 2600);
    }
    function readDataUrl(cb){
      try {
        var fr = new FileReader();
        fr.onload = function(){ cb(String(fr.result)); };
        fr.onerror = function(){ cb(null); };
        fr.readAsDataURL(blob);
      } catch (e) { cb(null); }
    }
    function inAppBrowser(){
      var ua = navigator.userAgent || '';
      return /FBAN|FBAV|Instagram|Line\/|GSA\//i.test(ua) || /; wv\)/.test(ua);
    }
    function openElsewhere(){
      if (fallbackUrl) window.open(fallbackUrl, '_blank', 'noopener');
      else toast('Press and hold the image to save or share it.');
    }
    function download(){
      readDataUrl(function(dataUrl){
        var a = document.createElement('a');
        if (!dataUrl || !('download' in a)) { openElsewhere(); return; }
        a.href = dataUrl;
        a.download = name;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast('Saved to your downloads.');
      });
    }
    if (window.FFI_APP && typeof window.FFI_APP.shareImage === 'function') {
      readDataUrl(function(dataUrl){
        if (!dataUrl) { openElsewhere(); return; }
        var p = window.FFI_APP.shareImage(dataUrl, name);
        if (p && p['catch']) p['catch'](function(){});
      });
      return;
    }
    if (opts.mode === 'download') { download(); return; }
    if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: title })['catch'](function(err){
        if (!err || err.name !== 'AbortError') download();
      });
      return;
    }
    if (inAppBrowser()) { openElsewhere(); return; }
    download();
  }
  window.ffiShareCard = shareCard;

  function openSharePage(btn){
    var a = document.createElement('a');
    a.href = urlFor(btn); a.target = '_blank'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* One tap: draw the card here and hand the image straight to the phone.
     Pages that do not load the renderer (window.FFI_makeCard, from
     ffi-share.js) still fall back to the standalone /share/ page. */
  function tap(btn, e){
    if (e) e.preventDefault();
    var draw = window.FFI_makeCard;
    if (typeof draw !== 'function') { openSharePage(btn); return; }
    if (btn.getAttribute('data-share-busy')) return;
    var p = payloadOf(btn);
    if (p.svgStr) {
      var d = document.createElement('div');
      d.innerHTML = p.svgStr;
      p.svg = d.firstElementChild;
    }
    btn.setAttribute('data-share-busy', '1');
    var wasDisabled = btn.disabled;
    if ('disabled' in btn) btn.disabled = true;
    draw(p, function(blob){
      btn.removeAttribute('data-share-busy');
      if ('disabled' in btn) btn.disabled = wasDisabled;
      if (!blob) { openSharePage(btn); return; }
      shareCard(blob, {
        filename: btn.getAttribute('data-share-filename') || window.FFI_SHARE_FILENAME || 'fight-for-illinois.png',
        title: 'Fight for Illinois',
        fallbackUrl: urlFor(btn)
      });
    });
  }

  function wire(btn){
    if (btn.getAttribute('data-share-wired')) return;
    btn.setAttribute('data-share-wired', '1');
    if (btn.tagName === 'A') { btn.removeAttribute('target'); btn.href = 'javascript:void(0)'; }
    btn.addEventListener('click', function(e){ tap(btn, e); });
  }
  function scan(){ Array.prototype.forEach.call(document.querySelectorAll('.ffi-share'), wire); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
  else scan();
  window.FFI_SHARE_SCAN = scan;   // call after injecting new share buttons
})();
