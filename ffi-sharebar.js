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
     data-share-bubble   change circle, e.g. "Up 79%"
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
    var svgStr = '';
    var sel = g('icon');
    if (sel) {
      var el = document.querySelector(sel);
      if (el) { try { svgStr = new XMLSerializer().serializeToString(el); } catch(e){} }
    }
    var p = {
      pre: g('pre'), num: g('num'), only: g('only'), label: g('label'),
      rank: g('rank'), rankOf: g('rank-of'), title: g('title'),
      rows: rows, bubble: g('bubble'), source: g('source'), svgStr: svgStr
    };
    if (typeof window.FFI_SHARE_RESOLVE === 'function') {
      p = window.FFI_SHARE_RESOLVE(btn, p) || p;
    }
    return p;
  }
  function urlFor(btn){ return SHARE_PAGE + '#c=' + b64(JSON.stringify(payloadOf(btn))); }

  // A real anchor is what makes this work inside app WebViews: they hand
  // target="_blank" links to the system browser, where share/save exist.
  function wire(btn){
    if (btn.getAttribute('data-share-wired')) return;
    btn.setAttribute('data-share-wired', '1');
    if (btn.tagName === 'A') {
      btn.target = '_blank'; btn.rel = 'noopener';
      btn.addEventListener('click', function(){ btn.href = urlFor(btn); });
      btn.href = urlFor(btn);
      return;
    }
    btn.addEventListener('click', function(e){
      e.preventDefault();
      var a = document.createElement('a');
      a.href = urlFor(btn); a.target = '_blank'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
    });
  }
  function scan(){ Array.prototype.forEach.call(document.querySelectorAll('.ffi-share'), wire); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
  else scan();
  window.FFI_SHARE_SCAN = scan;   // call after injecting new share buttons
})();
