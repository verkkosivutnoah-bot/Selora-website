/* Language scan, run inside the page via javascript_tool.

   Mirrors the classifier in scripts/lang_audit.py, but runs against the
   live DOM so it sees what the i18n overlay actually produced, including
   text the static audit cannot reach.

   Usage:
     var mk = window.__langScan();
     mk('fi')  -> visible strings that are NOT Finnish while on the FI site
     mk('en')  -> visible strings that are NOT English while on the EN site
*/

window.__langScan = function () {
  var FIW=['ja','on','ei','se','että','joka','jotka','kun','niin','myös','vain','tai','mutta','kuin','sinä','sinun','sinulle','me','meidän','mitä','miten','kuinka','miksi','kaikki','sivusto','sivut','verkkosivut','asiakas','asiakkaat','asiakkaita','yritys','yrityksesi','palvelu','palvelut','hinta','hinnat','lisää','katso','lue','varaa','saat','teemme','voit','ilman','kanssa','ovat','olemme','sekä','vielä','aina','heti','nopeasti','juuri','yli','alle'];
  var ENW=['the','a','an','and','or','of','to','in','on','at','for','with','from','by','as','that','this','is','are','be','will','can','your','you','we','our','they','it','its','have','has','what','how','why','when','which','who','more','every','all','website','websites','site','page','pages','customer','customers','business','price','pricing','read','book','see','get','built','build','design','services','contact','about','home','free','without'];
  var FIS=['ssa','ssä','sta','stä','lla','llä','lta','ltä','lle','ksi','nen','jen','den','ien','mme','nsa','nsä','kin','ista','istä','ille','oita','öitä','tta','ttä','maan','mään','vat','vät'];
  var ENS=['ing','tion','sion','ment','ness','able','ible'];
  var BRANDS=['the green electrician','vantage','nocturne','selora'];

  function classify(t){
    var raw=t.match(/[A-Za-zÄÖÅäöå']+/g)||[];
    if(!raw.length) return null;
    var low=raw.map(function(w){return w.toLowerCase()});
    var fi=0,en=0;
    low.forEach(function(w){ if(FIW.indexOf(w)>=0) fi++; if(ENW.indexOf(w)>=0) en++; });
    var common=t.charAt(0)+t.slice(1).replace(/\b[A-ZÄÖÅ][a-zäöå]+/g,'');
    if(/[äöÄÖ]/.test(common)) fi+=2;
    raw.forEach(function(w,i){
      if(i>0 && /^[A-ZÄÖÅ]/.test(w)) return;
      var lw=w.toLowerCase();
      if(lw.length>=6 && FIS.some(function(s){return lw.slice(-s.length)===s})) fi++;
      if(lw.length>=6 && ENS.some(function(s){return lw.slice(-s.length)===s})) en++;
    });
    return fi>en?'fi':(en>fi?'en':null);
  }

  function texts(){
    var out=[];
    var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:function(n){
      var p=n.parentElement; if(!p) return 2;
      if(p.closest('script,style,noscript,iframe,[data-i18n-skip]')) return 2;
      if(!n.nodeValue.trim()) return 2;
      var st=getComputedStyle(p);
      if(st.display==='none'||st.visibility==='hidden'||st.opacity==='0') return 2;
      return 1;}});
    var n; while(n=w.nextNode()){
      var t=n.nodeValue.replace(/\s+/g,' ').trim();
      if(t.length<4) continue;
      out.push({t:t,tag:n.parentElement.tagName,cls:(n.parentElement.className||'').toString().slice(0,40)});
    }
    return out;
  }

  return function(expect){
    var bad=[];
    texts().forEach(function(o){
      if(BRANDS.indexOf(o.t.toLowerCase())>=0) return;
      var c=classify(o.t);
      if(c && c!==expect) bad.push(o.tag+'.'+o.cls+' :: '+o.t.slice(0,80));
    });
    return bad;
  };
};
