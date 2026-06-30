<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>SalesSync</title>
 <link rel="icon" type="image/x-icon" href="favicon.ico">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Caveat:wght@600;700&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css"/>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#060818;--bg2:#0c1220;--bg3:#111827;--bg4:#1a2235;--bg5:#222d42;
  --p:#6d28d9;--p2:#8b5cf6;--p3:#a78bfa;
  --green:#059669;--green2:#10b981;
  --red:#dc2626;--red2:#f87171;
  --orange:#ea580c;--orange2:#fb923c;
  --blue:#0284c7;--blue2:#38bdf8;
  --yellow:#d97706;--yellow2:#fbbf24;
  --txt:#f1f5f9;--txt2:#94a3b8;--txt3:#475569;--txt4:#1e293b;
  --border:rgba(148,163,184,.08);--border2:rgba(148,163,184,.15);
  --glow:rgba(109,40,217,.4);
}
html,body{width:100%;height:100%;font-family:'Inter',sans-serif;background:var(--bg);color:var(--txt);overflow:hidden;}

/* LOADING */
#ld{position:fixed;inset:0;background:var(--bg);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;}
.ld-logo{font-size:48px;animation:pulse 2s ease-in-out infinite;}
.ld-name{font-size:24px;font-weight:800;letter-spacing:-0.5px;background:linear-gradient(135deg,#a78bfa,#818cf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.ld-bar{width:140px;height:2px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;margin-top:8px;}
.ld-fill{height:100%;background:linear-gradient(90deg,var(--p),var(--p2));animation:fill 2s ease forwards;}
.ld-st{font-size:11px;color:var(--txt3);}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
@keyframes fill{0%{width:0}100%{width:100%}}

/* LOGIN */
#ls{position:fixed;inset:0;background:var(--bg);z-index:800;display:none;align-items:center;justify-content:center;}
#ls.on{display:flex;}
.lcard{background:var(--bg2);border:1px solid var(--border2);border-radius:20px;padding:36px;width:360px;box-shadow:0 32px 80px rgba(0,0,0,.5);}
.llogo{display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:28px;}
.llogo-ico{width:44px;height:44px;background:linear-gradient(135deg,var(--p),var(--p2));border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 8px 24px var(--glow);}
.llogo-nm{font-size:22px;font-weight:800;letter-spacing:-0.5px;background:linear-gradient(135deg,#a78bfa,#818cf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.ltabs{display:flex;background:var(--bg3);border-radius:10px;padding:3px;margin-bottom:24px;gap:3px;}
.ltab{flex:1;padding:8px;border-radius:8px;text-align:center;font-size:12px;font-weight:600;cursor:pointer;color:var(--txt3);transition:all .2s;}
.ltab.on{background:var(--bg5);color:var(--txt);box-shadow:0 2px 8px rgba(0,0,0,.3);}
.lf{display:flex;flex-direction:column;gap:12px;}
.lfl{font-size:11px;color:var(--txt3);font-weight:600;margin-bottom:4px;display:block;}
.lfi{background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:11px 14px;font-size:13px;color:var(--txt);outline:none;width:100%;font-family:'Inter',sans-serif;transition:border-color .2s;}
.lfi:focus{border-color:var(--p2);}
.lbtn{background:linear-gradient(135deg,var(--p),var(--p2));border:none;color:#fff;border-radius:10px;padding:12px;font-size:13px;font-weight:700;cursor:pointer;width:100%;font-family:'Inter',sans-serif;margin-top:4px;box-shadow:0 4px 16px var(--glow);transition:opacity .2s;}
.lbtn:hover{opacity:.9;}
.lerr{font-size:11px;color:var(--red2);text-align:center;min-height:16px;}

/* === APP LAYOUT === */
#app{display:none;}
#app.on{display:block;position:fixed;inset:0;}

/* TOPBAR */
#topbar{
  position:absolute;top:0;left:0;right:0;height:56px;
  background:rgba(12,18,32,.95);backdrop-filter:blur(12px);
  border-bottom:1px solid var(--border);
  display:flex;align-items:center;padding:0 16px;gap:14px;
  z-index:100;
}
.t-logo{width:34px;height:34px;background:linear-gradient(135deg,var(--p),var(--p2));border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;box-shadow:0 4px 12px var(--glow);}
.t-name{font-size:17px;font-weight:800;letter-spacing:-0.5px;background:linear-gradient(135deg,#a78bfa,#818cf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.t-div{width:1px;height:28px;background:var(--border2);}
.t-metric{display:flex;flex-direction:column;gap:1px;}
.t-metric span{font-size:9px;color:var(--txt3);text-transform:uppercase;letter-spacing:.8px;font-weight:600;}
.t-metric strong{font-size:14px;font-weight:700;letter-spacing:-0.3px;}
.t-r{margin-left:auto;display:flex;align-items:center;gap:6px;}
.t-chip{background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:5px 10px;font-size:11px;color:var(--txt2);display:flex;align-items:center;gap:6px;cursor:pointer;transition:border-color .2s;}
.t-chip:hover{border-color:var(--p2);}
.t-chip .online{width:6px;height:6px;border-radius:50%;background:var(--green2);box-shadow:0 0 6px var(--green2);animation:blink 2s infinite;}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
.t-btn{width:32px;height:32px;border-radius:8px;background:var(--bg3);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--txt3);font-size:16px;transition:all .2s;}
.t-btn:hover{border-color:var(--p2);color:var(--p3);}

/* PLATBAR */
#platbar{
  position:absolute;top:56px;left:0;right:0;height:38px;
  background:rgba(12,18,32,.9);backdrop-filter:blur(8px);
  border-bottom:1px solid var(--border);
  display:flex;align-items:center;padding:0 16px;gap:4px;
  z-index:99;overflow-x:auto;
}
#platbar::-webkit-scrollbar{display:none;}
.pfil{padding:4px 12px;border-radius:20px;font-size:10px;font-weight:600;cursor:pointer;border:1px solid transparent;color:var(--txt3);transition:all .2s;white-space:nowrap;display:flex;align-items:center;gap:5px;}
.pfil:hover{color:var(--txt2);background:var(--bg3);}
.pfil.on{background:rgba(109,40,217,.15);border-color:var(--p2);color:var(--p3);}
.pfil.ml.on{background:rgba(255,220,0,.08);border-color:#ffd600;color:#ffd600;}
.pfil.mg.on{background:rgba(0,120,255,.08);border-color:#0078ff;color:#4da6ff;}
.pfil.sp.on{background:rgba(238,77,45,.08);border-color:#ee4d2d;color:#ff7a5c;}

/* SIDEBAR */
#sidebar{
  position:absolute;top:94px;left:0;bottom:0;width:56px;
  background:rgba(12,18,32,.95);backdrop-filter:blur(8px);
  border-right:1px solid var(--border);
  display:flex;flex-direction:column;align-items:center;
  padding:10px 0;gap:2px;z-index:98;
}
.s-btn{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--txt3);font-size:20px;transition:all .2s;position:relative;flex-shrink:0;}
.s-btn:hover{background:var(--bg3);color:var(--txt2);}
.s-btn.on{background:rgba(109,40,217,.2);color:var(--p3);}
.s-tip{position:absolute;left:48px;background:var(--bg4);border:1px solid var(--border2);border-radius:7px;padding:4px 10px;font-size:10px;color:var(--txt2);white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .2s;z-index:300;}
.s-btn:hover .s-tip{opacity:1;}
.s-sp{flex:1;}
.s-ver{font-size:8px;color:var(--txt3);padding-bottom:4px;}

/* PERIOD BAR */
#periodbar{
  position:absolute;top:94px;left:56px;right:0;height:38px;
  background:rgba(12,18,32,.9);
  border-bottom:1px solid var(--border);
  display:flex;align-items:center;padding:0 14px;gap:4px;
  z-index:98;
}
.pill{padding:4px 12px;border-radius:20px;font-size:10px;font-weight:600;cursor:pointer;border:1px solid transparent;color:var(--txt3);transition:all .2s;white-space:nowrap;}
.pill:hover{color:var(--txt2);background:var(--bg3);}
.pill.on{background:rgba(109,40,217,.15);border-color:var(--p2);color:var(--p3);}
.sync-info{margin-left:auto;font-size:10px;color:var(--txt3);display:flex;align-items:center;gap:6px;}


/* CUSTOM DATE MODAL */
.date-modal-box{max-width:420px;}
.date-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.date-input{background:var(--bg3);border:1px solid var(--border2);border-radius:10px;color:var(--txt);height:38px;padding:0 12px;font-size:13px;font-family:'Inter',sans-serif;outline:none;}
.date-input:focus{border-color:var(--p2);box-shadow:0 0 0 3px rgba(139,92,246,.12);}
.date-limit{font-size:10px;color:var(--txt3);line-height:1.45;background:rgba(56,189,248,.06);border:1px solid rgba(56,189,248,.12);border-radius:10px;padding:9px 11px;}
.date-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;}

/* CONTENT AREA — scroll natural da página */
#content{
  position:absolute;
  top:132px;
  left:56px;
  right:0;
  bottom:0;
  overflow-y:auto;
  overflow-x:hidden;
  padding:10px;
  display:flex;
  flex-direction:column;
  gap:8px;
}

/* TOPO COMPACTO */
/* ── DASHBOARD NOVO LAYOUT ── */
.dash-main-row{display:grid;grid-template-columns:1fr minmax(380px,440px);gap:8px;align-items:stretch;margin-bottom:8px;flex-shrink:0;}
.dash-metrics{display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:auto auto;gap:5px;}
/* Metric cards */
.mcard{background:linear-gradient(135deg,var(--bg2),var(--bg3));border:1px solid var(--border2);border-radius:10px;padding:7px 10px;position:relative;overflow:hidden;transition:all .2s;min-width:0;}
.mcard:hover{border-color:rgba(139,92,246,.3);transform:translateY(-1px);}
.mcard.sm{padding:5px 9px;}
.mcard-accent{position:absolute;top:0;left:0;right:0;height:2px;background:var(--ca);}
.mcard-label{font-size:12.5px;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;font-weight:700;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.mcard-val{font-size:27px;font-weight:800;letter-spacing:-.4px;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.15;}
.mcard.sm .mcard-val{font-size:16px;}
.mcard-sub{font-size:8px;color:var(--txt3);margin-top:1px;display:flex;align-items:center;gap:4px;flex-wrap:wrap;}
.mcard-cmp{display:inline-flex;align-items:center;gap:2px;font-size:10px;font-weight:700;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}
/* badge APENAS dentro dos metric cards — não afeta badges do resto do sistema */
.mcard .badge{font-size:10px;}
.mcard-cmp.up{color:var(--green2);}
.mcard-cmp.dn{color:var(--red2);}
.mcard-cmp.eq{color:var(--txt3);}
/* Product panel full width below */
.prod-panel-full{margin-bottom:8px;flex-shrink:0;}
.badge{display:inline-flex;align-items:center;padding:1px 5px;border-radius:20px;font-size:7.5px;font-weight:700;}
.badge.green{background:rgba(16,185,129,.12);color:var(--green2);border:1px solid rgba(16,185,129,.2);}
.badge.red{background:rgba(220,38,38,.1);color:var(--red2);border:1px solid rgba(220,38,38,.2);}
.top-panel{min-width:0;background:rgba(12,18,32,.38);border:1px solid var(--border);border-radius:12px;padding:7px;overflow:hidden;}
.top-panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;}
/* Chart period tabs */
.ctab{background:transparent;border:none;color:rgba(148,163,184,.55);font-size:9.5px;font-weight:700;padding:3px 7px;border-radius:5px;cursor:pointer;transition:all .15s;letter-spacing:.2px;line-height:1.4}
.ctab:hover{color:#c4b5fd;background:rgba(139,92,246,.12)}
.ctab.active{background:rgba(139,92,246,.2);color:#a78bfa}
/* Page size selector */
.page-size-sel{display:flex;align-items:center;gap:6px;font-size:10px;color:var(--txt3);}
.page-size-sel select{background:var(--bg3);border:1px solid var(--border2);color:var(--txt2);border-radius:6px;padding:2px 8px;font-size:10px;cursor:pointer;outline:none;}
@media(max-width:1100px){.dash-main-row{grid-template-columns:1fr}#ss-chart-panel{display:none!important}.dash-metrics{grid-template-columns:repeat(4,1fr)}}
@media(max-width:800px){.dash-metrics{grid-template-columns:repeat(2,1fr)}.mcard-val{font-size:13px}.mcard.sm .mcard-val{font-size:11px}}

/* FULFILLMENT TABS */
.ftabs{display:flex;gap:4px;}
.ftab{padding:5px 14px;border-radius:20px;font-size:10px;font-weight:600;cursor:pointer;border:1px solid var(--border2);color:var(--txt3);transition:all .2s;}
.ftab:hover{border-color:var(--p2);color:var(--p3);}
.ftab.on{background:rgba(109,40,217,.15);border-color:var(--p2);color:var(--p3);}

/* PRODUCT TABS + LIST */
.ptabs{display:flex;gap:4px;margin-bottom:0;flex-wrap:wrap;}
.ptab{padding:5px 14px;border-radius:20px;font-size:10px;font-weight:600;cursor:pointer;border:1px solid var(--border2);color:var(--txt3);transition:all .2s;}
.ptab:hover{border-color:var(--p2);color:var(--p3);}
.ptab.on{background:rgba(109,40,217,.15);border-color:var(--p2);color:var(--p3);}
.prod-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;max-height:118px;overflow:auto;}
.prod-item{background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:5px 7px;display:flex;align-items:center;gap:6px;cursor:pointer;transition:all .2s;min-width:0;position:relative;}
.prod-item:hover{border-color:var(--border2);background:var(--bg3);}
.prod-img{width:30px;height:30px;border-radius:7px;object-fit:cover;background:var(--bg4);border:1px solid var(--border);flex-shrink:0;}
.prod-img-ph{width:30px;height:30px;border-radius:7px;background:var(--bg4);border:1px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:13px;}
.prod-title{flex:1;font-size:9px;font-weight:600;color:var(--txt);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;}
.prod-right{text-align:right;flex-shrink:0;}
.prod-right .v{font-size:11px;font-weight:700;letter-spacing:-.3px;}
.prod-right .p{font-size:8px;color:var(--txt3);margin-top:1px;}

/* TABLE */
.tbl-wrap{
  background:var(--bg2);
  border:1px solid var(--border2);
  border-radius:12px;
  overflow:hidden;
  margin-bottom:10px;
  flex-shrink:0;
  width:100%;
  overflow-x:auto;
}
.tbl-head{padding:12px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);}
.tbl-title{font-size:12px;font-weight:700;color:var(--txt2);display:flex;align-items:center;gap:6px;}
.tbl-actions{display:flex;gap:6px;align-items:center;}
.srch{background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:6px 12px;font-size:11px;color:var(--txt);outline:none;width:160px;font-family:'Inter',sans-serif;}
.srch:focus{border-color:var(--p2);}
.srch::placeholder{color:var(--txt3);}
.ic-btn{width:30px;height:30px;border-radius:8px;background:var(--bg3);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--txt3);font-size:15px;transition:all .2s;}
.ic-btn:hover{border-color:var(--p2);color:var(--p3);}
table{width:100%;border-collapse:collapse;font-size:10px;}
thead th{padding:8px 10px;text-align:left;font-size:9px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.6px;background:var(--bg3);border-bottom:1px solid var(--border);}
tbody td{padding:8px 10px;color:var(--txt2);border-bottom:1px solid rgba(255,255,255,.03);vertical-align:middle;}
tbody tr:last-child td{border-bottom:none;}
tbody tr:hover td{background:rgba(109,40,217,.04);cursor:pointer;}
tbody tr.date-row td{background:var(--bg3);padding:6px 10px;font-size:9px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.8px;border-top:1px solid var(--border);border-bottom:1px solid var(--border);}
.row-img{width:32px;height:32px;border-radius:7px;object-fit:cover;background:var(--bg4);border:1px solid var(--border);}
.row-img-ph{width:32px;height:32px;border-radius:7px;background:var(--bg4);border:1px solid var(--border);display:inline-flex;align-items:center;justify-content:center;font-size:14px;}
.profit-pos{background:rgba(16,185,129,.1);color:var(--green2);font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;white-space:nowrap;border:1px solid rgba(16,185,129,.15);}
.profit-neg{background:rgba(220,38,38,.08);color:var(--red2);font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;border:1px solid rgba(220,38,38,.15);}
.plat-ml{background:rgba(255,214,0,.08);color:#ffd600;font-size:9px;font-weight:700;padding:1px 6px;border-radius:4px;border:1px solid rgba(255,214,0,.15);}
.plat-sp{background:rgba(238,77,45,.08);color:#ee4d2d;font-size:9px;font-weight:700;padding:1px 6px;border-radius:4px;border:1px solid rgba(238,77,45,.15);}
.plat-mg{background:rgba(0,120,255,.08);color:#4da6ff;font-size:9px;font-weight:700;padding:1px 6px;border-radius:4px;border:1px solid rgba(0,120,255,.15);}
.type-full{background:rgba(56,189,248,.08);color:var(--blue2);font-size:8px;font-weight:700;padding:1px 5px;border-radius:4px;border:1px solid rgba(56,189,248,.15);}
.type-normal{background:rgba(109,40,217,.08);color:var(--p3);font-size:8px;font-weight:700;padding:1px 5px;border-radius:4px;border:1px solid rgba(109,40,217,.15);}
.cost-wrap{display:flex;align-items:center;gap:4px;}
.cost-inp{background:var(--bg4);border:1px solid var(--border2);border-radius:6px;padding:2px 7px;font-size:10px;color:var(--txt);width:72px;outline:none;font-family:'Inter',sans-serif;}
.cost-inp:focus{border-color:var(--p2);}
#content::-webkit-scrollbar{width:5px;}#content::-webkit-scrollbar-thumb{background:var(--bg5);border-radius:4px;}
.tbl-foot{padding:8px 16px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border);background:var(--bg3);flex-shrink:0;}
.page-btn{width:26px;height:26px;border-radius:7px;background:var(--bg4);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--txt3);font-size:13px;transition:all .2s;}
.page-btn:hover{border-color:var(--p2);color:var(--p3);}

/* STATUS BADGE */
.st{font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;}

/* MODALS */
.mo{position:fixed;inset:0;background:rgba(6,8,24,.9);backdrop-filter:blur(8px);z-index:500;display:none;align-items:center;justify-content:center;padding:16px;}
.mo.on{display:flex;}
.md{background:var(--bg2);border:1px solid var(--border2);border-radius:20px;width:100%;max-width:620px;max-height:88vh;overflow-y:auto;box-shadow:0 32px 80px rgba(0,0,0,.7);}
.md.wide{max-width:740px;}
.md::-webkit-scrollbar{width:4px;}
.md::-webkit-scrollbar-thumb{background:var(--bg5);border-radius:2px;}
.mh{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--bg2);z-index:10;}
.mh-left{display:flex;align-items:center;gap:10px;}
.mh-ico{width:36px;height:36px;background:rgba(109,40,217,.15);border:1px solid rgba(109,40,217,.2);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--p3);font-size:18px;}
.mh-title{font-size:15px;font-weight:700;}
.mh-sub{font-size:10px;color:var(--txt3);margin-top:1px;}
.mh-close{width:30px;height:30px;border-radius:8px;background:var(--bg3);border:1px solid var(--border);cursor:pointer;color:var(--txt3);display:flex;align-items:center;justify-content:center;font-size:16px;transition:all .2s;}
.mh-close:hover{border-color:var(--red);color:var(--red2);}
.mb{padding:16px 20px;display:flex;flex-direction:column;gap:12px;}
.mpc{background:var(--bg3);border:1px solid var(--border2);border-radius:14px;overflow:hidden;}
.mpch{padding:12px 16px;display:flex;align-items:center;gap:12px;cursor:pointer;}
.mp-ico{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0;}
.mp-ico.ml{background:#ffd600;color:#000;}
.mp-ico.sp{background:#ee4d2d;color:#fff;}
.mp-ico.mg{background:#0078ff;color:#fff;}
.mp-info h3{font-size:13px;font-weight:700;}
.mp-info p{font-size:10px;color:var(--txt3);margin-top:2px;}
.mp-status{margin-left:auto;display:flex;align-items:center;gap:8px;}
.conn-badge{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);color:var(--green2);font-size:9px;font-weight:700;padding:3px 10px;border-radius:20px;display:flex;align-items:center;gap:4px;}
.conn-badge::before{content:'';width:5px;height:5px;border-radius:50%;background:var(--green2);box-shadow:0 0 6px var(--green2);}
.disc-badge{background:var(--bg4);border:1px solid var(--border2);color:var(--txt3);font-size:9px;font-weight:600;padding:3px 10px;border-radius:20px;}
.chev{font-size:16px;color:var(--txt3);transition:transform .3s;}
.chev.open{transform:rotate(180deg);}
.mp-body{border-top:1px solid var(--border);padding:12px 16px;display:none;flex-direction:column;gap:10px;}
.mp-body.on{display:flex;}
.mp-acc{background:var(--bg4);border:1px solid var(--border);border-radius:10px;padding:10px 12px;display:flex;align-items:center;gap:10px;}
.mp-ava{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;background:rgba(109,40,217,.15);color:var(--p3);}
.mp-acc-info{flex:1;}
.mp-acc-name{font-size:12px;font-weight:600;}
.mp-acc-sub{font-size:10px;color:var(--txt3);margin-top:2px;display:flex;gap:6px;}
.mp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;}
.mp-stat{background:var(--bg3);border-radius:8px;padding:6px 8px;text-align:center;}
.mp-stat span{font-size:8px;color:var(--txt3);display:block;text-transform:uppercase;letter-spacing:.4px;}
.mp-stat strong{font-size:11px;font-weight:700;color:var(--txt2);display:block;margin-top:2px;}
.note{display:flex;align-items:center;gap:6px;font-size:10px;color:var(--txt3);padding:8px 12px;background:rgba(255,255,255,.02);border-radius:8px;border:1px solid var(--border);}
.note i{font-size:14px;color:var(--p3);}
.ib{width:28px;height:28px;border-radius:7px;background:var(--bg3);border:1px solid var(--border);cursor:pointer;color:var(--txt3);display:flex;align-items:center;justify-content:center;font-size:14px;transition:all .2s;}
.ib:hover{border-color:var(--p2);color:var(--p3);}
.ib.danger:hover{border-color:var(--red);color:var(--red2);}
.btn{display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 16px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;border:none;width:100%;font-family:'Inter',sans-serif;transition:all .2s;}
.btn.primary{background:linear-gradient(135deg,var(--p),var(--p2));color:#fff;box-shadow:0 4px 16px var(--glow);}
.btn.primary:hover{opacity:.9;}
.btn.ghost{background:var(--bg4);border:1px solid var(--border2);color:var(--txt2);}
.btn.ghost:hover{border-color:var(--p2);color:var(--p3);}
.fi{display:flex;flex-direction:column;gap:4px;}
.fi label{font-size:10px;color:var(--txt3);font-weight:600;}
.fi input,.fi select{background:var(--bg3);border:1px solid var(--border2);border-radius:9px;padding:9px 13px;font-size:13px;color:var(--txt);font-family:'Inter',sans-serif;outline:none;width:100%;}
.fi input:focus,.fi select:focus{border-color:var(--p2);}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.calc-result{background:rgba(109,40,217,.08);border:1px solid rgba(109,40,217,.2);border-radius:12px;padding:14px 16px;}
.cr-row{display:flex;justify-content:space-between;font-size:11px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);}
.cr-row:last-child{border-bottom:none;}
.cr-row .l{color:var(--txt3);}
.cr-row .v{font-weight:700;}
.od-img-big{width:80px;height:80px;border-radius:12px;object-fit:cover;background:var(--bg4);border:1px solid var(--border);flex-shrink:0;}
.od-img-big-ph{width:80px;height:80px;border-radius:12px;background:var(--bg4);border:1px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:32px;}
.od-block{background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:12px 14px;}
.od-block-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--txt3);margin-bottom:10px;display:flex;align-items:center;gap:5px;}
.od-row{display:flex;justify-content:space-between;font-size:11px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);}
.od-row:last-child{border-bottom:none;}
.od-row .l{color:var(--txt3);}
.od-row .v{font-weight:600;color:var(--txt);}
.od-total{background:rgba(109,40,217,.1);border:1px solid rgba(109,40,217,.25);border-radius:12px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;}
.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px;gap:12px;color:var(--txt3);}
.empty i{font-size:44px;opacity:.25;}
.empty p{font-size:13px;}
.spin{display:inline-block;width:18px;height:18px;border:2px solid rgba(139,92,246,.25);border-top-color:var(--p2);border-radius:50%;animation:spin .6s linear infinite;}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes qaShake{0%,100%{transform:rotate(0)}20%{transform:rotate(-15deg)}40%{transform:rotate(15deg)}60%{transform:rotate(-10deg)}80%{transform:rotate(10deg)}}
@keyframes skuFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes skuIn{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}
#sku-bubbles{position:fixed;bottom:80px;right:18px;z-index:8500;display:flex;flex-direction:column;gap:8px;pointer-events:none;align-items:flex-end}
.sku-bubble{pointer-events:all;background:var(--bg2);border:1.5px solid rgba(251,191,36,.5);border-radius:14px;padding:9px 14px;display:flex;align-items:center;gap:8px;cursor:pointer;box-shadow:0 4px 24px rgba(0,0,0,.4),0 0 0 1px rgba(251,191,36,.15);animation:skuIn .3s ease,skuFloat 3s ease-in-out infinite;max-width:320px;transition:background .15s}
.sku-bubble:hover{background:rgba(251,191,36,.12)}
.sku-bubble-icon{font-size:16px;flex-shrink:0}
.sku-bubble-text{flex:1;min-width:0}
.sku-bubble-title{font-size:10px;font-weight:800;color:#fbbf24;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sku-bubble-sub{font-size:9px;color:var(--txt3);margin-top:1px}
.sku-bubble-close{font-size:12px;color:var(--txt3);flex-shrink:0;padding:0 2px;line-height:1;cursor:pointer}
.sku-bubble-close:hover{color:var(--txt)}
/* AI CHAT */
.ai-sug{background:var(--bg4);border:1px solid var(--border2);border-radius:20px;padding:4px 10px;font-size:10px;color:var(--txt2);cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;white-space:nowrap;}
.ai-sug:hover{border-color:var(--p2);color:var(--p3);background:rgba(109,40,217,.1);}
.ai-msg{display:flex;flex-direction:column;max-width:88%;}
.ai-msg.user{align-self:flex-end;}
.ai-bubble{padding:9px 13px;border-radius:14px;font-size:12px;line-height:1.55;word-break:break-word;}
.ai-bubble.bot{background:var(--bg3);border:1px solid var(--border2);color:var(--txt);border-radius:4px 14px 14px 14px;}
.ai-bubble.user{background:linear-gradient(135deg,var(--p),var(--p2));color:#fff;border-radius:14px 4px 14px 14px;}
.ai-bubble.typing{color:var(--txt3);font-style:italic;}
.ai-bubble strong{color:var(--p3);}
.ai-bubble ul{padding-left:14px;margin:4px 0;}
.ai-bubble li{margin-bottom:3px;}
@keyframes ai-panel-in{from{transform:translateX(100%)}to{transform:translateX(0)}}
@media(max-width:768px){#ai-panel{width:100%!important;}#ai-fab{bottom:70px;}}
.toast{position:fixed;bottom:24px;right:24px;background:var(--bg3);border:1px solid var(--p2);border-radius:12px;padding:12px 18px;font-size:12px;color:var(--txt2);z-index:9000;display:flex;align-items:center;gap:8px;box-shadow:0 12px 40px rgba(0,0,0,.5);transform:translateY(80px);opacity:0;transition:all .3s;pointer-events:none;}
.toast.on{transform:none;opacity:1;}
.toast i{color:var(--p3);font-size:17px;}

/* PRODUCT COST MANAGER */
.prod-cost-form{display:grid;grid-template-columns:110px 105px 1fr 82px 82px 82px 82px 42px;gap:7px;align-items:end;}
.prod-cost-card{background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:10px 12px;display:grid;grid-template-columns:90px 95px 1fr 82px 70px 70px 82px 34px;gap:8px;align-items:center;}
.prod-cost-card:hover{border-color:var(--border2);background:rgba(255,255,255,.025);}
.plat-select{background:var(--bg3);border:1px solid var(--border2);border-radius:9px;padding:8px 10px;font-size:11px;color:var(--txt);font-family:'Inter',sans-serif;outline:none;width:100%;}
.plat-chip{font-size:9px;font-weight:800;padding:3px 8px;border-radius:999px;text-align:center;white-space:nowrap;border:1px solid var(--border2);}
.plat-chip.mercadolivre{background:rgba(255,214,0,.08);color:#ffd600;border-color:rgba(255,214,0,.18);}
.plat-chip.magalu{background:rgba(0,120,255,.08);color:#4da6ff;border-color:rgba(0,120,255,.18);}
.plat-chip.shopee{background:rgba(238,77,45,.08);color:#ff7a5c;border-color:rgba(238,77,45,.18);}
.plat-chip.tiktok{background:rgba(255,0,80,.08);color:#ff0050;border-color:rgba(255,0,80,.18);}
.plat-chip.geral{background:rgba(148,163,184,.08);color:var(--txt2);}
.tax-pill{font-size:11px;font-weight:700;color:var(--blue2);}
@media(max-width:900px){.prod-cost-form{grid-template-columns:1fr 1fr}.prod-cost-card{grid-template-columns:1fr 1fr}.prod-cost-card .ib{justify-self:end}}



/* === FIX v4.8 — Aba Custos bonita e alinhada === */
#mo-cst .md.wide{max-width:880px;overflow:hidden;}
#mo-cst .mb{padding:16px 18px 18px;}
.cost-panel{display:flex;flex-direction:column;gap:14px;}
.cost-create{background:linear-gradient(135deg,rgba(109,40,217,.10),rgba(15,23,42,.55));border:1px solid var(--border2);border-radius:16px;padding:14px;display:grid;grid-template-columns:150px 1fr 1.3fr 105px 90px 90px 105px 42px;gap:8px;align-items:center;box-shadow:inset 0 1px 0 rgba(255,255,255,.03);}
.cost-create select,.cost-create input{height:34px;background:var(--bg3);border:1px solid var(--border2);border-radius:10px;color:var(--txt);font-size:11px;font-family:'Inter',sans-serif;padding:0 11px;outline:none;min-width:0;}
.cost-create select:focus,.cost-create input:focus{border-color:var(--p2);box-shadow:0 0 0 3px rgba(139,92,246,.12);}
.cost-create input::placeholder{color:var(--txt3);}
.cost-help{background:rgba(56,189,248,.06);border:1px solid rgba(56,189,248,.12);color:var(--txt2);border-radius:12px;padding:10px 12px;font-size:11px;line-height:1.45;}
.cost-list{display:flex;flex-direction:column;gap:8px;max-height:420px;overflow:auto;padding-right:4px;}
.cost-list::-webkit-scrollbar{width:4px}.cost-list::-webkit-scrollbar-thumb{background:var(--bg5);border-radius:4px;}
.cost-card{background:var(--bg3);border:1px solid var(--border);border-radius:14px;padding:10px 12px;display:grid;grid-template-columns:74px minmax(160px,1.3fr) 105px 95px 95px 105px 34px;gap:9px;align-items:center;transition:all .2s;}
.cost-card:hover{border-color:rgba(139,92,246,.32);background:rgba(255,255,255,.025);}
.cost-field{min-width:0;display:flex;flex-direction:column;gap:4px;}
.cost-field label{font-size:8px;color:var(--txt3);font-weight:800;text-transform:uppercase;letter-spacing:.6px;}
.cost-field input{height:32px;background:var(--bg4);border:1px solid var(--border2);border-radius:9px;color:var(--txt);font-size:11px;font-weight:700;padding:0 9px;outline:none;font-family:'Inter',sans-serif;width:100%;}
.cost-field input:focus{border-color:var(--p2);box-shadow:0 0 0 3px rgba(139,92,246,.12);}
.cost-sku{font-size:11px;font-weight:800;color:var(--p3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cost-name{font-size:10px;color:var(--txt3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.plat-chip{height:22px;border-radius:999px;padding:0 10px;display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;border:1px solid var(--border2);white-space:nowrap;}
.plat-chip.mercadolivre{background:rgba(255,214,0,.10);border-color:rgba(255,214,0,.25);color:#ffd600;}
.plat-chip.magalu{background:rgba(0,120,255,.10);border-color:rgba(0,120,255,.28);color:#4da6ff;}
.plat-chip.shopee{background:rgba(238,77,45,.10);border-color:rgba(238,77,45,.25);color:#ff7a5c;}
.plat-chip.tiktok{background:rgba(255,0,80,.10);border-color:rgba(255,0,80,.25);color:#ff0050;}
.plat-chip.geral{background:rgba(148,163,184,.10);border-color:rgba(148,163,184,.22);color:var(--txt2);}
#mo-cst .ib{background:rgba(16,185,129,.08);border-color:rgba(16,185,129,.18);color:var(--green2);}
#mo-cst .ib:hover{background:rgba(16,185,129,.14);border-color:rgba(16,185,129,.35);}
.cost-defaults{background:linear-gradient(135deg,rgba(56,189,248,.08),rgba(109,40,217,.08));border:1px solid var(--border2);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:10px;}
.cost-defaults-title{display:flex;align-items:center;justify-content:space-between;gap:10px;}
.cost-defaults-title strong{font-size:12px;color:var(--txt);display:flex;align-items:center;gap:7px;}
.cost-defaults-title span{font-size:10px;color:var(--txt3);}
.default-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;}
.default-card{background:rgba(15,23,42,.62);border:1px solid var(--border);border-radius:13px;padding:10px;display:grid;grid-template-columns:86px 1fr 1fr 1fr 32px;gap:7px;align-items:end;}
.default-card label{font-size:8px;color:var(--txt3);font-weight:800;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px;}
.default-card input{height:31px;background:var(--bg4);border:1px solid var(--border2);border-radius:9px;color:var(--txt);font-size:11px;font-weight:700;padding:0 8px;width:100%;outline:none;}
.default-card input:focus{border-color:var(--p2);box-shadow:0 0 0 3px rgba(139,92,246,.12);}
.default-card .ib{width:31px;height:31px;}
.auto-note{font-size:10px;color:var(--txt3);line-height:1.45;}
.auto-badge{font-size:8px;color:var(--green2);background:rgba(16,185,129,.10);border:1px solid rgba(16,185,129,.18);border-radius:999px;padding:2px 7px;font-weight:800;}
@media(max-width:900px){.default-grid{grid-template-columns:1fr}.default-card{grid-template-columns:1fr 1fr}.default-card .plat-chip{grid-column:1/-1}.cost-create{grid-template-columns:1fr 1fr}.cost-card{grid-template-columns:1fr 1fr}}


/* === FIX v5.1 — Custos com scroll, deletar e limpar === */
#mo-cst{padding:16px;}
#mo-cst .md.wide{max-width:980px;width:100%;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;}
#mo-cst .mh{flex-shrink:0;}
#mo-cst .mb{flex:1;min-height:0;overflow:hidden;padding:14px 16px 16px;}
#mo-cst .cost-panel{height:100%;min-height:0;display:flex;flex-direction:column;gap:12px;}
#mo-cst .cost-defaults,#mo-cst .cost-create,#mo-cst .cost-help{flex-shrink:0;}
#mo-cst .cost-list{flex:1;min-height:170px;max-height:none;overflow-y:auto;overflow-x:hidden;padding-right:6px;scrollbar-width:thin;}
#mo-cst .cost-list::-webkit-scrollbar{width:7px;}
#mo-cst .cost-list::-webkit-scrollbar-track{background:rgba(255,255,255,.035);border-radius:999px;}
#mo-cst .cost-list::-webkit-scrollbar-thumb{background:linear-gradient(180deg,var(--p2),var(--p));border-radius:999px;}
#mo-cst .cost-card{grid-template-columns:74px minmax(150px,1.3fr) 100px 90px 90px 100px 32px 32px;}
.cost-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end;}
.cost-mini-btn{height:28px;border:1px solid var(--border2);background:rgba(15,23,42,.75);color:var(--txt2);border-radius:9px;padding:0 10px;font-size:10px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:all .2s;}
.cost-mini-btn:hover{border-color:var(--p2);color:var(--p3);background:rgba(109,40,217,.10);}
.cost-mini-btn.danger:hover{border-color:rgba(248,113,113,.45);color:var(--red2);background:rgba(248,113,113,.08);}
#mo-cst .ib.danger{background:rgba(248,113,113,.07);border-color:rgba(248,113,113,.18);color:var(--red2);}
#mo-cst .ib.danger:hover{background:rgba(248,113,113,.13);border-color:rgba(248,113,113,.38);}
@media(max-height:760px){#mo-cst .cost-help{display:none;}#mo-cst .default-grid{grid-template-columns:repeat(4,1fr);}#mo-cst .default-card{grid-template-columns:1fr;}}
@media(max-width:900px){#mo-cst .cost-card{grid-template-columns:1fr 1fr;}#mo-cst .cost-card .ib{width:100%;}#mo-cst .cost-create{grid-template-columns:1fr 1fr;}.cost-tools{justify-content:flex-start;}}

.inline-edit{display:inline-flex;align-items:center;gap:4px;cursor:pointer;border-radius:7px;padding:2px 4px;}
.inline-edit:hover{background:rgba(255,255,255,.04);}
.inline-input{width:72px;height:24px;background:var(--bg4);border:1px solid var(--p2);border-radius:7px;color:var(--txt);font-size:10px;font-weight:700;padding:0 6px;outline:none;}
.save-mini,.cancel-mini{font-size:12px;cursor:pointer}.save-mini{color:var(--green2)}.cancel-mini{color:var(--red2)}
@media(max-width:1050px){.cost-create{grid-template-columns:1fr 1fr 1fr}.cost-create .btn{width:100%!important}.cost-card{grid-template-columns:1fr 1fr 1fr}.cost-card .ib{justify-self:end}}


.ship-badge{display:inline-flex;align-items:center;gap:4px;font-size:8.5px;font-weight:800;padding:2px 7px;border-radius:999px;border:1px solid rgba(148,163,184,.18);white-space:nowrap;}
.ship-badge.ready,.ship-badge.not_delivered,.ship-badge.paid_not_shipped{background:rgba(251,191,36,.10);color:var(--yellow2);border-color:rgba(251,191,36,.20)}
.ship-badge.invoiced{background:rgba(245,158,11,.12);color:#f59e0b;border-color:rgba(245,158,11,.25);white-space:normal;text-align:center;line-height:1.3;}
.ship-badge.handling{background:rgba(139,92,246,.10);color:var(--p3);border-color:rgba(139,92,246,.20)}
.ship-badge.shipped{background:rgba(56,189,248,.10);color:var(--blue2);border-color:rgba(56,189,248,.20)}
.ship-badge.delivered{background:rgba(16,185,129,.10);color:var(--green2);border-color:rgba(16,185,129,.20)}
.ship-badge.cancelled{background:rgba(248,113,113,.10);color:var(--red2);border-color:rgba(248,113,113,.20)}
.ship-label-btn{display:inline-flex;align-items:center;gap:4px;background:rgba(16,185,129,.10);color:var(--green2);border:1px solid rgba(16,185,129,.22);border-radius:999px;padding:2px 7px;font-size:8.5px;font-weight:800;text-decoration:none;margin-top:3px;}
.ship-label-btn:hover{border-color:var(--green2)}
.tag-chip{display:inline-flex;background:rgba(148,163,184,.08);border:1px solid rgba(148,163,184,.13);border-radius:999px;padding:2px 7px;font-size:8.5px;font-weight:700;color:var(--txt2);}



.label-modal-backdrop{position:fixed;inset:0;background:rgba(6,8,24,.88);backdrop-filter:blur(8px);z-index:9500;display:flex;align-items:center;justify-content:center;padding:16px}
.label-modal{width:100%;max-width:390px;background:var(--bg2);border:1px solid var(--border2);border-radius:18px;box-shadow:0 28px 70px rgba(0,0,0,.65);overflow:hidden}
.label-modal-head{padding:15px 17px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:10px}
.label-modal-head strong{font-size:14px}.label-modal-head span{font-size:10px;color:var(--txt3);display:block;margin-top:2px}
.label-modal-close{width:28px;height:28px;border-radius:8px;background:var(--bg3);border:1px solid var(--border);color:var(--txt3);cursor:pointer}
.label-modal-body{padding:14px;display:flex;flex-direction:column;gap:8px}
.label-choice{width:100%;border:1px solid var(--border2);background:var(--bg3);border-radius:12px;color:var(--txt);padding:11px 13px;display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;font-family:'Inter',sans-serif;text-align:left}
.label-choice:hover{border-color:var(--p2);background:rgba(109,40,217,.14)}
.label-choice b{font-size:12px}.label-choice small{font-size:9px;color:var(--txt3);display:block;margin-top:2px}.label-choice i{font-size:18px;color:var(--p3)}
.label-batch{border-top:1px solid var(--border);margin-top:6px;padding-top:10px}
.label-batch-title{font-size:11px;font-weight:800;color:var(--txt2);display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px}
.label-batch-title small{font-size:9px;color:var(--txt3);font-weight:600}
.label-batch-list{max-height:190px;overflow:auto;display:flex;flex-direction:column;gap:6px;padding-right:3px}
.label-batch-list::-webkit-scrollbar{width:4px}.label-batch-list::-webkit-scrollbar-thumb{background:var(--bg5);border-radius:4px}
.label-batch-item{display:grid;grid-template-columns:18px 1fr auto;gap:8px;align-items:center;background:rgba(255,255,255,.025);border:1px solid var(--border);border-radius:10px;padding:8px}
.label-batch-item:hover{border-color:var(--border2)}
.label-batch-item input{accent-color:var(--p2)}
.label-batch-name{font-size:10px;font-weight:800;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.label-batch-sub{font-size:8.5px;color:var(--txt3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.label-batch-tag{font-size:8px;color:var(--p3);border:1px solid rgba(167,139,250,.22);background:rgba(109,40,217,.10);padding:2px 6px;border-radius:999px;white-space:nowrap}
.label-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.label-note{font-size:9.5px;color:var(--txt3);line-height:1.35;background:rgba(56,189,248,.055);border:1px solid rgba(56,189,248,.12);padding:8px 10px;border-radius:10px}

.label-btn{margin-left:4px;width:22px;height:22px;border-radius:7px;border:1px solid rgba(167,139,250,.35);background:rgba(109,40,217,.16);color:var(--p3);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-size:12px;vertical-align:middle}
.label-btn:hover{border-color:var(--p2);background:rgba(109,40,217,.28)}



/* ── MOBILE HERO — desktop: oculto ── */
#mob-hero{
  display:none;
  background:linear-gradient(145deg,var(--bg2),var(--bg3));
  border:1px solid var(--border2);border-radius:16px;
  padding:16px 16px 14px;flex-shrink:0;position:relative;overflow:hidden;
}
#mob-hero::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#6d28d9,#8b5cf6,#06b6d4);}
/* Faturamento — linha principal */
.mh-fat-label{font-size:9px;color:var(--txt3);text-transform:uppercase;letter-spacing:.9px;font-weight:700;margin-bottom:3px;}
.mh-fat-val{font-size:30px;font-weight:900;color:var(--txt);letter-spacing:-1.2px;line-height:1.05;}
.mh-fat-cmp-wrap{display:flex;align-items:center;gap:6px;margin-top:5px;}
.mh-badge{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;}
.mh-badge.up{background:rgba(16,185,129,.15);color:var(--green2);}
.mh-badge.dn{background:rgba(220,38,38,.12);color:var(--red2);}
.mh-badge.eq{background:rgba(255,255,255,.06);color:var(--txt3);}
/* Lucro — linha secundária */
.mh-sep{height:1px;background:var(--border);margin:12px 0 10px;}
.mh-luc-row{display:flex;align-items:center;justify-content:space-between;}
.mh-luc-label{font-size:9px;color:var(--txt3);text-transform:uppercase;letter-spacing:.9px;font-weight:700;margin-bottom:2px;}
.mh-luc-val{font-size:18px;font-weight:800;color:var(--green2);letter-spacing:-.5px;}
/* MTD — faturamento do mês abaixo do lucro */
.mh-mtd-row{display:flex;align-items:center;justify-content:space-between;margin-top:8px;padding-top:7px;border-top:1px solid rgba(255,255,255,.06);}
.mh-mtd-label{font-size:9px;color:var(--txt3);text-transform:uppercase;letter-spacing:.9px;font-weight:700;}
.mh-mtd-val{font-size:14px;font-weight:800;color:var(--txt2);letter-spacing:-.3px;}
/* atualização */
.mh-upd{font-size:8px;color:var(--txt3);margin-top:10px;display:flex;align-items:center;gap:4px;}
/* card icon — visível só no mobile */
.mcard-icon{display:none;font-size:18px;margin-bottom:4px;opacity:.8;}

/* ===== MOBILE — SalesSync (único bloco, sem conflito) ===== */
@media (max-width: 768px) {

  /* BASE — scroll acontece no #content, não no body */
  html, body { overflow: hidden; height: 100%; }
  #app.on { position: fixed; inset: 0; }

  /* TOPBAR — linha única, 54px, esconde métricas (ficam nos cards) */
  #topbar {
    position: absolute; top: 0; left: 0; right: 0;
    height: 54px; padding: 0 12px; gap: 8px;
    flex-wrap: nowrap; align-items: center;
  }
  .t-div { display: none; }
  .t-metric { display: none; }          /* lucro/fat já aparecem nos cards */
  .t-name { font-size: 15px; }
  .t-r { margin-left: auto; gap: 4px; }
  .t-chip { padding: 4px 8px; font-size: 10px; }
  .t-btn { width: 30px; height: 30px; font-size: 15px; }

  /* PLATBAR — logo abaixo da topbar */
  #platbar {
    position: absolute; top: 54px; left: 0; right: 0;
    height: 38px; padding: 0 10px; overflow-x: auto;
  }
  #platbar::-webkit-scrollbar { display: none; }
  .pfil { font-size: 10px; padding: 3px 10px; }

  /* PERIOD BAR — abaixo da platbar, largura total */
  #periodbar {
    position: absolute; top: 92px; left: 0; right: 0;
    height: 40px; padding: 0 10px; overflow-x: auto;
  }
  #periodbar::-webkit-scrollbar { display: none; }
  .sync-info { display: none; }
  .pill { font-size: 10px; padding: 4px 11px; }

  /* SIDEBAR → bottom nav */
  #sidebar {
    position: absolute; top: auto; left: 0; right: 0; bottom: 0;
    width: 100%; height: 58px;
    flex-direction: row; justify-content: space-around; align-items: center;
    padding: 0 8px;
    border-right: none; border-top: 1px solid var(--border);
    background: rgba(6, 8, 24, 0.97);
    z-index: 200;
  }
  .s-btn { width: 44px; height: 44px; border-radius: 12px; font-size: 22px; }
  .s-tip, .s-ver, .s-sp { display: none !important; }

  /* CONTENT — preenche entre period bar e bottom nav, scroll interno */
  #content {
    position: absolute;
    top: 132px;   /* 54 topbar + 38 platbar + 40 periodbar */
    left: 0;
    right: 0;
    bottom: 58px; /* altura do bottom nav */
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    padding: 10px 10px 16px;
    display: block;
  }

  /* DASHBOARD mobile — hero + grid estilo MetriZap */
  #mob-hero { display: block; }
  #c-pend-strip { display: none !important; }
  .dash-main-row { grid-template-columns: 1fr; gap: 0; margin-bottom: 0; }
  #ss-chart-panel { display: none !important; }
  .dash-metrics { grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
  /* cards no mobile: ícone + label + valor */
  .mcard, .mcard.sm { padding: 12px 12px 10px; }
  .mcard-icon { display: block; }
  .mcard-accent { height: 3px; border-radius: 3px 3px 0 0; }
  .mcard-label { font-size: 9px; letter-spacing: .4px; margin-bottom: 3px; margin-top: 1px; }
  .mcard-val, .mcard.sm .mcard-val { font-size: 15px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mcard-sub { font-size: 8px; margin-top: 3px; }
  .mcard-cmp { font-size: 9px; margin-top: 4px; }
  .top-panel { width: 100%; min-width: 0; padding: 10px; margin-top: 0; }
  .top-panel-head { flex-direction: column; align-items: flex-start; gap: 8px; }
  .ftabs, .ptabs { width: 100%; overflow-x: auto; flex-wrap: nowrap; padding-bottom: 2px; }
  .ftabs::-webkit-scrollbar, .ptabs::-webkit-scrollbar { display: none; }
  .ftab, .ptab { flex-shrink: 0; font-size: 10px; }
  .prod-list { grid-template-columns: 1fr !important; max-height: none; }
  .page-size-sel { display: none; }

  /* TABELA DE PEDIDOS → cards compactos */
  .tbl-wrap { margin-top: 10px; border-radius: 16px; overflow: hidden; }
  .tbl-head { flex-direction: column; align-items: stretch; gap: 10px; padding: 12px; }
  .tbl-actions { width: 100%; display: grid; grid-template-columns: 1fr 34px; gap: 8px; }
  .srch { width: 100%; height: 38px; font-size: 13px; }
  #tbl-scroll { overflow: visible !important; max-height: none !important; padding: 10px; }

  table { display: block; width: 100%; border-collapse: separate; border-spacing: 0; }
  thead { display: none !important; }
  tbody { display: block; }

  /* date-row separador */
  tbody tr.date-row { display: flex; align-items: center; gap: 8px; margin: 12px 0 6px; background: transparent !important; border: none !important; box-shadow: none !important; border-radius: 0 !important; }
  tbody tr.date-row td { display: block !important; background: transparent; border: none !important; padding: 0 !important; color: var(--p3); font-size: 10px; font-weight: 800; letter-spacing: .5px; text-transform: uppercase; }
  tbody tr.date-row td::before { display: none !important; }
  tbody tr.date-row td:not(:first-child) { display: none !important; }

  /* CARD do pedido */
  tbody tr:not(.date-row) {
    display: grid;
    grid-template-columns: 58px 1fr auto;
    grid-template-rows: auto auto 1px auto;
    background: var(--bg2);
    border: 1px solid var(--border2);
    border-radius: 14px;
    margin-bottom: 10px;
    overflow: hidden;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0,0,0,.18);
    transition: border-color .2s;
  }
  tbody tr:not(.date-row):hover { border-color: rgba(139,92,246,.35); }

  /* Esconde todos os td por padrão */
  tbody tr:not(.date-row) td { display: none; }
  /* Remove pseudo-labels */
  tbody td::before { display: none !important; content: '' !important; }

  /* td[1] Foto — coluna esquerda, rows 1-2 */
  tbody tr:not(.date-row) td:nth-child(1) {
    display: flex; align-items: center; justify-content: center;
    grid-column: 1; grid-row: 1 / 3;
    padding: 12px 8px 12px 12px !important;
  }
  .row-img, .row-img-ph { width: 44px; height: 44px; border-radius: 10px; object-fit: cover; flex-shrink: 0; }

  /* td[2] Produto — col 2, row 1 */
  tbody tr:not(.date-row) td:nth-child(2) {
    display: flex; flex-direction: column; justify-content: center;
    grid-column: 2; grid-row: 1;
    padding: 10px 8px 4px !important;
    text-align: left !important; min-width: 0;
  }
  tbody tr:not(.date-row) td:nth-child(2) > div { max-width: 100% !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* td[6] Status — col 3, row 1 */
  tbody tr:not(.date-row) td:nth-child(6) {
    display: flex; align-items: flex-start; justify-content: flex-end;
    grid-column: 3; grid-row: 1;
    padding: 10px 10px 4px 4px !important;
  }

  /* td[3] Conta — col 2, row 2 */
  tbody tr:not(.date-row) td:nth-child(3) {
    display: flex; align-items: center; gap: 4px;
    grid-column: 2; grid-row: 2;
    padding: 0 8px 10px !important;
    font-size: 9px !important; color: var(--txt3) !important; font-weight: 600;
    text-align: left !important; white-space: nowrap; overflow: hidden;
  }

  /* td[5] Data — col 3, row 2 */
  tbody tr:not(.date-row) td:nth-child(5) {
    display: flex; align-items: center; justify-content: flex-end;
    grid-column: 3; grid-row: 2;
    padding: 0 10px 10px 4px !important;
    font-size: 9px !important; color: var(--txt3) !important;
    white-space: nowrap;
  }

  /* Separador — row 3 (full width) */
  tbody tr:not(.date-row) td:nth-child(7) {
    display: block;
    grid-column: 1 / 4; grid-row: 3;
    height: 1px; background: var(--border);
    padding: 0 !important; font-size: 0;
  }

  /* td[10] Total — col 1-2, row 4 */
  tbody tr:not(.date-row) td:nth-child(10) {
    display: flex; align-items: center; gap: 4px;
    grid-column: 1 / 3; grid-row: 4;
    padding: 9px 10px 9px 14px !important;
    font-size: 14px !important; font-weight: 800; color: var(--txt);
    text-align: left !important;
  }
  tbody tr:not(.date-row) td:nth-child(10)::after {
    content: 'total'; font-size: 8px; color: var(--txt3); font-weight: 600;
    text-transform: uppercase; letter-spacing: .4px; margin-left: 2px;
  }

  /* td[15] Lucro — col 3, row 4 */
  tbody tr:not(.date-row) td:nth-child(15) {
    display: flex; align-items: center; justify-content: flex-end;
    grid-column: 3; grid-row: 4;
    padding: 9px 12px 9px 4px !important;
  }
  .profit-pos, .profit-neg { font-size: 12px !important; font-weight: 800 !important; }

  .tbl-foot { border-radius: 0 0 16px 16px; }

  /* MODAIS */
  .md, .md.wide { max-width: 96vw; max-height: 92dvh; border-radius: 18px; }
  .mo { padding: 8px; align-items: flex-end; }
  .mb, .mh { padding: 14px; }
  .grid2, .date-grid { grid-template-columns: 1fr !important; }
  .mp-stats { grid-template-columns: 1fr 1fr; }
  .prod-cost-form, .prod-cost-card, .cost-create, .cost-card, .default-card { grid-template-columns: 1fr !important; }

  /* TOAST — acima do bottom nav */
  .toast { left: 12px; right: 12px; bottom: 70px; }

  /* LOGIN — tela cheia no mobile */
  .lcard { width: 92vw; padding: 28px 20px; }
}

/* ═══════════════════════════════════════════
   DAILY BRIEF POPUP
═══════════════════════════════════════════ */
@keyframes dbFadeIn{from{opacity:0}to{opacity:1}}
@keyframes dbSlideUp{from{transform:translateY(28px);opacity:0}to{transform:translateY(0);opacity:1}}
#daily-brief-overlay{
  display:none;position:fixed;inset:0;z-index:9999;
  background:rgba(0,0,0,.72);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  align-items:center;justify-content:center;padding:16px;
  animation:dbFadeIn .35s ease;
}
#daily-brief-card{
  background:linear-gradient(150deg,#130a28 0%,#0c1a2e 60%,#091221 100%);
  border:1px solid rgba(139,92,246,.35);border-radius:24px;
  padding:32px 28px 26px;max-width:448px;width:100%;
  box-shadow:0 0 90px rgba(109,40,217,.22),0 24px 60px rgba(0,0,0,.7);
  animation:dbSlideUp .4s ease;position:relative;overflow:hidden;
}
#daily-brief-card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:3px;
  background:linear-gradient(90deg,#6d28d9,#8b5cf6,#06b6d4,#10b981);
}
.db-greeting{font-size:21px;font-weight:900;color:#fff;margin-bottom:3px;line-height:1.2;}
.db-date-str{font-size:10px;color:rgba(148,163,184,.6);text-transform:uppercase;letter-spacing:.9px;font-weight:600;margin-bottom:26px;display:block;}
/* Faturamento — grande */
.db-fat-label{font-size:9px;color:rgba(148,163,184,.55);text-transform:uppercase;letter-spacing:.9px;font-weight:700;margin-bottom:4px;}
.db-fat-val{font-size:46px;font-weight:900;color:#fff;letter-spacing:-2px;line-height:1;margin-bottom:22px;}
/* Secundários */
.db-secondary{display:flex;gap:0;margin-bottom:26px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:14px;overflow:hidden;}
.db-sec-item{flex:1;padding:12px 16px;}
.db-sec-item+.db-sec-item{border-left:1px solid rgba(255,255,255,.07);}
.db-sec-label{font-size:9px;color:rgba(148,163,184,.5);text-transform:uppercase;letter-spacing:.8px;font-weight:700;margin-bottom:4px;}
.db-sec-val{font-size:22px;font-weight:800;letter-spacing:-.5px;color:#e2e8f0;}
.db-sec-sub{font-size:10px;color:rgba(148,163,184,.5);margin-top:1px;}
/* Quote */
.db-quote-wrap{
  background:rgba(139,92,246,.09);border:1px solid rgba(139,92,246,.22);
  border-radius:14px;padding:15px 18px;margin-bottom:22px;text-align:center;
}
.db-quote{font-family:'Caveat',cursive;font-size:23px;font-weight:700;line-height:1.35;color:#c4b5fd;}
/* Botão */
.db-cta-btn{
  width:100%;padding:14px;
  background:linear-gradient(135deg,#6d28d9,#8b5cf6);
  border:none;border-radius:14px;color:#fff;
  font-size:15px;font-weight:800;cursor:pointer;
  font-family:'Inter',sans-serif;letter-spacing:.2px;
  box-shadow:0 4px 24px rgba(109,40,217,.45);
  transition:opacity .2s,transform .1s;
}
.db-cta-btn:hover{opacity:.9;transform:translateY(-1px);}
.db-cta-btn:active{transform:translateY(0);}
/* Fechamento suave */
#daily-brief-overlay.db-hiding{animation:dbFadeIn .35s ease reverse forwards;}

</style>
</head>
<body>

<div id="ld">
  <div class="ld-logo">⚡</div>
  <div class="ld-name">SalesSync</div>
  <div class="ld-bar"><div class="ld-fill"></div></div>
  <div class="ld-st" id="ld-st">Conectando...</div>
</div>

<div class="toast" id="toast"><i class="ti ti-check"></i><span id="tmsg"></span></div>

<!-- LOGIN -->
<div id="ls">
  <div class="lcard">
    <div class="llogo"><div class="llogo-ico">⚡</div><div class="llogo-nm">SalesSync</div></div>
    <div class="ltabs">
      <div class="ltab on" onclick="setLTab('login',this)">Entrar</div>
      <div class="ltab" onclick="setLTab('register',this)">Cadastrar</div>
    </div>
    <div id="tab-login" class="lf">
      <div><label class="lfl">E-mail</label><input class="lfi" type="email" id="l-email" placeholder="seu@email.com"/></div>
      <div><label class="lfl">Senha</label><input class="lfi" type="password" id="l-pass" placeholder="••••••••"/></div>
      <div class="lerr" id="l-err"></div>
      <button class="lbtn" onclick="doLogin()">Entrar</button>
    </div>
    <div id="tab-register" class="lf" style="display:none">
      <div><label class="lfl">Nome da empresa</label><input class="lfi" type="text" id="r-name" placeholder="Minha Loja"/></div>
      <div><label class="lfl">E-mail</label><input class="lfi" type="email" id="r-email" placeholder="seu@email.com"/></div>
      <div><label class="lfl">Senha</label><input class="lfi" type="password" id="r-pass" placeholder="••••••••"/></div>
      <div><label class="lfl">CNPJ (opcional)</label><input class="lfi" type="text" id="r-cnpj" placeholder="00.000.000/0001-00"/></div>
      <div class="lerr" id="r-err"></div>
      <button class="lbtn" onclick="doRegister()">Criar conta</button>
    </div>
  </div>
</div>

<!-- APP -->
<div id="app">
  <!-- TOPBAR -->
  <div id="topbar">
    <div class="t-logo">⚡</div>
    <div class="t-name">SalesSync</div>
    <div class="t-div"></div>
    <div class="t-metric"><span>Faturamento</span><strong id="tb-fat">—</strong></div>
    <div class="t-div"></div>
    <div class="t-metric">
      <span>Lucro</span>
      <strong id="tb-luc" style="color:var(--green2)">—</strong>
      <span id="tb-marg" style="font-size:10px;color:var(--txt3);margin-top:1px">—</span>
    </div>
    <div class="t-div"></div>
    <div class="t-metric" onclick="ssOpenExtraRevenue()" style="cursor:pointer;opacity:.85;transition:opacity .15s" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity='.85'" title="Clique para gerenciar rendimentos extras">
      <span>Rendimentos extras</span>
      <strong id="tb-addrev" style="color:var(--green2)">—</strong>
    </div>
    <div class="t-r">
      <div class="t-chip" onclick="openMo('mo-mp')"><span class="online"></span><span id="tb-user">—</span></div>
      <div class="t-btn" onclick="window.open(API+'/debug/magalu-expedicao?token='+encodeURIComponent(TOKEN),'_blank')" title="Debug Magalu Expedição"><i class="ti ti-truck-delivery"></i></div>
      <div class="t-btn" onclick="window.open(API+'/debug/shopee?token='+encodeURIComponent(TOKEN)+'&days=30','_blank')" title="Debug Shopee"><i class="ti ti-brand-shopee" style="color:#EE4D2D"></i></div>
      <!-- v2.1 — Sino de perguntas ML -->
      <div class="t-btn" id="qa-bell-btn" onclick="qaOpenPanel()" title="Perguntas não respondidas" style="position:relative">
        <i class="ti ti-message-question"></i>
        <span id="qa-badge" style="display:none;position:absolute;top:2px;right:2px;background:#ef4444;color:#fff;font-size:8px;font-weight:800;min-width:14px;height:14px;border-radius:7px;line-height:14px;text-align:center;padding:0 2px;pointer-events:none"></span>
      </div>
      <div class="t-btn" onclick="doSync()" title="Sincronizar"><i class="ti ti-refresh" id="sync-ico"></i></div>
      <div class="t-btn" id="eye-btn" onclick="toggleHide()"><i class="ti ti-eye"></i></div>
      <div class="t-btn" onclick="doLogout()" title="Sair"><i class="ti ti-logout"></i></div>
    </div>
  </div>

  <!-- PLATBAR -->
  <div id="platbar">
    <div class="pfil on" onclick="setPlatFilter('',this)">🌐 Todos</div>
  </div>

  <!-- SIDEBAR -->
  <div id="sidebar">
    <div class="s-btn on" onclick="setSbi(this)"><i class="ti ti-layout-dashboard"></i><span class="s-tip">Dashboard</span></div>
    <div class="s-btn" onclick="openMo('mo-mp')"><i class="ti ti-layout-grid"></i><span class="s-tip">Marketplaces</span></div>
    <div class="s-btn" onclick="ssOpenFullEnvios()"><i class="ti ti-package-import"></i><span class="s-tip">Full Envios</span></div>
    <div class="s-btn" onclick="openMo('mo-cst')"><i class="ti ti-building-bank"></i><span class="s-tip">Custos</span></div>
    <div class="s-btn" onclick="openMo('mo-calc')"><i class="ti ti-calculator"></i><span class="s-tip">Calculadora</span></div>
    <div class="s-btn" onclick="openMo('mo-dre')"><i class="ti ti-chart-bar"></i><span class="s-tip">DRE</span></div>
    <div class="s-sp"></div>
    <div class="s-btn" onclick="openMo('mo-acc')"><i class="ti ti-user-circle"></i><span class="s-tip">Conta</span></div>
    <div class="s-ver">v5.2</div>
  </div>

  <!-- PERIOD BAR -->
  <div id="periodbar">
    <div class="pill on" onclick="setPeriod(this,1)">Hoje</div>
    <div class="pill" onclick="setPeriodYesterday(this)">Ontem</div>
    <div class="pill" onclick="setPeriod(this,7)">7 dias</div>
    <div class="pill" onclick="setPeriod(this,30)">30 dias</div>
    <div class="pill" onclick="setCustomPeriod(this)"><i class="ti ti-calendar"></i> Data personalizada</div>
    <div class="pill" onclick="abrirCustoZeroLista()" style="color:#fbbf24;border-color:rgba(251,191,36,.3)" id="pill-custo-zero" title="Produtos sem custo cadastrado"><i class="ti ti-alert-triangle"></i> Custo zero</div>
    <div class="sync-info"><i class="ti ti-clock" style="font-size:13px"></i> <span id="next-sync">15:00</span> · <span id="last-sync">—</span></div>
  </div>

  <!-- CONTENT — SCROLLA AQUI -->
  <div id="content">

    <!-- MOBILE HERO — faturamento + lucro (oculto no desktop) -->
    <div id="mob-hero">
      <div class="mh-fat-label">Faturamento</div>
      <div class="mh-fat-val" id="mh-fat-val">—</div>
      <div class="mh-fat-cmp-wrap">
        <span class="mh-badge eq" id="mh-fat-cmp">— igual ao anterior</span>
      </div>
      <div class="mh-sep"></div>
      <div class="mh-luc-row">
        <div>
          <div class="mh-luc-label">Lucro</div>
          <div class="mh-luc-val" id="mh-luc-val">—</div>
        </div>
        <span class="mh-badge eq" id="mh-luc-cmp">—</span>
      </div>
      <div class="mh-mtd-row">
        <span class="mh-mtd-label">Fat. do mês</span>
        <span class="mh-mtd-val" id="mh-mtd-val">—</span>
      </div>
      <div id="mh-pend" style="display:none;align-items:center;gap:5px;margin-top:8px;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.2);border-radius:7px;padding:5px 10px;"></div>
      <div class="mh-upd"><i class="ti ti-refresh" style="font-size:9px"></i> Última atualização: <span id="mh-upd-time">—</span></div>
    </div>

    <!-- DASHBOARD: linha 1 — métricas + gráfico -->
    <div class="dash-main-row">
      <!-- Métricas em 2 linhas × 4 colunas -->
      <div class="dash-metrics">
        <!-- Linha 1: principais (big) -->
        <div class="mcard"><div class="mcard-accent" style="--ca:linear-gradient(90deg,#6d28d9,#8b5cf6)"></div>
          <i class="ti ti-shopping-bag mcard-icon" style="color:#a78bfa"></i>
          <div class="mcard-label">Pedidos</div>
          <div class="mcard-val" id="c-ped">—</div>
          <div class="mcard-sub" id="c-ped2"></div>
          <div id="cmp-ped"></div>
        </div>
        <div class="mcard"><div class="mcard-accent" style="--ca:linear-gradient(90deg,#0284c7,#38bdf8)"></div>
          <i class="ti ti-receipt mcard-icon" style="color:#38bdf8"></i>
          <div class="mcard-label">Ticket Médio</div>
          <div class="mcard-val" id="c-tkt">—</div>
          <div id="cmp-tkt"></div>
        </div>
        <div class="mcard"><div class="mcard-accent" style="--ca:linear-gradient(90deg,#059669,#10b981)"></div>
          <i class="ti ti-trending-up mcard-icon" style="color:#10b981"></i>
          <div class="mcard-label">Lucro Total</div>
          <div class="mcard-val" id="c-luc" style="color:var(--green2)">—</div>
          <div class="mcard-sub" id="c-marg"></div>
          <div id="cmp-luc"></div>
        </div>
        <div class="mcard"><div class="mcard-accent" style="--ca:linear-gradient(90deg,#dc2626,#f87171)"></div>
          <i class="ti ti-circle-x mcard-icon" style="color:#f87171"></i>
          <div class="mcard-label">Cancelados</div>
          <div class="mcard-val" id="c-can" style="color:var(--red2)">—</div>
          <div id="cmp-can"></div>
        </div>
        <!-- Faixa pendentes (desktop) — aparece só quando tem pedidos aguardando -->
        <div id="c-pend-strip" style="display:none;grid-column:1/-1;align-items:center;gap:10px;background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.2);border-radius:9px;padding:7px 14px;"></div>
        <!-- Linha 2: secundárias (sm) -->
        <div class="mcard sm"><div class="mcard-accent" style="--ca:linear-gradient(90deg,#ea580c,#fb923c)"></div>
          <i class="ti ti-coin mcard-icon" style="color:#fb923c"></i>
          <div class="mcard-label">Custos</div>
          <div class="mcard-val" id="c-cust" style="color:var(--orange2)">—</div>
          <div class="mcard-sub" id="c-custp"></div>
        </div>
        <div class="mcard sm"><div class="mcard-accent" style="--ca:linear-gradient(90deg,#475569,#94a3b8)"></div>
          <i class="ti ti-percentage mcard-icon" style="color:#94a3b8"></i>
          <div class="mcard-label">Tarifas</div>
          <div class="mcard-val" id="c-tar">—</div>
          <div class="mcard-sub" id="c-tarp"></div>
        </div>
        <div class="mcard sm"><div class="mcard-accent" style="--ca:linear-gradient(90deg,#0284c7,#38bdf8)"></div>
          <i class="ti ti-building-bank mcard-icon" style="color:#38bdf8"></i>
          <div class="mcard-label">Impostos</div>
          <div class="mcard-val" id="c-imp" style="color:var(--blue2)">—</div>
          <div class="mcard-sub" id="c-impp"></div>
        </div>
        <div class="mcard sm"><div class="mcard-accent" style="--ca:linear-gradient(90deg,#d97706,#fbbf24)"></div>
          <i class="ti ti-truck mcard-icon" style="color:#fbbf24"></i>
          <div class="mcard-label">Frete</div>
          <div class="mcard-val" id="c-fre" style="color:var(--yellow2)">—</div>
          <div class="mcard-sub" id="c-frep"></div>
        </div>
      </div>

      <!-- Gráfico de barras — coluna direita -->
      <div class="top-panel" id="ss-chart-panel" style="display:flex;flex-direction:column;min-width:0;padding:12px 14px 10px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="width:8px;height:8px;border-radius:50%;background:var(--p3);flex-shrink:0;display:inline-block;"></span>
            <span style="font-size:10.5px;font-weight:700;color:var(--txt2)">Valor Faturado</span>
          </div>
          <div id="ss-chart-tabs" style="display:flex;gap:1px;">
            <button class="ctab active" data-p="0"   onclick="ssChartSetPeriod(0)">Mês</button>
            <button class="ctab"        data-p="7"   onclick="ssChartSetPeriod(7)">7D</button>
            <button class="ctab"        data-p="30"  onclick="ssChartSetPeriod(30)">30D</button>
            <button class="ctab"        data-p="90"  onclick="ssChartSetPeriod(90)">3M</button>
            <button class="ctab"        data-p="365" onclick="ssChartSetPeriod(365)">12M</button>
          </div>
        </div>
        <div id="ss-chart-total" style="font-size:20px;font-weight:800;color:var(--txt);letter-spacing:-0.5px;margin-bottom:10px;min-height:26px;">R$ —</div>
        <div id="ss-chart-wrap" style="position:relative;flex:1;min-height:90px;">
          <canvas id="ss-daily-canvas" style="display:block;"></canvas>
          <div id="ss-chart-tip" style="display:none;position:absolute;pointer-events:none;background:var(--bg2);border:1px solid var(--border2);border-radius:10px;padding:8px 11px;font-size:11px;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.4);z-index:10;min-width:160px;max-width:220px;"></div>
        </div>
      </div>
    </div>

    <!-- DASHBOARD: linha 2 — produtos (full width) -->
    <div class="top-panel prod-panel-full">
      <div class="top-panel-head">
        <div class="ftabs">
          <div class="ftab on" onclick="setFTab(this,'all')">Todos</div>
          <div class="ftab" onclick="setFTab(this,'normal')">🏪 Normal</div>
          <div class="ftab" onclick="setFTab(this,'full')">📦 Full</div>
        </div>
        <div class="ptabs">
          <div class="ptab on" onclick="setPTab(this,'fat')">Faturamento</div>
          <div class="ptab" onclick="setPTab(this,'lucro')">Lucro</div>
          <div class="ptab" onclick="setPTab(this,'vendas')">Vendas</div>
          <div class="ptab" onclick="setPTab(this,'canceladas')">Canceladas</div>
        </div>
      </div>
      <!-- v2.1 — warnings de SKU sem custo -->
      <div id="sku-warn-container"></div>
      <div class="prod-list" id="prod-list"><div class="empty"><div class="spin"></div></div></div>
    </div>

    <!-- TABLE -->
    <div class="tbl-wrap">
      <div class="tbl-head">
        <div class="tbl-title"><i class="ti ti-package" style="font-size:16px"></i> Pedidos</div>
        <div class="tbl-actions">
          <input class="srch" id="srch" placeholder="Buscar título, SKU..." oninput="filterTable(this.value)"/>
          <div class="ic-btn" onclick="exportCSV()" title="Exportar CSV"><i class="ti ti-download"></i></div>
        </div>
      </div>
      <div id="tbl-scroll">
        <table>
          <thead><tr>
            <th>Foto</th>
            <th>Título / ID</th>
            <th>Conta</th>
            <th>SKU</th>
            <th>Data</th>
            <th>Status</th>
            <th>Envio</th>
            <th>Tipo</th>
            <th>Qtde</th>
            <th>Valor</th>
            <th>Tarifa</th>
            <th>Frete</th>
            <th>Imposto</th>
            <th>Custo Prod.</th>
            <th>Lucro</th>
          </tr></thead>
          <tbody id="orders-body"><tr><td colspan="15"><div class="empty"><div class="spin"></div><p>Carregando...</p></div></td></tr></tbody>
        </table>
      </div>
      <div class="tbl-foot">
        <span style="font-size:10px;color:var(--txt3)" id="orders-count">—</span>
        <div class="page-size-sel">
          <span>Exibir</span>
          <select id="page-size-select" onchange="setPageSize(+this.value)">
            <option value="10">10</option>
            <option value="20" selected>20</option>
            <option value="50">50</option>
          </select>
          <span>por página</span>
        </div>
        <div style="display:flex;gap:4px;align-items:center;">
          <div class="page-btn" onclick="changePage(-1)"><i class="ti ti-chevron-left"></i></div>
          <span style="font-size:10px;color:var(--txt2);padding:0 8px" id="page-info">1 de 1</span>
          <div class="page-btn" onclick="changePage(1)"><i class="ti ti-chevron-right"></i></div>
        </div>
      </div>
    </div>
  </div><!-- /content -->
</div><!-- /app -->

<!-- AI ASSISTANT PANEL -->
<div id="ai-panel" style="
  position:fixed;top:0;right:0;bottom:0;width:360px;
  background:var(--bg2);border-left:1px solid var(--border2);
  display:flex;flex-direction:column;z-index:500;
  transform:translateX(100%);transition:transform .28s cubic-bezier(.4,0,.2,1);
  box-shadow:-8px 0 40px rgba(0,0,0,.5);
">
  <!-- Header -->
  <div style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border);flex-shrink:0;background:var(--bg3);">
    <div style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#6d28d9,#a78bfa);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">🤖</div>
    <div>
      <div style="font-size:13px;font-weight:800;letter-spacing:-.3px">Assistente IA</div>
      <div style="font-size:9px;color:var(--txt3)">Powered by GPT-4o mini · dados reais da conta</div>
    </div>
    <button onclick="ssCloseAI()" style="margin-left:auto;width:28px;height:28px;border-radius:8px;background:var(--bg4);border:1px solid var(--border);color:var(--txt3);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">×</button>
  </div>

  <!-- Sugestões rápidas -->
  <div id="ai-suggestions" style="padding:12px;display:flex;flex-wrap:wrap;gap:6px;border-bottom:1px solid var(--border);flex-shrink:0;">
    <div style="font-size:9px;color:var(--txt3);width:100%;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Perguntas rápidas</div>
    <button class="ai-sug" onclick="ssAISend('Qual é a previsão de faturamento e lucro para este mês?')">📈 Previsão do mês</button>
    <button class="ai-sug" onclick="ssAISend('Quais produtos estão com margem ruim e o que devo ajustar?')">⚠️ Margem ruim</button>
    <button class="ai-sug" onclick="ssAISend('Analise minhas devoluções e dê dicas para reduzir.')">↩️ Devoluções</button>
    <button class="ai-sug" onclick="ssAISend('Qual produto devo focar em vender mais este mês?')">🚀 Foco do mês</button>
    <button class="ai-sug" onclick="ssAISend('Como estão minhas tarifas e impostos? Estão altos?')">💸 Taxas</button>
    <button class="ai-sug" onclick="ssAISend('Gera uma planilha CSV com todos os pedidos da tela, incluindo produto, valor, lucro e status.')">📥 Exportar planilha</button>
    <button class="ai-sug" onclick="ssAISend('Adicionar faturamento de R$ ')">💰 Add receita</button>
    <button class="ai-sug" onclick="ssAISend('Listar meus rendimentos extras')">📋 Ver receitas</button>
  </div>

  <!-- Mensagens -->
  <div id="ai-messages" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;">
    <div class="ai-msg bot" style="align-self:flex-start;">
      <div class="ai-bubble bot">Olá! Sou seu assistente de vendas. Tenho acesso aos seus dados reais — faturamento, lucro, produtos, devoluções e previsões. Como posso ajudar? 😊</div>
    </div>
  </div>

  <!-- Input -->
  <div style="padding:12px;border-top:1px solid var(--border);flex-shrink:0;background:var(--bg3);">
    <div style="display:flex;gap:8px;align-items:flex-end;">
      <textarea id="ai-input" placeholder="Pergunte algo sobre seu negócio..." rows="2"
        style="flex:1;background:var(--bg4);border:1px solid var(--border2);border-radius:10px;color:var(--txt);padding:9px 12px;font-size:12px;font-family:'Inter',sans-serif;resize:none;outline:none;line-height:1.45;max-height:100px;"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();ssAISendInput()}"></textarea>
      <button onclick="ssAISendInput()" id="ai-send-btn" style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,var(--p),var(--p2));border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;box-shadow:0 4px 12px var(--glow);transition:opacity .15s;">
        <i class="ti ti-send"></i>
      </button>
    </div>
    <div style="font-size:9px;color:var(--txt3);margin-top:6px;text-align:center">Enter para enviar · Shift+Enter para nova linha</div>
  </div>
</div>

<!-- Botão flutuante para abrir AI -->
<div id="ai-fab" onclick="ssToggleAI()" style="
  position:fixed;bottom:80px;right:16px;
  width:48px;height:48px;border-radius:14px;
  background:linear-gradient(135deg,#6d28d9,#a78bfa);
  display:none;align-items:center;justify-content:center;
  font-size:22px;cursor:pointer;z-index:499;
  box-shadow:0 8px 24px rgba(109,40,217,.5);
  transition:transform .15s,box-shadow .15s;
" title="Assistente IA">🤖</div>

<!-- MODAIS -->
<div class="mo" id="mo-order" onclick="closeBg(event,'mo-order')">
  <div class="md wide"><div class="mh"><div class="mh-left"><div class="mh-ico"><i class="ti ti-receipt"></i></div><div><div class="mh-title" id="od-title">Pedido</div><div class="mh-sub" id="od-sub">—</div></div></div><div class="mh-close" onclick="closeMo('mo-order')"><i class="ti ti-x"></i></div></div>
  <div class="mb" id="od-body"><div class="empty"><div class="spin"></div></div></div></div>
</div>

<div class="mo" id="mo-mp" onclick="closeBg(event,'mo-mp')">
  <div class="md"><div class="mh"><div class="mh-left"><div class="mh-ico"><i class="ti ti-layout-grid"></i></div><div><div class="mh-title">Marketplaces</div></div></div><div class="mh-close" onclick="closeMo('mo-mp')"><i class="ti ti-x"></i></div></div>
  <div class="mb" id="mp-body"><div class="empty"><div class="spin"></div></div></div></div>
</div>

<div class="mo" id="mo-full-envios" onclick="closeBg(event,'mo-full-envios')">
  <div class="md wide" style="width:98vw;max-width:1500px;max-height:96vh;display:flex;flex-direction:column;overflow:hidden">
    <div class="mh" style="flex-shrink:0;background:linear-gradient(135deg,rgba(56,189,248,.10),rgba(109,40,217,.12));border-bottom:1px solid var(--border2)">
      <div class="mh-left">
        <div class="mh-ico" style="background:linear-gradient(135deg,rgba(56,189,248,.20),rgba(109,40,217,.20));color:var(--blue2)"><i class="ti ti-package-import"></i></div>
        <div>
          <div class="mh-title">Full Envios — ML Fulfillment</div>
          <div class="mh-sub">Estoque no armazém · Operações · Custos</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="ib" onclick="ssLoadFullEnvios(true)" title="Atualizar"><i class="ti ti-refresh"></i></button>
        <div class="mh-close" onclick="closeMo('mo-full-envios')"><i class="ti ti-x"></i></div>
      </div>
    </div>
    <div id="full-envios-body" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:14px"></div>
  </div>
</div>

<div class="mo" id="mo-cst" onclick="closeBg(event,'mo-cst')">
  <div class="md wide"><div class="mh"><div class="mh-left"><div class="mh-ico"><i class="ti ti-building-bank"></i></div><div><div class="mh-title">Custos por SKU</div><div class="mh-sub">Imposto padrão por plataforma + custo individual por SKU</div></div></div><div class="mh-close" onclick="closeMo('mo-cst')"><i class="ti ti-x"></i></div></div>
  <div class="mb">
    <div class="cost-panel">
      <div class="cost-defaults">
        <div class="cost-defaults-title"><strong><i class="ti ti-percentage"></i> Padrões da plataforma</strong><div class="cost-tools"><span>Imposto padrão aplica em todos os SKUs sem imposto próprio.</span><button class="cost-mini-btn" onclick="resetProductValues()"><i class="ti ti-eraser"></i> Zerar valores</button><button class="cost-mini-btn danger" onclick="deleteAllProducts()"><i class="ti ti-trash"></i> Apagar tudo</button></div></div>
        <div class="default-grid" id="platform-defaults"><div class="empty"><div class="spin"></div></div></div>
        <div class="auto-note"><span class="auto-badge">ML automático</span> Mercado Livre agora puxa tarifa real do campo <b>sale_fee</b> e frete do <b>payments.shipping_cost</b>. Só preencha Tarifa/Frete padrão se quiser sobrescrever.</div>
      </div>
      <div class="cost-create" style="grid-template-columns:150px 1fr 1.4fr 120px 42px;">
        <select class="plat-select" id="new-platform">
          <option value="mercadolivre">Mercado Livre</option>
          <option value="magalu">Magalu</option>
          <option value="shopee">Shopee</option>
          <option value="geral">Geral</option>
        </select>
        <input id="new-sku" placeholder="SKU"/>
        <input id="new-name" placeholder="Nome do produto"/>
        <input id="new-cost" placeholder="Custo R$" type="number" step="0.01"/>
        <button class="btn primary" style="width:42px;height:34px;padding:0;" onclick="addProduct()"><i class="ti ti-plus"></i></button>
      </div>
      <div class="cost-help">Agora o normal é cadastrar só o SKU + custo do produto. Imposto vem do padrão da plataforma. Se um SKU precisar imposto/tarifa/frete diferente, edite diretamente na linha dele.</div>
      <div class="cost-list" id="products-list"><div class="empty"><div class="spin"></div></div></div>
    </div>
  </div></div>
</div>

<div class="mo" id="mo-calc" onclick="closeBg(event,'mo-calc')">
  <div class="md"><div class="mh"><div class="mh-left"><div class="mh-ico"><i class="ti ti-calculator"></i></div><div><div class="mh-title">Calculadora</div></div></div><div class="mh-close" onclick="closeMo('mo-calc')"><i class="ti ti-x"></i></div></div>
  <div class="mb"><div class="grid2">
    <div class="fi"><label>Preço venda (R$)</label><input type="number" id="cp" value="299.90" oninput="calc()"/></div>
    <div class="fi"><label>Custo produto (R$)</label><input type="number" id="cc" value="120" oninput="calc()"/></div>
    <div class="fi"><label>Tarifa (%)</label><input type="number" id="ct" value="12" oninput="calc()"/></div>
    <div class="fi"><label>Imposto (%)</label><input type="number" id="ci2" value="6" oninput="calc()"/></div>
    <div class="fi"><label>Frete (R$)</label><input type="number" id="cfr" value="15" oninput="calc()"/></div>
    <div class="fi"><label>Ads (R$)</label><input type="number" id="cads" value="0" oninput="calc()"/></div>
  </div>
  <div class="calc-result">
    <div class="cr-row"><span class="l">Receita</span><span class="v" id="rr">—</span></div>
    <div class="cr-row"><span class="l">− Tarifa</span><span class="v" style="color:var(--red2)" id="rt">—</span></div>
    <div class="cr-row"><span class="l">− Imposto</span><span class="v" style="color:var(--blue2)" id="ri">—</span></div>
    <div class="cr-row"><span class="l">− Frete</span><span class="v" style="color:var(--yellow2)" id="rfr">—</span></div>
    <div class="cr-row"><span class="l">− Custo</span><span class="v" style="color:var(--orange2)" id="rc">—</span></div>
    <div class="cr-row" style="border-top:1px solid rgba(109,40,217,.2);margin-top:6px;padding-top:8px"><span class="l" style="font-weight:700;font-size:13px;color:var(--txt)">Lucro líquido</span><span class="v" id="rl" style="font-size:16px">—</span></div>
    <div class="cr-row"><span class="l">Margem</span><span class="v" id="rm">—</span></div>
    <div class="cr-row"><span class="l">ROAS</span><span class="v" id="rroas">—</span></div>
  </div></div></div>
</div>


<!-- MODAL DATA PERSONALIZADA -->
<div class="mo" id="mo-date" onclick="closeBg(event,'mo-date')">
  <div class="md" style="max-width:430px;">
    <div class="mh">
      <div class="mh-left">
        <div class="mh-ico"><i class="ti ti-calendar"></i></div>
        <div>
          <div class="mh-title">Data personalizada</div>
          <div class="mh-sub">Selecione um período de até 45 dias</div>
        </div>
      </div>
      <div class="mh-close" onclick="closeMo('mo-date')"><i class="ti ti-x"></i></div>
    </div>
    <div class="mb">
      <div class="grid2">
        <div class="fi">
          <label>Data inicial</label>
          <input type="date" id="custom-date-from" onchange="syncCustomDateLimits()"/>
        </div>
        <div class="fi">
          <label>Data final</label>
          <input type="date" id="custom-date-to"/>
        </div>
      </div>
      <div class="note"><i class="ti ti-info-circle"></i> O limite é de 45 dias para evitar sobrecarga nas APIs dos marketplaces.</div>
      <button class="btn primary" onclick="applyCustomDate()"><i class="ti ti-check"></i> Aplicar filtro</button>
    </div>
  </div>
</div>

<div class="mo" id="mo-dre" onclick="closeBg(event,'mo-dre')">
  <div class="md"><div class="mh"><div class="mh-left"><div class="mh-ico"><i class="ti ti-chart-bar"></i></div><div><div class="mh-title">DRE</div><div class="mh-sub" id="dre-per">—</div></div></div><div class="mh-close" onclick="closeMo('mo-dre')"><i class="ti ti-x"></i></div></div>
  <div class="mb" id="dre-body"><div class="empty"><div class="spin"></div></div></div></div>
</div>

<!-- BALÕES SKU SEM CUSTO v2.1 -->
<div id="sku-bubbles"></div>

<!-- PAINEL PERGUNTAS ML v2.1 -->
<div id="qa-panel" style="display:none;position:fixed;top:0;right:0;width:400px;max-width:100vw;height:100vh;background:var(--bg2);border-left:1px solid var(--border2);z-index:9000;flex-direction:column;box-shadow:-8px 0 40px rgba(0,0,0,.4)">
  <div style="padding:16px 20px;border-bottom:1px solid var(--border2);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
    <div style="display:flex;align-items:center;gap:10px">
      <i class="ti ti-message-question" style="font-size:18px;color:var(--p3)"></i>
      <div>
        <div style="font-size:13px;font-weight:700">Perguntas não respondidas</div>
        <div style="font-size:10px;color:var(--txt3)" id="qa-panel-sub">Mercado Livre</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:8px">
      <div class="ib" onclick="qaLoad()" title="Atualizar"><i class="ti ti-refresh" id="qa-refresh-ico"></i></div>
      <div class="ib" onclick="qaClosePanel()"><i class="ti ti-x"></i></div>
    </div>
  </div>
  <div id="qa-list" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px">
    <div class="empty"><div class="spin"></div></div>
  </div>
</div>
<div id="qa-overlay" onclick="qaClosePanel()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:8999"></div>

<!-- MODAL PLANOS -->
<div class="mo" id="mo-planos" onclick="closeBg(event,'mo-planos')">
  <div class="md" style="max-width:520px;">
    <div class="mh"><div class="mh-left"><div class="mh-ico"><i class="ti ti-crown"></i></div><div><div class="mh-title">Planos SaleSync</div><div class="mh-sub">Escolha o plano ideal para o seu negócio</div></div></div><div class="mh-close" onclick="closeMo('mo-planos')"><i class="ti ti-x"></i></div></div>
    <div class="mb" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;padding:20px">

      <!-- Simples -->
      <div id="plan-card-simple" style="border:2px solid var(--border2);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:8px;transition:border-color .2s">
        <div style="font-size:10px;font-weight:700;color:#60a5fa;text-transform:uppercase;letter-spacing:1px">Simples</div>
        <div style="font-size:22px;font-weight:800">R$ 0<span style="font-size:11px;font-weight:400;color:var(--txt3)">/mês</span></div>
        <div style="font-size:10px;color:var(--txt3);line-height:1.6;flex:1">
          ✓ 1 conta por plataforma<br>
          ✓ Dashboard completo<br>
          ✓ Sincronização automática<br>
          ✓ Histórico 30 dias<br>
          ✗ DRE avançado<br>
          ✗ Emissão de NF<br>
          ✗ Estoque<br>
          ✗ Multi-contas
        </div>
        <div id="plan-btn-simple" style="text-align:center;font-size:10px;font-weight:700;padding:7px;border-radius:8px;background:var(--bg4);color:var(--txt3);cursor:default">Plano atual</div>
      </div>

      <!-- Pro -->
      <div id="plan-card-pro" style="border:2px solid var(--p2);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:8px;background:rgba(109,40,217,.05);position:relative;transition:border-color .2s">
        <div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:var(--p);color:#fff;font-size:9px;font-weight:800;padding:2px 10px;border-radius:20px;white-space:nowrap">MAIS POPULAR</div>
        <div style="font-size:10px;font-weight:700;color:var(--p3);text-transform:uppercase;letter-spacing:1px">Pro</div>
        <div style="font-size:22px;font-weight:800">R$ 49<span style="font-size:11px;font-weight:400;color:var(--txt3)">/mês</span></div>
        <div style="font-size:10px;color:var(--txt3);line-height:1.6;flex:1">
          ✓ 3 contas por plataforma<br>
          ✓ Dashboard completo<br>
          ✓ DRE avançado<br>
          ✓ Emissão de NF<br>
          ✓ Controle de estoque<br>
          ✓ Pesquisa de mercado<br>
          ✓ Histórico 90 dias<br>
          ✗ Contas ilimitadas
        </div>
        <div id="plan-btn-pro" onclick="planContact('pro')" style="text-align:center;font-size:10px;font-weight:700;padding:7px;border-radius:8px;background:var(--p);color:#fff;cursor:pointer">Quero o Pro</div>
      </div>

      <!-- Business -->
      <div id="plan-card-business" style="border:2px solid rgba(251,191,36,.3);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:8px;transition:border-color .2s">
        <div style="font-size:10px;font-weight:700;color:#fbbf24;text-transform:uppercase;letter-spacing:1px">Business</div>
        <div style="font-size:22px;font-weight:800">R$ 99<span style="font-size:11px;font-weight:400;color:var(--txt3)">/mês</span></div>
        <div style="font-size:10px;color:var(--txt3);line-height:1.6;flex:1">
          ✓ Contas ilimitadas<br>
          ✓ Tudo do Pro<br>
          ✓ Multi-CNPJ / Multi-empresa<br>
          ✓ Histórico ilimitado<br>
          ✓ Prioridade no suporte<br>
          ✓ Relatórios exportáveis<br>
          ✓ API de integração<br>
          ✓ Onboarding dedicado
        </div>
        <div id="plan-btn-business" onclick="planContact('business')" style="text-align:center;font-size:10px;font-weight:700;padding:7px;border-radius:8px;background:rgba(251,191,36,.15);color:#fbbf24;border:1px solid rgba(251,191,36,.3);cursor:pointer">Quero o Business</div>
      </div>

    </div>
    <div style="padding:0 20px 20px;text-align:center;font-size:10px;color:var(--txt3)">Dúvidas? Fale conosco em <strong style="color:var(--p3)">suporte@salesync.shop</strong></div>
  </div>
</div>

<div class="mo" id="mo-acc" onclick="closeBg(event,'mo-acc')">
  <div class="md" style="max-width:380px;"><div class="mh"><div class="mh-left"><div class="mh-ico"><i class="ti ti-user-circle"></i></div><div><div class="mh-title">Minha Conta</div></div></div><div class="mh-close" onclick="closeMo('mo-acc')"><i class="ti ti-x"></i></div></div>
  <div class="mb">
    <div style="display:flex;align-items:center;gap:14px;background:var(--bg3);border:1px solid var(--border2);border-radius:14px;padding:14px 16px;">
      <div style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,var(--p),var(--p2));display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;box-shadow:0 4px 16px var(--glow);" id="acc-ava">?</div>
      <div><div style="font-size:15px;font-weight:700;" id="acc-name">—</div><div style="font-size:11px;color:var(--txt3);margin-top:2px;" id="acc-email">—</div>
        <div style="margin-top:6px;"><span style="background:rgba(109,40,217,.15);color:var(--p3);font-size:9px;font-weight:700;padding:2px 9px;border-radius:20px;border:1px solid rgba(109,40,217,.25);" id="acc-plan">—</span></div>
      </div>
    </div>
    <button class="btn ghost" onclick="planOpenUpgrade()" style="margin-top:4px;font-size:11px"><i class="ti ti-crown"></i> Ver planos e fazer upgrade</button>
    <button class="btn primary" onclick="ssOpenGoalSettings()"><i class="ti ti-target-arrow"></i> Meta de faturamento</button>
    <div class="ss-account-main-actions">
      <button class="btn ghost" onclick="ssOpenAnalytics()"><i class="ti ti-chart-bar"></i> Resumo</button>
      <button class="btn ghost" onclick="ssOpenExtraRevenue()"><i class="ti ti-plus"></i> Adicionar faturamento</button>
    </div>
    <!-- DEBUG TOGGLE -->
    <div id="debug-toggle-row" style="display:flex;align-items:center;justify-content:space-between;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);border-radius:10px;padding:10px 14px;">
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--red2);display:flex;align-items:center;gap:6px;"><i class="ti ti-bug"></i> Modo Debug</div>
        <div style="font-size:9px;color:var(--txt3);margin-top:2px">Exibe informações técnicas nas colunas</div>
      </div>
      <div onclick="ssToggleDebug()" id="debug-toggle-btn" style="width:40px;height:22px;border-radius:11px;background:var(--bg4);border:1px solid var(--border2);cursor:pointer;position:relative;transition:background .2s;flex-shrink:0;">
        <div id="debug-toggle-knob" style="width:16px;height:16px;border-radius:50%;background:var(--txt3);position:absolute;top:2px;left:2px;transition:all .2s;"></div>
      </div>
    </div>
    <!-- ACORDAR BACKEND DO RENDER (free tier dorme após inatividade) -->
    <button class="btn ghost" id="cs-wake-btn" onclick="csWakeServer()" style="font-size:11px"><i class="ti ti-zap"></i> Acordar servidor (Render)</button>
    <button class="btn ghost" onclick="doLogout()"><i class="ti ti-logout"></i> Sair da conta</button>
  </div></div>
</div>

<script>
// SalesSync v2.8
const API='https://salesync-backend.onrender.com';
let TOKEN=localStorage.getItem('ss_token')||'';
let USER=JSON.parse(localStorage.getItem('ss_user')||'null');
// v2.1 — ACC_FILTER: filtra por conta específica (shop_name) além da plataforma
let ALL=[],FILTERED=[],PAGE=1,PERIOD=1,HIDDEN=false,PTAB='fat',FTAB='all',PLAT='',ACC_FILTER='',CUSTOM_FROM='',CUSTOM_TO='';
let ACCOUNTS=[],DASH={},CD=300;

// ── Sistema de Planos
const PLAN_CONFIG={
  free:    {label:'Free',    maxAccounts:1, color:'var(--txt3)',  modules:['mp','cst','calc']},
  simple:  {label:'Simples', maxAccounts:1, color:'#60a5fa',     modules:['mp','cst','calc']},
  pro:     {label:'Pro',     maxAccounts:3, color:'var(--p3)',    modules:['mp','cst','calc','dre','nf','estoque','pesquisa']},
  business:{label:'Business',maxAccounts:99,color:'#fbbf24',     modules:['mp','cst','calc','dre','nf','estoque','pesquisa']},
};
function planCfg(){return PLAN_CONFIG[USER?.plan||'free']||PLAN_CONFIG.free;}
function planHas(mod){const m=planCfg().modules;return m==='all'||m.includes(mod);}
function planMaxAccounts(){return planCfg().maxAccounts;}
function planAccountsOf(plat){return ACCOUNTS.filter(a=>a.platform===plat&&a.is_connected).length;}
function planCanAddAccount(plat){return planAccountsOf(plat)<planMaxAccounts();}
function planNeedsUpgrade(neededPlan){
  const order=['free','simple','pro','business'];
  return order.indexOf(USER?.plan||'free')<order.indexOf(neededPlan);
}
window.SS_DEBUG=localStorage.getItem('ss_debug')==='1';
function ssToggleDebug(){
  window.SS_DEBUG=!window.SS_DEBUG;
  localStorage.setItem('ss_debug',window.SS_DEBUG?'1':'0');
  const btn=document.getElementById('debug-toggle-btn');
  const knob=document.getElementById('debug-toggle-knob');
  if(btn)btn.style.background=window.SS_DEBUG?'rgba(239,68,68,.6)':'var(--bg4)';
  if(knob){knob.style.left=window.SS_DEBUG?'22px':'2px';knob.style.background=window.SS_DEBUG?'#fff':'var(--txt3)';}
  renderOrders(); // re-renderiza tabela com/sem debug
  if(window.SS_DEBUG)toast('🐛 Debug ON — colunas técnicas visíveis');
  else toast('Debug OFF');
}
function ssInitDebugToggle(){
  const btn=document.getElementById('debug-toggle-btn');
  const knob=document.getElementById('debug-toggle-knob');
  if(btn)btn.style.background=window.SS_DEBUG?'rgba(239,68,68,.6)':'var(--bg4)';
  if(knob){knob.style.left=window.SS_DEBUG?'22px':'2px';knob.style.background=window.SS_DEBUG?'#fff':'var(--txt3)';}
}

const STATUS_PT={paid:'Pago',pending:'Ag. Pgto',shipped:'Em Rota',delivered:'Entregue',cancelled:'Cancelado',approved:'Aprovado',new:'Novo',processing:'Processando',invoiced:'Faturado',finished:'Finalizado'};
const STATUS_CLR={paid:'#10b981',pending:'#fbbf24',invoiced:'#f59e0b',shipped:'#38bdf8',delivered:'#a78bfa',cancelled:'#f87171',approved:'#10b981',finished:'#a78bfa'};
const STATUS_BG={paid:'rgba(16,185,129,.1)',pending:'rgba(251,191,36,.1)',invoiced:'rgba(245,158,11,.12)',shipped:'rgba(56,189,248,.1)',delivered:'rgba(167,139,250,.1)',cancelled:'rgba(248,113,113,.1)',approved:'rgba(16,185,129,.1)',finished:'rgba(167,139,250,.1)'};

const f = v => {
  if (HIDDEN) return 'R$ ●●●';
  return Number(v || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
};
const pct = v => parseFloat(v || 0).toFixed(1) + '%';
const fdt = s => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
};

const PBADGE={mercadolivre:'<span class="plat-ml">ML</span>',shopee:'<span class="plat-sp">SHP</span>',magalu:'<span class="plat-mg">MG</span>',tiktok:'<span class="plat-tk">TK</span>'};

const SHIP_PT={ready_to_ship:'Pronto p/ enviar',handling:'Preparando',not_delivered:'Pago · não enviado',paid_not_shipped:'Pago · não enviado',invoiced:'NF Emitida<br>ag. envio',shipped:'Enviado',delivered:'Entregue',cancelled:'Cancelado',pending:'Pendente',unknown:'—'};
const SHIP_CLS={ready_to_ship:'ready',handling:'handling',not_delivered:'not_delivered',paid_not_shipped:'paid_not_shipped',invoiced:'invoiced',shipped:'shipped',delivered:'delivered',cancelled:'cancelled',pending:'ready',unknown:''};
function shipBadge(o){
  let st=o.ml_shipping_status;
  // Magalu: usa o status do pedido quando não há shipping_status próprio
  if(!st && o.platform==='magalu') st=o.status==='invoiced'?'invoiced':o.status==='shipped'?'shipped':o.status==='delivered'?'delivered':o.status==='cancelled'?'cancelled':null;
  st=st||'unknown';
  const label=o.ml_shipping_status_label||SHIP_PT[st]||st||'—';
  return `<span class="ship-badge ${SHIP_CLS[st]||st}"><i class="ti ti-truck-delivery"></i>${label}</span>`;
}
function labelUrl(o){return o.platform==='mercadolivre'&&o.ml_shipping_id?`${API}/api/mercadolivre/shipments/${encodeURIComponent(o.ml_shipping_id)}/label?token=${encodeURIComponent(TOKEN)}`:'';}
function labelButton(o){
  if(!o) return '';

  if(o.platform === 'magalu'){
    const did = o.magalu_delivery_id || o.delivery_id || o.shipping_id;
    const isFull = o.fulfillment_type === 'full';
    const st = String(o.status || '').toLowerCase();
    const can = !!did && !isFull && !['cancelled','delivered','finished','shipped'].includes(st);
    if(!can) return '';
    return `<button class="label-btn" title="Imprimir etiqueta Magalu"
      onclick="event.stopPropagation();openMagaluLabelModal('${encodeURIComponent(did)}')">
      <i class="ti ti-printer"></i>
    </button>`;
  }

  if(o.platform !== 'mercadolivre') return '';

  const tags = Array.isArray(o.tags) ? o.tags : [];
  const isFull = o.fulfillment_type === 'full';
  const isSent = ['shipped','delivered'].includes(String(o.shipping_status || '').toLowerCase()) ||
                 tags.includes('shipped') ||
                 tags.includes('delivered') ||
                 o.status === 'delivered';

  const sid = o.shipping_id || o.ml_shipping_id;
  const can = o.can_print_label === true ||
              (!!sid && !isFull && !isSent && (o.status === 'paid' || o.status === 'invoiced' || tags.includes('paid') || tags.includes('not_delivered')));

  if(!can) return '';

  return `<button class="label-btn" title="Baixar etiqueta ML"
    onclick="event.stopPropagation();window.open(API+'/api/ml/label/${encodeURIComponent(sid)}?token='+encodeURIComponent(TOKEN),'_blank')">
    <i class="ti ti-printer"></i>
  </button>`;
};

function closeMagaluLabelModal(){const m=document.getElementById('magalu-label-modal');if(m)m.remove();}
function magaluPrintableOrdersWithin7Days(currentDid){
  const now=Date.now();
  const seven=7*86400000;
  const seen=new Set();
  return (ALL||[]).filter(o=>{
    if(!o||o.platform!=='magalu')return false;
    const did=o.magalu_delivery_id||o.delivery_id||o.shipping_id;
    if(!did||seen.has(did))return false;
    const st=String(o.status||'').toLowerCase();
    const isFull=o.fulfillment_type==='full';
    const dt=new Date(o.order_date||o.purchased_at||0).getTime();
    if(!Number.isFinite(dt)||now-dt>seven||dt>now+60000)return false;
    if(isFull||['cancelled','delivered','finished'].includes(st))return false;
    seen.add(did);
    return true;
  }).sort((a,b)=>new Date(b.order_date)-new Date(a.order_date));
}
function magaluOrderMiniLine(o){
  const name=(o.buyer_name||o.customer_name||o.recipient_name||'Cliente').toString();
  const code=(o.platform_order_id||o.order_code||o.id||'').toString();
  const nf=(o.invoice_number||o.nfe_number||o.magalu_invoice_number||'').toString();
  const sku=(o.item_sku||'').toString();
  const title=(o.item_title||'').toString();
  return {name,code,nf,sku,title};
}
function openMagaluLabelModal(encodedDeliveryId){
  const did=decodeURIComponent(encodedDeliveryId||'');
  if(!did)return;
  closeMagaluLabelModal();
  const printable=magaluPrintableOrdersWithin7Days(did);
  const currentFirst=[...printable].sort((a,b)=>((a.magalu_delivery_id||a.delivery_id||a.shipping_id)===did?-1:0));
  const list=currentFirst.map(o=>{
    const oid=o.magalu_delivery_id||o.delivery_id||o.shipping_id;
    const m=magaluOrderMiniLine(o);
    const checked=oid===did?'checked':'';
    const tag=oid===did?'Atual':'7 dias';
    return `<label class="label-batch-item">
      <input type="checkbox" class="mg-label-check" value="${escAttr(oid)}" ${checked}/>
      <span>
        <div class="label-batch-name">${escAttr(m.name)}</div>
        <div class="label-batch-sub">Pedido ${escAttr(m.code||'—')}${m.nf?' · NF '+escAttr(m.nf):''}${m.sku?' · '+escAttr(m.sku):''}</div>
      </span>
      <span class="label-batch-tag">${tag}</span>
    </label>`;
  }).join('');
  const m=document.createElement('div');
  m.id='magalu-label-modal';
  m.className='label-modal-backdrop';
  m.innerHTML=`
    <div class="label-modal" onclick="event.stopPropagation()">
      <div class="label-modal-head">
        <div><strong>Imprimir Magalu</strong><span>Zebra PDF: etiqueta oficial + DANFE simples, uma página cada</span></div>
        <button class="label-modal-close" onclick="closeMagaluLabelModal()"><i class="ti ti-x"></i></button>
      </div>
      <div class="label-modal-body">
        <div class="label-note"><b>Padrão Zebra sempre:</b> o SalesSync mantém a etiqueta oficial da Magalu e cria somente a página do DANFE simplificado. A impressão sai: etiqueta 1, DANFE 1, etiqueta 2, DANFE 2.</div>
        <div class="label-batch">
          <div class="label-batch-title"><span>Também imprimir?</span><small>últimos 7 dias</small></div>
          <div class="label-batch-list">${list||'<div class="label-note">Nenhuma outra venda Magalu imprimível encontrada nos últimos 7 dias.</div>'}</div>
        </div>
        <div class="label-actions">
          <button class="label-choice" onclick="printMagaluSelectedLabels('zebra-completo','pdf')">
            <span><b>Zebra PDF completo</b><small>Etiqueta Magalu + DANFE criado, uma página cada</small></span><i class="ti ti-printer"></i>
          </button>
          <button class="label-choice" onclick="printMagaluSelectedLabels('full','zpl')">
            <span><b>ZPL oficial / Zebra</b><small>Arquivo térmico oficial da Magalu</small></span><i class="ti ti-barcode"></i>
          </button>
          <button class="label-choice" onclick="printMagaluSelectedLabels('danfe-zebra','pdf')">
            <span><b>Só DANFE Zebra PDF</b><small>1 DANFE por página 10x15 / 4x6</small></span><i class="ti ti-file-description"></i>
          </button>
        </div>
      </div>
    </div>`;
  m.onclick=closeMagaluLabelModal;
  document.body.appendChild(m);
}
function selectedMagaluDeliveryIds(){
  return [...document.querySelectorAll('.mg-label-check:checked')].map(x=>x.value).filter(Boolean);
}
function magaluPrintUrl(ids,type='full',format='pdf'){
  const idParam=encodeURIComponent(ids.join(','));
  if(type==='zebra-completo'){
    return API+'/api/magalu/labels/zebra-completo?token='+encodeURIComponent(TOKEN)+'&ids='+idParam;
  }
  if(type==='danfe-zebra'){
    return API+'/api/magalu/labels/danfe-simplificado?token='+encodeURIComponent(TOKEN)+'&ids='+idParam+'&size=zebra';
  }
  // Etiqueta: sempre oficial da Magalu, sem redesenhar nem mexer no layout.
  return API+'/api/magalu/labels/official?token='+encodeURIComponent(TOKEN)+'&ids='+idParam+'&type='+encodeURIComponent(type)+'&format='+encodeURIComponent(format);
}
function printMagaluSelectedLabels(type='full',format='pdf'){
  const ids=selectedMagaluDeliveryIds();
  if(!ids.length){toast('Selecione ao menos uma venda');return;}
  window.open(magaluPrintUrl(ids,type,format),'_blank');
  closeMagaluLabelModal();
}
function printMagaluLabel(encodedDeliveryId,type='full',format='pdf'){
  const did=decodeURIComponent(encodedDeliveryId||'');
  if(!did)return;
  window.open(magaluPrintUrl([did],type,format),'_blank');
  closeMagaluLabelModal();
}

const $id=id=>document.getElementById(id);
const setText=(id,val)=>{const el=$id(id);if(el)el.textContent=val;};
const setHTML=(id,val)=>{const el=$id(id);if(el)el.innerHTML=val;};
function clampPeriod(v){v=parseInt(v||7,10);if(!Number.isFinite(v)||v<1)v=7;return Math.min(v,365);}
function inSelectedPeriod(o){
  const raw=o?.order_date;
  if(!raw)return true;
  // Converte a data do pedido para string local yyyy-mm-dd (timezone do browser)
  const d=new Date(raw);
  if(!Number.isFinite(d.getTime()))return true;
  // yyyy-mm-dd no fuso local
  const localStr=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  if(CUSTOM_FROM&&CUSTOM_TO){
    return localStr>=CUSTOM_FROM && localStr<=CUSTOM_TO;
  }
  // PERIOD=1 → só hoje; PERIOD>1 → últimos N dias
  const hoje=new Date();
  const hojeStr=hoje.getFullYear()+'-'+String(hoje.getMonth()+1).padStart(2,'0')+'-'+String(hoje.getDate()).padStart(2,'0');
  const inicio=new Date(hoje);inicio.setDate(hoje.getDate()-(PERIOD-1));
  const inicioStr=inicio.getFullYear()+'-'+String(inicio.getMonth()+1).padStart(2,'0')+'-'+String(inicio.getDate()).padStart(2,'0');
  return localStr>=inicioStr && localStr<=hojeStr;
}
/* Ontem — usa data LOCAL (não UTC) para evitar shift de timezone */
function localDateStr(d){
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function setPeriodYesterday(el){
  const y=new Date();
  y.setDate(y.getDate()-1);
  const s=localDateStr(y); // ex: "2026-06-09" no fuso local
  CUSTOM_FROM=s;CUSTOM_TO=s;PERIOD=null;
  document.querySelectorAll('.pill').forEach(p=>p.classList.remove('on'));
  el.classList.add('on');
  loadData();
}
const fday=s=>{
  if(!s)return'';
  const d=new Date(s),t=new Date(),y=new Date();
  t.setHours(0,0,0,0);y.setHours(0,0,0,0);y.setDate(y.getDate()-1);
  const dd=new Date(d);dd.setHours(0,0,0,0);
  if(dd.getTime()===t.getTime())return'📅 Hoje — '+t.toLocaleDateString('pt-BR',{day:'2-digit',month:'long'});
  if(dd.getTime()===y.getTime())return'📅 Ontem — '+y.toLocaleDateString('pt-BR',{day:'2-digit',month:'long'});
  return'📅 '+d.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'});
};

async function api(path,opts={}){
  const r=await fetch(API+path,{...opts,headers:{'Content-Type':'application/json',...(TOKEN?{Authorization:'Bearer '+TOKEN}:{})}});
  const d=await r.json();if(!r.ok)throw new Error(d.error||'Erro');return d;
}

window.addEventListener('load',async()=>{
  document.getElementById('ld-st').textContent='Verificando API...';
  try{await fetch(API+'/health');document.getElementById('ld-st').textContent='✓ Online';}
  catch{document.getElementById('ld-st').textContent='⚠ Offline';}
  await new Promise(r=>setTimeout(r,500));
  document.getElementById('ld').style.opacity='0';document.getElementById('ld').style.transition='opacity .4s';
  setTimeout(()=>{document.getElementById('ld').style.display='none';TOKEN&&USER?showApp():document.getElementById('ls').classList.add('on');},400);
  calc();
  const p=new URLSearchParams(location.search);
  if(p.get('connected'))setTimeout(()=>toast('✓ '+p.get('connected')+' conectado!'),2500);
  if(p.get('error'))setTimeout(()=>toast('Erro: '+p.get('error')),2500);
  if(p.get('connected')||p.get('error'))history.replaceState({},'','/');
});

function setLTab(tab,el){document.querySelectorAll('.ltab').forEach(t=>t.classList.remove('on'));el.classList.add('on');document.getElementById('tab-login').style.display=tab==='login'?'flex':'none';document.getElementById('tab-register').style.display=tab==='register'?'flex':'none';}
async function doLogin(){
  const email=document.getElementById('l-email').value.trim(),pass=document.getElementById('l-pass').value;
  document.getElementById('l-err').textContent='';
  if(!email||!pass)return document.getElementById('l-err').textContent='Preencha todos os campos';
  try{const d=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email,password:pass})});TOKEN=d.token;USER=d.user;localStorage.setItem('ss_token',TOKEN);localStorage.setItem('ss_user',JSON.stringify(USER));document.getElementById('ls').classList.remove('on');showApp();}
  catch(e){document.getElementById('l-err').textContent=e.message;}
}
async function doRegister(){
  const name=document.getElementById('r-name').value.trim(),email=document.getElementById('r-email').value.trim(),pass=document.getElementById('r-pass').value,cnpj=document.getElementById('r-cnpj').value.trim();
  document.getElementById('r-err').textContent='';
  if(!name||!email||!pass)return document.getElementById('r-err').textContent='Preencha nome, e-mail e senha';
  try{const d=await api('/api/auth/register',{method:'POST',body:JSON.stringify({name,email,password:pass,cnpj})});TOKEN=d.token;USER=d.user;localStorage.setItem('ss_token',TOKEN);localStorage.setItem('ss_user',JSON.stringify(USER));document.getElementById('ls').classList.remove('on');showApp();}
  catch(e){document.getElementById('r-err').textContent=e.message;}
}
function doLogout(){TOKEN='';USER=null;clearInterval(window._ct);localStorage.removeItem('ss_token');localStorage.removeItem('ss_user');document.getElementById('app').classList.remove('on');closeMo('mo-acc');document.getElementById('ls').classList.add('on');}

async function checkShopeeKeyStatus(){
  try{
    const d=await api('/api/shopee/key-status');
    if(d.level==='expired'||d.level==='critical'||d.level==='warning'){
      const bg=d.level==='expired'?'rgba(244,63,94,.18)':d.level==='critical'?'rgba(239,68,68,.15)':'rgba(251,191,36,.12)';
      const border=d.level==='expired'?'#f43f5e':d.level==='critical'?'#ef4444':'#fbbf24';
      const icon=d.level==='expired'?'⛔':d.level==='critical'?'🚨':'⚠️';
      const existing=document.getElementById('shopee-key-alert');
      if(existing)existing.remove();
      const bar=document.createElement('div');
      bar.id='shopee-key-alert';
      bar.style.cssText=`position:fixed;top:0;left:0;right:0;z-index:99999;background:${bg};border-bottom:2px solid ${border};padding:8px 16px;display:flex;align-items:center;gap:10px;font-size:12px;font-weight:700;color:#f1f5f9;backdrop-filter:blur(8px);`;
      const modeLabel=d.mode==='test'?'SANDBOX':'PRODUÇÃO';
      bar.innerHTML=`<span>${icon}</span><span><strong>Shopee API Key [${modeLabel}]:</strong> ${d.message} — Expira: ${d.expiresFormatted}</span><a href="https://open.shopee.com/api-docs" target="_blank" style="margin-left:auto;color:inherit;font-size:11px;border:1px solid currentColor;border-radius:6px;padding:2px 8px;text-decoration:none;">Renovar agora</a><span onclick="this.parentElement.remove()" style="cursor:pointer;font-size:16px;margin-left:8px;opacity:.6">✕</span>`;
      document.body.prepend(bar);
    }
  }catch(e){console.warn('[Shopee Key Check]',e.message);}
}

function showApp(){
  document.getElementById('app').classList.add('on');
  document.getElementById('tb-user').textContent=USER?.name||USER?.email||'—';
  document.getElementById('acc-ava').textContent=(USER?.name||'?')[0].toUpperCase();
  document.getElementById('acc-name').textContent=USER?.name||'—';
  document.getElementById('acc-email').textContent=USER?.email||'—';
  const _pcfg=planCfg();
  const _pEl=document.getElementById('acc-plan');
  if(_pEl){_pEl.textContent='Plano '+_pcfg.label;_pEl.style.color=_pcfg.color;_pEl.style.borderColor=_pcfg.color;}
  // Atualiza plano sem precisar relogar
  api('/api/me').then(r=>{if(r?.user?.plan){USER.plan=r.user.plan;localStorage.setItem('ss_user',JSON.stringify(USER));const _pcfg=planCfg();const _pEl=document.getElementById('acc-plan');if(_pEl){_pEl.textContent='Plano '+_pcfg.label;_pEl.style.color=_pcfg.color;_pEl.style.borderColor=_pcfg.color;}}}).catch(()=>{});
  loadAccounts().then(()=>{loadData();setTimeout(()=>doSync().catch(()=>{}),2000);setTimeout(ssDailyBrief,1200);});
  setTimeout(()=>checkShopeeKeyStatus().catch(()=>{}),3000);
  // v2.1 — polling de perguntas ML em fundo (a cada 3min)
  setTimeout(()=>{qaBackgroundPoll();setInterval(qaBackgroundPoll,180000);},8000);
  startCD();
  document.removeEventListener('visibilitychange',window._visSync);
  window._visSync=()=>{if(document.visibilityState==='visible'&&TOKEN&&USER)loadData();};
  document.addEventListener('visibilitychange',window._visSync);
  // Auto-refresh a cada 60s quando aba visível
  if(window._autoRefreshInterval)clearInterval(window._autoRefreshInterval);
  window._autoRefreshInterval=setInterval(()=>{
    if(document.visibilityState==='visible'&&TOKEN&&USER&&!SRCH&&!PROD_FILTER)loadData();
  },60000);
  // v5.15 — Notificações de venda
  ssNotifInit();
}

// ═══════════════════════════════════════════════════════════════
// v5.15 | 2026-06-19 | Notificações push de novas vendas
// ═══════════════════════════════════════════════════════════════
let _notifLastIds=new Set(); // rastreia "id:status" para detectar mudança de status
const PLAT_NOTIF_NAME={mercadolivre:'Mercado Livre',shopee:'Shopee',magalu:'Magalu',tiktok:'TikTok Shop',codesoftware:'Code Software'};

const _isMobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
function ssNotifInit(){
  if(_isMobile)return; // notificações só no desktop
  if(!('Notification' in window))return;
  if(Notification.permission==='default'){
    setTimeout(()=>Notification.requestPermission(),5000);
  }
}

let _audioCtx=null;
function ssGetAudioCtx(){
  // Reutiliza contexto existente (iOS exige que seja criado em gesto do usuário)
  if(!_audioCtx||_audioCtx.state==='closed'){
    try{_audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){return null;}
  }
  return _audioCtx;
}
// Cria contexto no primeiro toque/clique do usuário (iOS workaround)
document.addEventListener('touchstart',()=>ssGetAudioCtx(),{once:true,passive:true});
document.addEventListener('click',()=>ssGetAudioCtx(),{once:true,passive:true});

function ssNotifSound(){
  try{
    if(_isMobile)return;
    const ctx=ssGetAudioCtx();if(!ctx)return;
    if(ctx.state==='suspended')ctx.resume();
    [[523,0],[659,0.15],[784,0.3],[1047,0.5]].forEach(([freq,when])=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.connect(g);g.connect(ctx.destination);
      o.type='sine';o.frequency.value=freq;
      g.gain.setValueAtTime(0,ctx.currentTime+when);
      g.gain.linearRampToValueAtTime(0.3,ctx.currentTime+when+0.05);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+when+0.5);
      o.start(ctx.currentTime+when);
      o.stop(ctx.currentTime+when+0.5);
    });
  }catch(e){}
}

function ssNotifCheck(orders){
  if(!orders||!orders.length)return;
  if(_isMobile||!('Notification' in window)||Notification.permission!=='granted')return;
  // Só notifica pedidos dos últimos 5 minutos que ainda não estão no set
  const agoMs=5*60*1000;
  const novos=orders.filter(o=>{
    const oid=o.platform_order_id||o.id;
    const recente=o.order_date&&(Date.now()-new Date(o.order_date).getTime())<agoMs;
    return recente&&!_notifLastIds.has(oid)&&o.status!=='cancelled';
  });
  // Atualiza o set depois de checar
  orders.forEach(o=>_notifLastIds.add(o.platform_order_id||o.id));
  if(novos.length>0) ssNotifSound();
  novos.forEach(o=>{
    const oid=o.platform_order_id||o.id;
    _notifLastIds.add(oid);
    const plat=PLAT_NOTIF_NAME[o.platform]||o.platform||'Marketplace';
    const val=parseFloat(o.total_amount||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    const title='🛒 VOCÊ VENDEU!!!';
    const body=`Plataforma: ${plat}\nValor: ${val}\n${o.item_title||''}`;
    try{
      const n=new Notification(title,{body,icon:'https://salesync.shop/favicon.ico',tag:oid,requireInteraction:false});
      n.onclick=()=>{window.focus();n.close();};
      setTimeout(()=>n.close(),8000);
    }catch(e){}
  });
}

async function doQuickSync(){
  try{
    await Promise.all((ACCOUNTS||[]).filter(x=>x.is_connected).map(a=>
      fetch(`${API}/api/sync/quick?platform=${a.platform}`,{headers:{Authorization:`Bearer ${TOKEN}`}}).catch(()=>null)
    ));
  }catch(e){}
}

function startCD(){
  CD=30;clearInterval(window._ct);clearInterval(window._ldInterval);
  // Lê o banco a cada 5s para notificações quase instantâneas
  window._ldInterval=setInterval(()=>{
    if(document.visibilityState!=='visible'||!TOKEN||!USER)return;
    // Não atualiza se há modal aberto ou usuário está interagindo/filtrando
    const modalAberto=document.querySelector('.mo.on');
    const buscando=document.activeElement&&(document.activeElement.tagName==='INPUT'||document.activeElement.tagName==='TEXTAREA');
    const filtrando=SRCH||PROD_FILTER;
    if(modalAberto||buscando||filtrando)return;
    loadData();
  },5000);
  // Sync com marketplaces a cada 30s
  window._ct=setInterval(async()=>{CD--;setText('next-sync',String(CD)+'s');if(CD<=0){await doQuickSync();loadData();startCD();}},1000);
}

async function loadData(){
  if($id('sync-ico'))$id('sync-ico').style.animation='spin .6s linear infinite';
  setText('last-sync','...');
  try{
    if(!CUSTOM_FROM||!CUSTOM_TO) PERIOD=clampPeriod(PERIOD);
    const qs=CUSTOM_FROM&&CUSTOM_TO
      ? `date_from=${encodeURIComponent(CUSTOM_FROM)}&date_to=${encodeURIComponent(CUSTOM_TO)}`
      : `period=${PERIOD}`;
    const{data}=await api(`/api/orders?${qs}${PLAT?'&platform='+PLAT:''}`);
    ALL=(data||[]).filter(inSelectedPeriod);
    ssNotifCheck(ALL); // v5.15 — verifica novas vendas para notificação
    window._SS_CHART_CACHE={}; // limpa cache do gráfico ao recarregar
    window._PREV_DASH=null;
    applyFilters(SRCH||PROD_FILTER?{keepPage:true}:{});
    ssDrawDailyChart();
    // Carrega comparação e rendimentos extras em paralelo
    loadCompare().then(()=>{ if(window._PREV_DASH)computeDash(); }).catch(()=>{});
    ssLoadAddRevTotal();
    setText('last-sync',new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}));
  }catch(e){document.getElementById('orders-body').innerHTML=`<tr><td colspan="15"><div class="empty"><i class="ti ti-wifi-off"></i><p>${e.message}</p></div></td></tr>`;}
  if($id('sync-ico'))$id('sync-ico').style.animation='';
}

function applyFilters(opts={}){
  let d=[...ALL];
  if(FTAB!=='all')d=d.filter(o=>o.fulfillment_type===FTAB);
  // v2.1 — filtra por conta específica se ACC_FILTER estiver definido
  if(ACC_FILTER)d=d.filter(o=>(o.shop_name||'')=== ACC_FILTER);
  FILTERED=d;
  // Preserva página atual em refreshes silenciosos (quando há busca/filtro ativo)
  if(!opts.keepPage) PAGE=1;
  // Limpa filtro de produto ao mudar aba/período, mas preserva busca de texto
  if(!opts.keepPage){ PROD_FILTER='';renderProdFilterBadge(); }
  computeDash();renderOrders();renderProds();
  // v2.1 — avisa sobre SKUs sem custo após renderizar
  setTimeout(checkSkuSemCusto, 300);
}

// ── Detecta SKUs com vendas mas sem custo de produto preenchido ──
// v5.16 — SKUs marcados como custo zero intencional (persistido no localStorage)
const _skuCustoZeroIgnorado=new Set(JSON.parse(localStorage.getItem('ss_sku_zero_ignore')||'[]'));
function skuIgnorar(sku){
  _skuCustoZeroIgnorado.add(sku);
  localStorage.setItem('ss_sku_zero_ignore',JSON.stringify([..._skuCustoZeroIgnorado]));
  document.querySelectorAll('.sku-bubble').forEach(b=>{if(b.dataset.sku===sku)b.remove();});
  closeMo('mo-sku-vendas');
  toast('✓ SKU ignorado — não vai mais aparecer como alerta');
}

function checkSkuSemCusto(){
  const semCusto={};
  FILTERED.filter(o=>o.status!=='cancelled'&&o.item_sku).forEach(o=>{
    const sku=o.item_sku;
    const custo=parseFloat(o.total_cost||0);
    if(!semCusto[sku])semCusto[sku]={sku,title:o.item_title||sku,total:0,custo_total:0};
    semCusto[sku].total++;
    semCusto[sku].custo_total+=custo;
  });
  const problemas=Object.values(semCusto).filter(x=>x.custo_total===0&&x.total>0&&!_skuCustoZeroIgnorado.has(x.sku));
  if(!problemas.length)return;
  // v2.1 — balões flutuantes no canto inferior direito
  const wrap=document.getElementById('sku-bubbles');
  if(!wrap)return;
  wrap.innerHTML='';
  problemas.slice(0,5).forEach((p,i)=>{
    const b=document.createElement('div');
    b.className='sku-bubble';
    b.style.animationDelay=`${i*0.15}s, ${i*0.4}s`;
    b.innerHTML=`
      <div class="sku-bubble-icon">⚠️</div>
      <div class="sku-bubble-text">
        <div class="sku-bubble-title">SEM CUSTO: ${p.title.length>28?p.title.slice(0,28)+'…':p.title}</div>
        <div class="sku-bubble-sub">SKU: ${p.sku} · ${p.total} venda${p.total>1?'s':''} · clique para ver</div>
      </div>
      <span class="sku-bubble-close" onclick="event.stopPropagation();this.closest('.sku-bubble').remove()" title="Fechar">✕</span>`;
    b.dataset.sku=p.sku;
    b.onclick=()=>abrirVendasSku(p.sku,p.title);
    wrap.appendChild(b);
  });
  // Limpa o container estático (não precisa mais)
  const sc=document.getElementById('sku-warn-container');
  if(sc)sc.innerHTML='';
}

async function abrirCustoZeroLista(){
  // Monta modal com spinner imediatamente
  let mo=document.getElementById('mo-custo-zero-lista');
  if(!mo){
    mo=document.createElement('div');
    mo.id='mo-custo-zero-lista';
    mo.className='mo';
    mo.onclick=e=>{if(e.target===mo)closeMo('mo-custo-zero-lista');};
    document.body.appendChild(mo);
  }
  mo.innerHTML=`<div class="md" style="max-width:620px">
    <div class="mh">
      <div class="mh-left">
        <div class="mh-ico"><i class="ti ti-alert-triangle" style="color:#fbbf24"></i></div>
        <div><div class="mh-title">Produtos sem custo</div><div class="mh-sub" id="czl-sub">Buscando últimos 90 dias...</div></div>
      </div>
      <div class="mh-close" onclick="closeMo('mo-custo-zero-lista')"><i class="ti ti-x"></i></div>
    </div>
    <div class="mb" id="czl-body" style="max-height:60vh;overflow-y:auto;padding:0 20px">
      <div class="empty" style="padding:40px 0"><div class="spin"></div></div>
    </div>
    <div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end">
      <button class="btn ghost" onclick="closeMo('mo-custo-zero-lista')" style="font-size:12px">Fechar</button>
    </div>
  </div>`;
  openMo('mo-custo-zero-lista');

  // Usa ALL já carregado (mesma fonte dos balões de alerta)
  const pedidos=ALL||[];

  // agrupa por SKU, mantém apenas custo zero
  const mapa={};
  pedidos.filter(o=>o.status!=='cancelled'&&o.item_sku).forEach(o=>{
    const sku=o.item_sku;
    if(_skuCustoZeroIgnorado.has(sku))return;
    const custo=parseFloat(o.total_cost||0);
    if(!mapa[sku])mapa[sku]={sku,title:o.item_title||sku,platform:o.platform||'',img:o.item_image||null,vendas:0,custo_total:0};
    mapa[sku].vendas++;
    mapa[sku].custo_total+=custo;
  });
  const lista=Object.values(mapa).filter(x=>x.custo_total===0).sort((a,b)=>b.vendas-a.vendas);

  if(!lista.length){
    closeMo('mo-custo-zero-lista');
    toast('✓ Nenhum produto com custo zero nos últimos 90 dias!');
    return;
  }

  document.getElementById('czl-sub').textContent=`${lista.length} produto${lista.length!==1?'s':''} sem custo nos últimos 90 dias`;

  const rows=lista.length?lista.map(p=>`
    <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
      <div style="width:40px;height:40px;border-radius:8px;overflow:hidden;flex-shrink:0;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:20px">
        ${p.img?`<img src="${p.img}" style="width:100%;height:100%;object-fit:cover" onerror="this.outerHTML='📦'">`:'📦'}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:700;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.title}</div>
        <div style="display:flex;gap:6px;align-items:center;margin-top:3px">
          ${platBadgeHtml(p.platform)}
          <span style="font-size:10px;color:var(--txt3)">${p.vendas} venda${p.vendas!==1?'s':''} sem custo</span>
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="btn" style="font-size:11px;padding:6px 12px" onclick="closeMo('mo-custo-zero-lista');abrirHistoricoCusto('${p.sku}','${p.platform}','${(p.title||p.sku).replace(/'/g,"\\'").replace(/"/g,'\\"')}')">
          <i class="ti ti-calendar-stats"></i> Definir custo
        </button>
        <button class="btn ghost" style="font-size:11px;padding:6px 10px;color:var(--txt3)" title="Custo zero intencional — não alertar mais" onclick="skuIgnorar('${p.sku}');this.closest('[style]').remove()">
          <i class="ti ti-bell-off"></i>
        </button>
      </div>
    </div>`).join('')
    :`<div class="empty" style="padding:40px 0"><i class="ti ti-circle-check" style="font-size:36px;color:var(--green2)"></i><p style="margin-top:10px;color:var(--txt3)">Nenhum produto com custo zero!</p></div>`;

  document.getElementById('czl-body').innerHTML=rows;
  openMo('mo-custo-zero-lista');
}

// ── Abre modal com todas as vendas do SKU nos últimos 45 dias ──
async function abrirVendasSku(sku,title){
  // Cria modal dinamicamente se não existir
  let modal=document.getElementById('mo-sku-vendas');
  if(!modal){
    modal=document.createElement('div');
    modal.id='mo-sku-vendas';
    modal.className='mo';
    modal.onclick=e=>{if(e.target.id==='mo-sku-vendas')closeMo('mo-sku-vendas');};
    modal.innerHTML=`<div class="md" style="max-width:700px">
      <div class="mh"><div class="mh-left"><div class="mh-ico"><i class="ti ti-alert-triangle" style="color:#fbbf24"></i></div><div><div class="mh-title" id="sku-modal-title">—</div><div class="mh-sub" id="sku-modal-sub">—</div></div></div><div class="mh-close" onclick="closeMo('mo-sku-vendas')"><i class="ti ti-x"></i></div></div>
      <div class="mb" id="sku-modal-body"><div class="empty"><div class="spin"></div></div></div>
      <div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px">
        <button class="btn" onclick="abrirHistoricoCusto('${sku}')" style="font-size:11px"><i class="ti ti-calendar-stats"></i> Histórico de custo</button>
        <button class="btn ghost" onclick="skuIgnorar('${sku}')" style="font-size:11px;color:var(--txt3)"><i class="ti ti-bell-off"></i> Custo zero intencional — ignorar</button>
        <button class="btn ghost" onclick="closeMo('mo-sku-vendas')" style="font-size:11px">Fechar</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
  }
  document.getElementById('sku-modal-title').textContent='⚠️ '+title;
  document.getElementById('sku-modal-sub').textContent='SKU: '+sku+' · Vendas sem custo nos últimos 45 dias';
  openMo('mo-sku-vendas');
  // Busca pedidos dos últimos 45 dias com esse SKU
  try{
    const r=await api('/api/orders?period=45');
    const vendas=(r.data||[]).filter(o=>o.item_sku===sku&&o.status!=='cancelled');
    const body=document.getElementById('sku-modal-body');
    if(!vendas.length){body.innerHTML='<div class="empty"><p>Nenhuma venda encontrada nos últimos 45 dias.</p></div>';return;}
    const total_fat=vendas.reduce((s,o)=>s+parseFloat(o.total_amount||0),0);
    const total_qtd=vendas.reduce((s,o)=>s+parseInt(o.quantity||1),0);
    body.innerHTML=`
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:16px 20px 8px">
        <div style="background:var(--bg3);border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:18px;font-weight:800;color:var(--p3)">${vendas.length}</div>
          <div style="font-size:9px;color:var(--txt3);text-transform:uppercase">Pedidos</div>
        </div>
        <div style="background:var(--bg3);border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:18px;font-weight:800;color:var(--txt)">${total_qtd}</div>
          <div style="font-size:9px;color:var(--txt3);text-transform:uppercase">Unidades</div>
        </div>
        <div style="background:var(--bg3);border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:18px;font-weight:800;color:var(--green2)">${f(total_fat)}</div>
          <div style="font-size:9px;color:var(--txt3);text-transform:uppercase">Faturado</div>
        </div>
      </div>
      <div style="background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.3);border-radius:8px;margin:0 20px 10px;padding:8px 12px;font-size:10px;color:#fbbf24;font-weight:600">
        ⚠️ Custo R$ 0,00 em todos os pedidos — lucro calculado está incorreto!
      </div>
      <div style="overflow-x:auto;padding:0 20px 16px">
        <table style="width:100%;border-collapse:collapse;font-size:10px">
          <thead><tr style="color:var(--txt3);border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:6px 4px">Data</th>
            <th style="text-align:left;padding:6px 4px">Conta</th>
            <th style="text-align:right;padding:6px 4px">Qtde</th>
            <th style="text-align:right;padding:6px 4px">Valor</th>
            <th style="text-align:right;padding:6px 4px">Tarifa</th>
            <th style="text-align:right;padding:6px 4px">Frete</th>
          </tr></thead>
          <tbody>${vendas.map(o=>{
            const dt=o.order_date?o.order_date.split('T')[0]:'';
            const dtBR=dt?dt.split('-').reverse().join('/'):'—';
            return`<tr style="border-bottom:1px solid var(--border2);cursor:pointer;transition:background .15s" title="Ver pedidos de ${dtBR}"
              onmouseenter="this.style.background='rgba(139,92,246,.08)'" onmouseleave="this.style.background=''"
              onclick="irParaData('${dt}','${o.item_title||''}')">
              <td style="padding:5px 4px;color:var(--p3);font-weight:600">${dtBR} <span style="font-size:8px;color:var(--txt3)">↗</span></td>
              <td style="padding:5px 4px;color:var(--txt2)">${o.shop_name||'—'}</td>
              <td style="padding:5px 4px;text-align:right">${o.quantity||1}</td>
              <td style="padding:5px 4px;text-align:right;font-weight:700;color:var(--green2)">${f(o.total_amount)}</td>
              <td style="padding:5px 4px;text-align:right;color:var(--red2)">${f(o.platform_fee)}</td>
              <td style="padding:5px 4px;text-align:right;color:var(--yellow2)">${f(o.shipping_fee)}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>`;
  }catch(e){
    document.getElementById('sku-modal-body').innerHTML=`<div class="empty"><p>${e.message}</p></div>`;
  }
}

// v2.1 — navega para a data da venda e filtra pelo produto
function irParaData(date, titulo){
  if(!date)return;
  closeMo('mo-sku-vendas');
  CUSTOM_FROM=date; CUSTOM_TO=date; PERIOD=null;
  document.querySelectorAll('.pill').forEach(p=>p.classList.remove('on'));
  if(window.CUSTOM_PERIOD_EL)CUSTOM_PERIOD_EL.classList.add('on');
  loadData().then(()=>{
    if(titulo){PROD_FILTER=titulo;renderProdFilterBadge();renderOrders();renderProds();}
    toast(`📅 ${date.split('-').reverse().join('/')} — ${titulo||''}`);
    document.getElementById('orders-body')?.closest('.tbl-wrap')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
}

function abrirCustoProduto(sku){
  closeMo('mo-sku-vendas');
  openMo('mo-cst');
  setTimeout(()=>{const inp=document.getElementById('cst-search')||document.querySelector('#mo-cst input');if(inp){inp.value=sku;inp.dispatchEvent(new Event('input'));}},300);
}

// ── Estado de seleção do calendário de custo ──
let _cuhHist=[], _cuhSelStart=null, _cuhSelEnd=null;

async function abrirHistoricoCusto(sku, platform, title){
  if(!platform){
    const ex=(ALL||[]).find(o=>o.item_sku===sku);
    platform=(ex&&ex.platform)||'geral';
  }
  const ex=(ALL||[]).find(o=>o.item_sku===sku);
  const imgUrl=ex&&(ex.item_image||null);
  const prodTitle=title||(ex&&ex.item_title)||sku;

  _cuhSelStart=null; _cuhSelEnd=null; _cuhCustoAtual=0;

  // busca custo atual do produto como fallback
  try{
    const prods=await api('/api/products?platform='+encodeURIComponent(platform||'geral'));
    const arr=Array.isArray(prods)?prods:(prods.products||[]);
    const prod=arr.find(p=>p.sku===sku||(p.sku||'').toLowerCase()===(sku||'').toLowerCase());
    if(prod&&prod.cost>0) _cuhCustoAtual=parseFloat(prod.cost);
  }catch(e){}
  // fallback: pega do order
  if(!_cuhCustoAtual && ex) _cuhCustoAtual=parseFloat(ex.total_cost||0);

  let mo=document.getElementById('mo-custo-hist');
  if(mo) mo.remove();
  mo=document.createElement('div');
  mo.id='mo-custo-hist';
  mo.className='mo';
  mo.onclick=e=>{if(e.target===mo)closeMo('mo-custo-hist');};
  const custoAtualFmt=_cuhCustoAtual>0?'R$'+_cuhCustoAtual.toFixed(2).replace('.',','):'Não definido';
  mo.innerHTML=`<div class="md" style="max-width:520px;width:95vw;overflow:hidden">
    <!-- Header com gradiente -->
    <div style="background:linear-gradient(135deg,rgba(109,40,217,.18),rgba(56,189,248,.10));border-bottom:1px solid var(--border2);padding:16px 18px 14px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:52px;height:52px;border-radius:12px;overflow:hidden;flex-shrink:0;background:var(--bg3);border:1px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 2px 8px rgba(0,0,0,.25)">
          ${imgUrl?`<img src="${imgUrl}" style="width:100%;height:100%;object-fit:cover" onerror="this.outerHTML='📦'">`:'📦'}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:5px">${prodTitle}</div>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            ${platBadgeHtml(platform)}
            <span style="font-size:10px;color:var(--txt3);font-weight:600">SKU: ${sku}</span>
            <span style="font-size:10px;font-weight:800;color:${_cuhCustoAtual>0?'var(--green2)':'var(--txt3)'};background:${_cuhCustoAtual>0?'rgba(16,185,129,.10)':'rgba(148,163,184,.08)'};border:1px solid ${_cuhCustoAtual>0?'rgba(16,185,129,.2)':'rgba(148,163,184,.15)'};border-radius:999px;padding:2px 8px">${custoAtualFmt}</span>
          </div>
        </div>
        <div onclick="closeMo('mo-custo-hist')" style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.05);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--txt3);font-size:16px;flex-shrink:0;transition:all .2s" onmouseover="this.style.background='rgba(248,113,113,.12)';this.style.color='var(--red2)'" onmouseout="this.style.background='rgba(255,255,255,.05)';this.style.color='var(--txt3)'"><i class="ti ti-x"></i></div>
      </div>
    </div>
    <!-- Banner custo zero: aparece direto sem precisar clicar no calendário -->
    ${(!_cuhCustoAtual||_cuhCustoAtual===0)?`
    <div id="cuh-zero-banner" style="margin:0 14px 12px;padding:13px 16px;background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.25);border-radius:14px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
        <i class="ti ti-alert-triangle" style="font-size:13px;color:#fbbf24"></i>
        <span style="font-size:11px;font-weight:700;color:#fbbf24">Produto sem custo — definir a partir de hoje</span>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <div style="flex:1;position:relative">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:12px;font-weight:700;color:#fbbf24;pointer-events:none">R$</span>
          <input id="cuh-zero-val" type="number" step="0.01" min="0" placeholder="0,00"
            style="width:100%;padding:10px 14px 10px 34px;border-radius:10px;border:2px solid rgba(251,191,36,.35);background:var(--bg1);color:var(--txt);font-size:15px;font-weight:800;box-sizing:border-box;outline:none;transition:border-color .2s"
            onfocus="this.style.borderColor='#fbbf24'" onblur="this.style.borderColor='rgba(251,191,36,.35)'"
            onkeydown="if(event.key==='Enter')salvarCustoZeroHoje()"/>
        </div>
        <button onclick="salvarCustoZeroHoje()" style="height:40px;padding:0 18px;border-radius:10px;background:linear-gradient(135deg,#f59e0b,#fbbf24);border:none;color:#000;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap;transition:opacity .15s" onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">Salvar</button>
      </div>
    </div>`:''}
    <!-- Corpo: calendário -->
    <div id="cuh-body" style="padding:16px 18px 8px"></div>
    <!-- Painel de edição (aparece ao selecionar dia) -->
    <div id="cuh-sel-info" style="display:none;margin:0 14px 12px;padding:14px 16px;background:linear-gradient(135deg,rgba(109,40,217,.12),rgba(56,189,248,.06));border-radius:14px;border:1px solid rgba(139,92,246,.25);box-shadow:0 2px 12px rgba(109,40,217,.08)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <i class="ti ti-calendar-event" style="font-size:14px;color:var(--p3)"></i>
        <div id="cuh-sel-label" style="font-size:11px;font-weight:700;color:var(--p3)"></div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
        <div style="flex:1;position:relative">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:12px;font-weight:700;color:var(--p3);pointer-events:none">R$</span>
          <input id="cuh-editor-val" type="number" step="0.01" min="0" placeholder="0,00"
            style="width:100%;padding:11px 14px 11px 36px;border-radius:10px;border:2px solid rgba(139,92,246,.4);background:var(--bg1);color:var(--txt);font-size:16px;font-weight:800;box-sizing:border-box;outline:none;transition:border-color .2s"
            onfocus="this.style.borderColor='var(--p2)'" onblur="this.style.borderColor='rgba(139,92,246,.4)'"
            onkeydown="if(event.key==='Enter')salvarCustoHist()"/>
        </div>
        <button onclick="salvarCustoHist()" style="height:42px;padding:0 20px;border-radius:10px;background:linear-gradient(135deg,var(--p),var(--p2));border:none;color:#fff;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap;box-shadow:0 2px 8px rgba(109,40,217,.3);transition:all .15s" onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">Salvar</button>
        <button onclick="cuhLimparSel()" style="height:42px;width:42px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid var(--border2);color:var(--txt3);font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s" onmouseover="this.style.background='rgba(248,113,113,.10)';this.style.color='var(--red2)'" onmouseout="this.style.background='rgba(255,255,255,.04)';this.style.color='var(--txt3)'"><i class="ti ti-x"></i></button>
      </div>
      <!-- Checkbox: aplicar daqui para frente -->
      <label id="cuh-forward-label" style="display:none;align-items:center;gap:8px;cursor:pointer;padding:8px 10px;background:rgba(99,102,241,.08);border:1px solid rgba(139,92,246,.20);border-radius:9px;user-select:none" onclick="cuhToggleForward()">
        <div id="cuh-forward-box" style="width:16px;height:16px;border-radius:4px;border:2px solid rgba(139,92,246,.5);background:transparent;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .15s">
          <i class="ti ti-check" style="font-size:10px;color:#fff;display:none"></i>
        </div>
        <span style="font-size:11px;font-weight:600;color:var(--txt2)">Manter este custo daqui para frente também</span>
      </label>
    </div>
    <!-- Dica -->
    <div style="padding:0 18px 14px;text-align:center">
      <span style="font-size:10px;color:var(--txt3)" id="cuh-hint">Clique num dia para definir o custo · clique em 2 dias para definir um período</span>
    </div>
  </div>`;
  document.body.appendChild(mo);
  mo.dataset.sku=sku; mo.dataset.platform=platform;
  const hoje=new Date();
  mo.dataset.ano=hoje.getFullYear();
  mo.dataset.mes=hoje.getMonth();
  openMo('mo-custo-hist');
  await renderCustoHist(sku, platform);
}

async function renderCustoHist(sku, platform){
  const mo=document.getElementById('mo-custo-hist');
  const body=document.getElementById('cuh-body');
  body.innerHTML='<div style="text-align:center;padding:24px 0"><div class="spin"></div></div>';

  try{
    const res=await api(`/api/products/${encodeURIComponent(sku)}/cost-history?platform=${encodeURIComponent(platform||'geral')}`);
    _cuhHist=Array.isArray(res)?res:(res.history||[]);
  }catch(e){_cuhHist=[];}

  const hoje=new Date();
  const hojeStr=hoje.getFullYear()+'-'+String(hoje.getMonth()+1).padStart(2,'0')+'-'+String(hoje.getDate()).padStart(2,'0');
  const ano=parseInt(mo.dataset.ano||hoje.getFullYear());
  const mes=parseInt(mo.dataset.mes??hoje.getMonth());
  const diasNoMes=new Date(ano,mes+1,0).getDate();

  // custo vigente por dia — fallback para _cuhCustoAtual se não há histórico
  const custoDia={};
  for(let d=1;d<=diasNoMes;d++){
    const ds=ano+'-'+String(mes+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    let best=null;
    _cuhHist.forEach(h=>{if(h.effective_from<=ds&&(!best||h.effective_from>best.effective_from))best=h;});
    custoDia[d]=best?best.cost:(_cuhCustoAtual||null);
  }

  const minDate=new Date(hoje); minDate.setMonth(minDate.getMonth()-11); minDate.setDate(1);
  const mesKey=ano*100+mes;
  const podePrev=mesKey>minDate.getFullYear()*100+minDate.getMonth();
  const podeNext=mesKey<hoje.getFullYear()*100+hoje.getMonth();

  const mesNomes=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const dsAbr=['D','S','T','Q','Q','S','S'];
  const primeiroDS=new Date(ano,mes,1).getDay();
  const selS=_cuhSelStart, selE=_cuhSelEnd||_cuhSelStart;

  const dsHdr=dsAbr.map(d=>`<div style="text-align:center;font-size:10px;font-weight:700;color:var(--txt3);padding:0 0 5px">${d}</div>`).join('');

  let cells='';
  for(let i=0;i<primeiroDS;i++) cells+=`<div></div>`;

  for(let d=1;d<=diasNoMes;d++){
    const dateStr=ano+'-'+String(mes+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const isHoje=dateStr===hojeStr;
    const isFuturo=dateStr>hojeStr;
    const custo=custoDia[d];
    const hasCusto=custo!=null&&custo>0;
    const custoStr=hasCusto?'R$'+Number(custo).toFixed(2).replace('.',','):'';

    const inRange=selS&&selE&&dateStr>=selS&&dateStr<=selE;
    const isStart=dateStr===selS, isEnd=dateStr===selE;

    let bg='transparent',brd='transparent',nClr=isHoje?'var(--accent)':'var(--txt)',nW=isHoje?'800':'500';
    if(inRange&&!isStart&&!isEnd){bg='rgba(99,102,241,.15)';brd='transparent';}
    if(isStart||isEnd){bg='var(--accent)';brd='var(--accent)';nClr='#fff';nW='800';}
    if(isHoje&&!inRange&&!isStart){bg='rgba(99,102,241,.12)';brd='var(--accent)';}

    cells+=`<div id="cuh-day-${d}"
      onclick="${isFuturo?'':`cuhClickDia('${dateStr}')`}"
      style="cursor:${isFuturo?'default':'pointer'};border-radius:9px;padding:6px 2px 5px;text-align:center;
        background:${bg};border:1.5px solid ${brd};opacity:${isFuturo?'0.22':'1'};
        transition:background .1s,border-color .1s,transform .1s;user-select:none;min-width:0"
      ${!isFuturo?`onmouseover="if(!'${isStart||isEnd}')this.style.background='rgba(139,92,246,.20)';this.style.transform='scale(1.06)'" onmouseout="this.style.background='${bg}';this.style.transform='scale(1)'"`:''}>
      <div style="font-size:12px;font-weight:${nW};color:${nClr};line-height:1.2">${d}</div>
      <div style="font-size:7.5px;font-weight:700;color:${hasCusto?(isStart||isEnd)?'#fff':'var(--orange2)':'transparent'};margin-top:2px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${custoStr||'·'}</div>
    </div>`;
  }

  body.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding:0 2px">
      <button style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.04);border:1px solid var(--border2);color:var(--txt2);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s" ${podePrev?`onclick="cuhNavMes(-1,'${sku}','${platform||'geral'}')" onmouseover="this.style.background='rgba(139,92,246,.15)';this.style.color='var(--p3)'" onmouseout="this.style.background='rgba(255,255,255,.04)';this.style.color='var(--txt2)'"`:' disabled style="width:34px;height:34px;border-radius:50%;background:transparent;border:1px solid var(--border);color:var(--txt3);font-size:16px;opacity:.35;cursor:default;display:flex;align-items:center;justify-content:center"'}>&#8592;</button>
      <div style="text-align:center">
        <div style="font-weight:800;font-size:15px;color:var(--txt);letter-spacing:-.3px">${mesNomes[mes]}</div>
        <div style="font-size:10px;color:var(--txt3);margin-top:1px">${ano}</div>
      </div>
      <button style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.04);border:1px solid var(--border2);color:var(--txt2);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s" ${podeNext?`onclick="cuhNavMes(1,'${sku}','${platform||'geral'}')" onmouseover="this.style.background='rgba(139,92,246,.15)';this.style.color='var(--p3)'" onmouseout="this.style.background='rgba(255,255,255,.04)';this.style.color='var(--txt2)'"`:' disabled style="width:34px;height:34px;border-radius:50%;background:transparent;border:1px solid var(--border);color:var(--txt3);font-size:16px;opacity:.35;cursor:default;display:flex;align-items:center;justify-content:center"'}>&#8594;</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:4px">${dsHdr}</div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">${cells}</div>`;

  if(_cuhSelStart) cuhAtualizarEditor();
}

function cuhClickDia(dateStr){
  if(!_cuhSelStart||dateStr<_cuhSelStart){
    _cuhSelStart=dateStr; _cuhSelEnd=null;
  } else if(dateStr===_cuhSelStart){
    _cuhSelStart=null; _cuhSelEnd=null;
  } else {
    _cuhSelEnd=dateStr;
  }
  const mo=document.getElementById('mo-custo-hist');
  renderCustoHist(mo.dataset.sku, mo.dataset.platform);
}

function cuhAtualizarEditor(){
  const mesNomes=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const fmtDate=ds=>{const[,m,d]=ds.split('-');return `${parseInt(d)} de ${mesNomes[parseInt(m)-1]}`;};
  const isRange=_cuhSelEnd&&_cuhSelEnd!==_cuhSelStart;
  const label=isRange
    ?`📅 De ${fmtDate(_cuhSelStart)} até ${fmtDate(_cuhSelEnd)}`
    :`📅 A partir de ${fmtDate(_cuhSelStart)}`;
  document.getElementById('cuh-sel-label').textContent=label;
  const inp=document.getElementById('cuh-editor-val');
  let best=null;
  _cuhHist.forEach(h=>{if(h.effective_from<=_cuhSelStart&&(!best||h.effective_from>best.effective_from))best=h;});
  const prefill=best?best.cost:(_cuhCustoAtual||0);
  if(!inp.dataset.touched) inp.value=prefill>0?Number(prefill).toFixed(2):'';
  document.getElementById('cuh-sel-info').style.display='block';
  document.getElementById('cuh-hint').textContent='2º clique = fim do período · ou salve para data única';
  // Exibe checkbox "daqui para frente" apenas quando é período (range)
  // ou quando o produto está zerado (sem custo definido)
  const semCusto=!_cuhCustoAtual||_cuhCustoAtual===0;
  const fwdLabel=document.getElementById('cuh-forward-label');
  if(fwdLabel){
    const mostrar=isRange||semCusto;
    fwdLabel.style.display=mostrar?'flex':'none';
    // Pré-marca se produto está zerado
    if(semCusto&&!fwdLabel.dataset.interacted) cuhSetForward(true);
  }
  setTimeout(()=>{inp.focus();if(!inp.dataset.touched)inp.select();},60);
}

function cuhSetForward(val){
  const box=document.getElementById('cuh-forward-box');
  const icon=box?.querySelector('i');
  if(!box) return;
  if(val){
    box.style.background='var(--p)';box.style.borderColor='var(--p)';
    if(icon) icon.style.display='block';
    box.dataset.checked='1';
  } else {
    box.style.background='transparent';box.style.borderColor='rgba(139,92,246,.5)';
    if(icon) icon.style.display='none';
    delete box.dataset.checked;
  }
}

function cuhToggleForward(){
  const box=document.getElementById('cuh-forward-box');
  const lbl=document.getElementById('cuh-forward-label');
  if(!box) return;
  lbl.dataset.interacted='1';
  cuhSetForward(!box.dataset.checked);
}

function cuhLimparSel(){
  _cuhSelStart=null; _cuhSelEnd=null;
  const inp=document.getElementById('cuh-editor-val');
  if(inp){inp.value='';delete inp.dataset.touched;}
  document.getElementById('cuh-sel-info').style.display='none';
  document.getElementById('cuh-hint').textContent='Clique num dia para definir o custo · clique em 2 dias para definir um período';
  const fwdLbl=document.getElementById('cuh-forward-label');
  if(fwdLbl){fwdLbl.style.display='none';delete fwdLbl.dataset.interacted;}
  cuhSetForward(false);
  const mo=document.getElementById('mo-custo-hist');
  renderCustoHist(mo.dataset.sku, mo.dataset.platform);
}

function cuhNavMes(delta,sku,platform){
  const mo=document.getElementById('mo-custo-hist');
  let ano=parseInt(mo.dataset.ano), mes=parseInt(mo.dataset.mes);
  mes+=delta; if(mes<0){mes=11;ano--;} if(mes>11){mes=0;ano++;}
  mo.dataset.ano=ano; mo.dataset.mes=mes;
  renderCustoHist(sku,platform);
}

async function salvarCustoZeroHoje(){
  const mo=document.getElementById('mo-custo-hist');
  const sku=mo.dataset.sku, platform=mo.dataset.platform||'geral';
  const inp=document.getElementById('cuh-zero-val');
  const novo=parseFloat(inp.value.replace(',','.'));
  if(isNaN(novo)||novo<0){toast('Valor inválido.');return;}
  const hoje=new Date().toISOString().slice(0,10);
  try{
    await api(`/api/products/${encodeURIComponent(sku)}/cost-history`,{method:'POST',body:JSON.stringify({platform,cost:novo,effective_from:hoje})});
    toast('✓ Custo salvo a partir de hoje!');
    _cuhCustoAtual=novo;
    const banner=document.getElementById('cuh-zero-banner');
    if(banner) banner.remove();
    await renderCustoHist(sku,platform);
  }catch(e){toast('Erro: '+(e.message||e));}
}

async function salvarCustoHist(){
  const mo=document.getElementById('mo-custo-hist');
  const sku=mo.dataset.sku, platform=mo.dataset.platform||'geral';
  if(!_cuhSelStart){toast('Selecione um dia primeiro.');return;}
  const inp=document.getElementById('cuh-editor-val');
  const novo=parseFloat(inp.value.replace(',','.'));
  if(isNaN(novo)||novo<0){toast('Valor inválido.');return;}
  const forwardChecked=!!document.getElementById('cuh-forward-box')?.dataset.checked;
  try{
    await api(`/api/products/${encodeURIComponent(sku)}/cost-history`,{method:'POST',body:JSON.stringify({platform,cost:novo,effective_from:_cuhSelStart})});
    // Se é um período E o checkbox "daqui para frente" NÃO está marcado,
    // restaura o custo anterior após o fim do período
    if(_cuhSelEnd&&_cuhSelEnd!==_cuhSelStart&&!forwardChecked){
      const endDate=new Date(_cuhSelEnd); endDate.setDate(endDate.getDate()+1);
      const nextDay=endDate.toISOString().slice(0,10);
      let prevBest=null;
      const dayBefore=new Date(_cuhSelStart); dayBefore.setDate(dayBefore.getDate()-1);
      const dbs=dayBefore.toISOString().slice(0,10);
      _cuhHist.forEach(h=>{if(h.effective_from<=dbs&&(!prevBest||h.effective_from>prevBest.effective_from))prevBest=h;});
      await api(`/api/products/${encodeURIComponent(sku)}/cost-history`,{method:'POST',body:JSON.stringify({platform,cost:prevBest?prevBest.cost:0,effective_from:nextDay})});
    }
    toast('✓ Custo salvo!');
    _cuhSelStart=null; _cuhSelEnd=null;
    delete inp.dataset.touched;
    cuhLimparSel();
    await renderCustoHist(sku,platform);
  }catch(e){toast('Erro: '+(e.message||e));}
}

// v2.1 — mutex evita syncs paralelos (múltiplas abas ou cliques rápidos)
let _syncLock=false;
async function doSync(){
  if(_syncLock){toast('Sincronização já em andamento...');return;}
  _syncLock=true;
  toast('Sincronizando...');
  try{
    // Plataformas únicas conectadas (evita sync duplicado se houver 2 contas na mesma plataforma)
    const plats=[...new Set((ACCOUNTS||[]).filter(x=>x.is_connected).map(a=>a.platform))];
    // v5.14 — Code Software sincroniza junto se for conta interna
    const syncs=plats.map(p=>api('/api/sync/'+p).catch(()=>null));
    if(USER&&USER.email==='holdinglevelup@gmail.com')
      syncs.push(api('/api/codesoftware/sync?days=30',{method:'POST'}).catch(()=>null));
    await Promise.all(syncs);
    await loadData();startCD();toast('✓ Sincronizado!');
  }finally{
    _syncLock=false;
  }
}

function computeDash(){
  // pending excluído do faturamento/meta
  const paid=FILTERED.filter(o=>o.status!=='cancelled'&&o.status!=='pending');
  const can=FILTERED.filter(o=>o.status==='cancelled');
  const pend=FILTERED.filter(o=>o.status==='pending');
  const sum=(arr,k)=>arr.reduce((s,o)=>s+parseFloat(o[k]||0),0);
  // v5.16 — faturamento usa paid_amount (valor real pago pelo cliente / valor NF)
  const fatVal=o=>parseFloat(o.paid_amount||o.total_amount||0);
  const fat=paid.reduce((s,o)=>s+fatVal(o),0),luc=sum(paid,'profit'),marg=fat>0?(luc/fat*100):0;
  DASH={total_orders:paid.length,cancelados:can.length,faturamento:fat,lucro:luc,tarifas:sum(paid,'platform_fee'),frete:sum(paid,'shipping_fee'),impostos:sum(paid,'tax_amount'),custos:sum(paid,'total_cost'),ticket:paid.length?fat/paid.length:0,marg};
  setText('tb-fat',f(fat));
  setText('tb-luc',f(luc));
  setText('tb-marg', fat>0 ? (marg.toFixed(1)+'% margem') : '—');
  setText('c-ped',paid.length);
  // Badge cancelados + pendentes
  const pedBadges=(can.length?`<span class="badge red">${can.length} cancelados</span> `:'')
    +(pend.length?`<span class="badge" style="background:rgba(251,191,36,.15);color:#fbbf24">${pend.length} pendentes</span>`:'');
  setHTML('c-ped2',pedBadges);
  /* Aguardando pagamento — strip (desktop) e hero (mobile) */
  const pendVal=sum(pend,'total_amount');
  const pendEl=document.getElementById('c-pend-strip');
  if(pendEl){
    if(pend.length>0){
      pendEl.style.display='flex';
      pendEl.innerHTML=`<i class="ti ti-clock-hour4" style="color:#fbbf24;font-size:15px;flex-shrink:0"></i>
        <div style="display:flex;flex-direction:column;gap:0">
          <span style="font-size:8px;color:var(--txt3);text-transform:uppercase;letter-spacing:.6px;font-weight:700">Aguardando pagamento</span>
          <span style="font-size:15px;font-weight:800;color:#fbbf24;letter-spacing:-.3px;line-height:1.2">${f(pendVal)}</span>
        </div>
        <span style="font-size:8px;color:var(--txt3);margin-left:auto;align-self:center">${pend.length} pedido${pend.length!==1?'s':''}</span>`;
    }else{pendEl.style.display='none';}
  }
  /* Mobile hero — aguardando */
  const mhPendEl=document.getElementById('mh-pend');
  if(mhPendEl){
    if(pend.length>0){
      mhPendEl.style.display='flex';
      mhPendEl.innerHTML=`<i class="ti ti-clock-hour4" style="color:#fbbf24;font-size:12px"></i>
        <span style="font-size:9px;color:#fbbf24;font-weight:700">Ag. pgto: ${f(pendVal)} <span style="font-size:8px;opacity:.7">(${pend.length} ped.)</span></span>`;
    }else{mhPendEl.style.display='none';}
  }
  setText('c-tkt',f(DASH.ticket));
  setText('c-luc',f(luc));
  setHTML('c-marg',`<span class="badge green">${pct(marg)} margem</span>`);
  setText('c-can',can.length);
  setText('c-cust',f(DASH.custos));
  setText('c-tar',f(DASH.tarifas));
  setText('c-imp',f(DASH.impostos));
  setText('c-fre',f(DASH.frete));
  if(fat>0){
    setText('c-custp',pct(DASH.custos/fat*100)+' do fat.');
    setText('c-tarp',pct(DASH.tarifas/fat*100));
    setText('c-impp',pct(DASH.impostos/fat*100));
    setText('c-frep',pct(DASH.frete/fat*100));
  }
  /* Setas de comparação com período anterior */
  const P=window._PREV_DASH;
  const cmp=(cur,prev,id,positivo=true,fmt=null)=>{
    const el=document.getElementById(id);if(!el||!P)return;
    const diff=cur-prev,pctDiff=prev>0?(Math.abs(diff)/prev*100):0;
    if(Math.abs(diff)<0.001){el.innerHTML=`<span class="mcard-cmp eq"><i class="ti ti-minus" style="font-size:7px"></i> igual ao anterior</span>`;return;}
    const up=diff>0,good=positivo?up:!up;
    const icon=up?'ti-arrow-up':'ti-arrow-down',cls=good?'up':'dn';
    const label=fmt?fmt(Math.abs(diff)):pctDiff.toFixed(0)+'%';
    const desc=up?'↑':'↓';
    el.innerHTML=`<span class="mcard-cmp ${cls}" title="${label} ${up?'a mais':'a menos'} que o período anterior"><i class="ti ${icon}" style="font-size:7px"></i> ${label} ${desc} anterior</span>`;
  };
  if(P){
    cmp(paid.length,P.ped,'cmp-ped',true,v=>Math.round(v)+' pedido'+(Math.round(v)!==1?'s':''));
    cmp(DASH.ticket,P.ticket,'cmp-tkt',true,v=>f(v));
    cmp(luc,P.luc,'cmp-luc',true,v=>f(v));
    cmp(can.length,P.can,'cmp-can',false,v=>Math.round(v)+' cancelado'+(Math.round(v)!==1?'s':''));
  }
  /* ── Mobile Hero ── */
  const el_=id=>document.getElementById(id);
  if(el_('mh-fat-val'))el_('mh-fat-val').textContent=HIDDEN?'R$ ••••':f(fat);
  if(el_('mh-luc-val'))el_('mh-luc-val').textContent=HIDDEN?'R$ ••••':f(luc);
  if(el_('mh-upd-time'))el_('mh-upd-time').textContent=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const mhBadge=(elId,cur,prev)=>{
    const el=el_(elId); if(!el)return;
    if(!P||Math.abs(cur-prev)<0.01){el.className='mh-badge eq';el.textContent='igual ao anterior';return;}
    const up=cur>prev,pct=(Math.abs(cur-prev)/Math.max(prev,0.01)*100).toFixed(0)+'%';
    el.className=`mh-badge ${up?'up':'dn'}`;
    el.innerHTML=`<i class="ti ${up?'ti-arrow-up':'ti-arrow-down'}" style="font-size:9px"></i> ${pct} ${up?'a mais':'a menos'}`;
  };
  mhBadge('mh-fat-cmp',fat,P?P.fat||0:fat);
  mhBadge('mh-luc-cmp',luc,P?P.luc||0:luc);
  renderDRE();
}

/* Carrega total de rendimentos extras do mês atual */
async function ssLoadAddRevTotal(){
  try{
    const j=await ssFetchJson(`${API}/api/additional-revenues`);
    const total=parseFloat(j.total||0);
    const val=total>0?f(total):'R$ 0,00';
    const el=document.getElementById('c-addrev');if(el)el.textContent=val;
    const tb=document.getElementById('tb-addrev');if(tb)tb.textContent=val;
  }catch(e){
    const tb=document.getElementById('tb-addrev');if(tb)tb.textContent='—';
  }
}

/* Carrega dados do período anterior para comparação */
async function loadCompare(){
  try{
    const days=CUSTOM_FROM&&CUSTOM_TO?null:clampPeriod(PERIOD);
    if(!days)return; // sem comparação para período customizado
    const hoje=new Date();
    const toD=new Date(hoje);toD.setDate(hoje.getDate()-days);
    const frD=new Date(toD);frD.setDate(toD.getDate()-days+1);
    const fmt=d=>localDateStr(d);
    const{data}=await api(`/api/orders?date_from=${fmt(frD)}&date_to=${fmt(toD)}${PLAT?'&platform='+PLAT:''}`);
    const paid=(data||[]).filter(o=>o.status!=='cancelled'&&o.status!=='pending'),can=(data||[]).filter(o=>o.status==='cancelled');
    const sum=(arr,k)=>arr.reduce((s,o)=>s+parseFloat(o[k]||0),0);
    const fat=paid.reduce((s,o)=>s+parseFloat(o.paid_amount||o.total_amount||0),0);
    window._PREV_DASH={ped:paid.length,fat,luc:sum(paid,'profit'),can:can.length,ticket:paid.length?fat/paid.length:0};
  }catch(e){window._PREV_DASH=null;}
}

window.PAGE_SIZE = window.PAGE_SIZE || 20;
function setPageSize(n){
  window.PAGE_SIZE=n;PAGE=1;
  const sel=document.getElementById('page-size-select');
  if(sel)sel.value=String(n);
  renderOrders();
}
function renderOrders(){
  const pp = window.PAGE_SIZE || 20;

  // Aplica filtros de texto e de produto por cima do FILTERED
  let view = Array.isArray(FILTERED) ? FILTERED : [];
  if(SRCH){
    const t=SRCH.toLowerCase();
    view=view.filter(o=>(o.item_title||'').toLowerCase().includes(t)||(o.item_sku||'').toLowerCase().includes(t)||(o.platform_order_id||'').toLowerCase().includes(t));
  }
  if(PROD_FILTER){
    view=view.filter(o=>(o.platform==='codesoftware'?'CODESOFTWARE VENDAS':(o.item_title||o.shop_name||o.platform))===PROD_FILTER);
  }

  // Mantém o campo de busca sincronizado com SRCH (sem apagar o que o usuário digitou)
  const el=document.getElementById('srch');if(el&&el.value.toLowerCase()!==SRCH)el.value=SRCH;

  const total = view.length;
  const pages = Math.max(1, Math.ceil(total / pp));
  PAGE = Math.min(PAGE || 1, pages);

  const slice = view.slice((PAGE - 1) * pp, PAGE * pp);

  if (!slice.length) {
    document.getElementById('orders-body').innerHTML =
      '<tr><td colspan="15"><div class="empty"><i class="ti ti-package-off"></i><p>Nenhum pedido encontrado</p></div></td></tr>';
    document.getElementById('orders-count').textContent = '0 pedidos';
    document.getElementById('page-info').textContent = PAGE + ' de ' + pages;
    return;
  }

  let lastDay = '';
  let html = '';
  window._orderRowCache = slice;

  slice.forEach((o, _rowIdx) => {
    o = o || {};

    const day = fday(o.order_date);
    if (day !== lastDay) {
      html += `<tr class="date-row"><td colspan="15">${day}</td></tr>`;
      lastDay = day;
    }

    const luc = o.status === 'cancelled' ? null : parseFloat(o.profit || 0);
    const marg = luc != null && parseFloat(o.total_amount || 0) > 0
      ? (luc / parseFloat(o.total_amount || 0) * 100)
      : 0;

    const lbdg = o.status === 'cancelled'
      ? '<span class="profit-neg">Cancelado</span>'
      : luc >= 0
        ? `<span class="profit-pos">${f(luc)} · ${pct(marg)}</span>`
        : `<span class="profit-neg">${f(luc)}</span>`;

    // v5.14 — Code Software usa ícone K dourado
    const img = o.platform==='codesoftware'
      ? `<span class="row-img-ph" style="background:linear-gradient(135deg,#C8960C,#a87700);color:#fff;font-weight:900;font-size:14px">K</span>`
      : o.item_image
        ? `<img class="row-img" src="${o.item_image}" loading="lazy" onerror="this.outerHTML='<span class=row-img-ph>📦</span>'">`
        : '<span class="row-img-ph">📦</span>';

    const sc = STATUS_PT[o.status] || o.status || '—';
    const sclr = STATUS_CLR[o.status] || 'var(--txt3)';
    const sbg = STATUS_BG[o.status] || 'transparent';

    const ftype = o.fulfillment_type === 'full'
      ? '<span class="type-full">FULL</span>'
      : '<span class="type-normal">Normal</span>';

    let envioCell = '—';
    try {
      envioCell = `${shipBadge(o)}${labelButton(o)}`;
    } catch(e) {
      envioCell = '<span class="type-normal">—</span>';
    }

    let unitCost = 0;
    try {
      unitCost = parseFloat((o.unit_cost ?? ((o.total_cost || 0) / (o.quantity || 1))) || 0);
    } catch(e) {}

    const metric = (field, type, fallback) => {
      try { return editableMetric(o, field, type, fallback); }
      catch(e) { return `<span style="color:var(--txt3)">${type === 'percent' ? pct(0) : f(fallback || 0)}</span>`; }
    };

    html += `<tr onclick="openOrder(${_rowIdx})">
      <td data-label="Foto">${img}</td>

      <td data-label="Produto" style="max-width:160px">
        <div style="font-weight:600;color:var(--txt);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px">
          ${o.item_title || '—'}
        </div>
        <div style="font-size:9px;color:var(--txt3);margin-top:2px">
          ${PBADGE[o.platform] || ''} ${o.platform_order_id || ''}
        </div>
      </td>

      <td data-label="Conta" style="font-size:10px;color:var(--txt2)">${o.shop_name || '—'}</td>
      <td data-label="SKU" style="color:var(--p3);font-weight:700;font-size:10px">${o.item_sku || '—'}</td>
      <td data-label="Data" style="font-size:9px;white-space:nowrap;color:var(--txt3)">${fdt(o.order_date)}</td>

      <td data-label="Status">
        <span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;background:${sbg};color:${sclr}">
          ${sc}
        </span>
      </td>

      <td data-label="Envio">${envioCell}</td>
      <td data-label="Tipo">${ftype}</td>
      <td data-label="Qtde" style="color:var(--txt2)">${o.quantity || 1}</td>

      <td data-label="Total" style="font-weight:700">${f(o.paid_amount||o.total_amount)}</td>
      <td data-label="Tarifa">${metric('fee_pct','percent',o.platform_fee)}</td>
      <td data-label="Frete">${metric('shipping_fee','money',o.shipping_fee)}</td>
      <td data-label="Imposto">${metric('tax_pct','percent',o.tax_amount)}</td>
      <td data-label="Custo">${metric('cost','money',unitCost)}</td>

      <td data-label="Lucro">${lbdg}</td>
    </tr>`;
  });

  document.getElementById('orders-body').innerHTML = html;
  document.getElementById('orders-count').textContent = total + ' pedidos';
  document.getElementById('page-info').textContent = PAGE + ' de ' + pages;
}

function renderProds(){
  const list=document.getElementById('prod-list');
  const src=PTAB==='canceladas'?FILTERED.filter(o=>o.status==='cancelled'):FILTERED.filter(o=>o.status!=='cancelled');
  const map={};
  src.forEach(o=>{const k=o.platform==='codesoftware'?'CODESOFTWARE VENDAS':(o.item_title||o.shop_name||o.platform);const v=PTAB==='fat'?parseFloat(o.paid_amount||o.total_amount||0):PTAB==='lucro'?parseFloat(o.profit||0):1;if(!map[k])map[k]={t:k,img:o.item_image,v:0,c:0,luc:0};map[k].v+=v;map[k].c++;map[k].luc+=parseFloat(o.profit||0);});
  const arr=Object.values(map).sort((a,b)=>b.v-a.v);
  const tot=arr.reduce((s,x)=>s+x.v,0)||1;
  const colors=['#8b5cf6','#38bdf8','#10b981','#fb923c','#fbbf24','#f87171'];
  if(!arr.length){list.innerHTML='<div class="empty"><i class="ti ti-package-off"></i><p>Sem dados</p></div>';return;}
  // v2.1 — mostra todos os produtos (sem limite de 5)
  list.innerHTML=arr.map((item,i)=>{
    const p=(item.v/tot*100).toFixed(1),color=colors[i%colors.length];
    const circ=Math.PI*2*14,dash=(p/100)*circ;
    // v5.14 — Code Software usa ícone K dourado nos cards de produto
    const isCS=item.t==='CODESOFTWARE VENDAS';
    const img=isCS?`<div class="prod-img-ph" style="background:linear-gradient(135deg,#C8960C,#a87700);color:#fff;font-weight:900;font-size:14px">K</div>`:item.img?`<img class="prod-img" src="${item.img}" loading="lazy" onerror="this.outerHTML='<div class=prod-img-ph>📦</div>'">`:'<div class="prod-img-ph">📦</div>';
    const ativo=PROD_FILTER===item.t;
    const tEsc=item.t.replace(/'/g,"\\'").replace(/"/g,'&quot;');
    return`<div class="prod-item" onclick="filtrarPorProduto('${tEsc}')" title="${ativo?'Clique para remover filtro':'Clique para filtrar pedidos'}" style="cursor:pointer;transition:all .2s;${ativo?`outline:2px solid ${color};border-radius:10px;background:rgba(${color.startsWith('#')?hexToRgb(color):'109,40,217'},.08);`:''}">
      <svg width="38" height="38" viewBox="0 0 36 36"><circle cx="18" cy="18" r="14" fill="none" stroke="var(--bg5)" stroke-width="5"/>
        <circle cx="18" cy="18" r="14" fill="none" stroke="${color}" stroke-width="5" stroke-dasharray="${dash} ${circ-dash}" stroke-dashoffset="${circ/4}" transform="rotate(-90 18 18)"/>
        <text x="18" y="22" text-anchor="middle" fill="${color}" font-size="8" font-weight="700">${p}%</text></svg>
      ${img}
      <div class="prod-title" title="${item.t}">${item.t}</div>
      <div class="prod-right">
        <!-- v2.1 — labels Fat/Luc antes dos valores -->
        <div style="display:flex;align-items:center;gap:3px;justify-content:flex-end">
          ${PTAB!=='vendas'&&PTAB!=='canceladas'?`<span style="font-size:8px;color:var(--txt3);font-weight:500">Fat:</span>`:''}
          <div class="v" style="color:${color}">${PTAB==='vendas'||PTAB==='canceladas'?item.c+' un.':f(item.v)}</div>
        </div>
        ${PTAB!=='lucro'&&PTAB!=='vendas'&&PTAB!=='canceladas'&&item.luc!==0?`<div style="display:flex;align-items:center;gap:3px;justify-content:flex-end"><span style="font-size:8px;color:var(--txt3);font-weight:500">Luc:</span><div style="font-size:10px;color:${item.luc>=0?'var(--green2)':'var(--red2)'};font-weight:600;line-height:1.2">${f(item.luc)}</div></div>`:''}
        <div class="p">${p}%</div>
      </div>
      ${ativo?`<div style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:${color};color:#fff;border-radius:6px;padding:2px 6px;font-size:9px;font-weight:800">✓ FILTRANDO</div>`:''}
    </div>`;
  }).join('');
  // helper
  if(!window.hexToRgb) window.hexToRgb=h=>{const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return`${r},${g},${b}`;};
}

/* ── Chart: period state ── */
window._SS_CHART_CACHE  = window._SS_CHART_CACHE  || {};
window._SS_CHART_PERIOD = window._SS_CHART_PERIOD ?? 0; // 0 = mês atual

function ssChartSetPeriod(p){
  window._SS_CHART_PERIOD=p;
  document.querySelectorAll('.ctab').forEach(b=>{
    b.classList.toggle('active',+b.dataset.p===p);
  });
  ssDrawDailyChart();
}

function ssDrawDailyChart(){
  const canvas=document.getElementById('ss-daily-canvas');
  const tip=document.getElementById('ss-chart-tip');
  const totalEl=document.getElementById('ss-chart-total');
  if(!canvas)return;
  const period=window._SS_CHART_PERIOD??0; // 0 = mês atual
  const brl=v=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

  /* ── Agrupa pedidos em buckets ── */
  const buildBuckets=(orders,addRevItems=[])=>{
    const ok=(orders||[]).filter(o=>o.status!=='cancelled'&&o.status!=='pending');
    const hoje=new Date();
    let buckets=[];

    // period=0 → mês atual (dia 1 até hoje)
    const isMonthMode=period===0;
    const dailyDays=isMonthMode?hoje.getDate():period;

    if(isMonthMode||period<=30){
      /* Buckets diários */
      for(let i=dailyDays-1;i>=0;i--){
        const d=new Date(hoje);d.setDate(hoje.getDate()-i);d.setHours(0,0,0,0);
        const label=d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
        buckets.push({label,fat:0,lucro:0,vendas:0,orders:[],addrevs:[]});
      }
      ok.forEach(o=>{
        const d=new Date(o.order_date);
        if(isMonthMode&&(d.getMonth()!==hoje.getMonth()||d.getFullYear()!==hoje.getFullYear()))return;
        const label=d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
        const slot=buckets.find(b=>b.label===label);
        if(!slot)return;
        slot.fat+=parseFloat(o.paid_amount||o.total_amount||0);
        slot.lucro+=parseFloat(o.profit||0);
        slot.vendas++;slot.orders.push(o);
      });
      // Distribui rendimentos extras pelo dia exato do starts_at
      addRevItems.forEach(r=>{
        if(!r.starts_at)return;
        const dateStr=String(r.starts_at).slice(0,10); // yyyy-mm-dd seguro
        const d=new Date(dateStr+'T12:00:00');
        if(!Number.isFinite(d.getTime()))return;
        const label=d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
        const slot=buckets.find(b=>b.label===label);
        if(!slot)return;
        slot.fat+=parseFloat(r.amount||0);
        slot.addrevs.push(r);
      });
    } else {
      /* Buckets mensais */
      const numMeses=period<=90?3:12;
      const map={};
      ok.forEach(o=>{
        const d=new Date(o.order_date);
        const sk=d.getFullYear()*100+d.getMonth();
        const label=d.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'})
          .replace('. ','/').replace('.','').replace(' /','/');
        if(!map[sk])map[sk]={label,sk,fat:0,lucro:0,vendas:0,orders:[],addrevs:[]};
        map[sk].fat+=parseFloat(o.paid_amount||o.total_amount||0);
        map[sk].lucro+=parseFloat(o.profit||0);
        map[sk].vendas++;map[sk].orders.push(o);
      });
      // Monta buckets mensais (garante todos os meses, com ou sem pedidos)
      for(let i=numMeses-1;i>=0;i--){
        const d=new Date(hoje.getFullYear(),hoje.getMonth()-i,1);
        const sk=d.getFullYear()*100+d.getMonth();
        const label=d.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'})
          .replace('. ','/').replace('.','').replace(' /','/');
        if(!map[sk])map[sk]={label,sk,fat:0,lucro:0,vendas:0,orders:[],addrevs:[]};
        buckets.push(map[sk]);
      }
      // Rendimentos extras no mês exato do starts_at
      addRevItems.forEach(r=>{
        if(!r.starts_at)return;
        const dateStr=String(r.starts_at).slice(0,10);
        const d=new Date(dateStr+'T12:00:00');
        if(!Number.isFinite(d.getTime()))return;
        const sk=d.getFullYear()*100+d.getMonth();
        const slot=buckets.find(b=>b.sk===sk);
        if(!slot)return; // fora do range visível
        slot.fat+=parseFloat(r.amount||0);
        slot.addrevs.push(r);
      });
    }
    return buckets;
  };

  /* ── Renderiza canvas ── */
  let _chartBuckets=[];
  const render=(orders,addRevItems=[])=>{
    const buckets=buildBuckets(orders,addRevItems);
    _chartBuckets=buckets;
    const total=buckets.reduce((s,b)=>s+b.fat,0);
    if(totalEl)totalEl.textContent=brl(total);
    /* Atualiza MTD no mobile hero quando gráfico está em modo Mês */
    if(period===0){const mtdEl=document.getElementById('mh-mtd-val');if(mtdEl)mtdEl.textContent=brl(total);}

    requestAnimationFrame(()=>{
      const wrap=canvas.parentElement;
      const cw=wrap.clientWidth||400;
      const ch=wrap.clientHeight||110;
      const dpr=window.devicePixelRatio||1;
      canvas.width=cw*dpr; canvas.height=ch*dpr;
      canvas.style.width=cw+'px'; canvas.style.height=ch+'px';
      const ctx=canvas.getContext('2d');
      ctx.scale(dpr,dpr);

      const maxVal=Math.max(...buckets.map(b=>b.fat),1);
      const fmtY=v=>{
        if(v>=1000000)return 'R$'+(v/1000000).toFixed(1).replace('.',',')+'M';
        if(v>=1000)return 'R$'+Math.round(v/1000)+'k';
        return 'R$'+Math.round(v);
      };

      /* Padding: esquerda reservada para eixo Y */
      const pad={t:8,b:24,l:46,r:6};
      const plotW=cw-pad.l-pad.r;
      const plotH=ch-pad.t-pad.b;

      /* Grid horizontal + labels Y */
      const ySteps=3;
      ctx.font='8.5px Inter,sans-serif';
      ctx.textAlign='right';
      for(let i=0;i<=ySteps;i++){
        const val=maxVal/ySteps*i;
        const y=pad.t+plotH*(1-i/ySteps);
        ctx.strokeStyle='rgba(255,255,255,.05)';
        ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(cw-pad.r,y);ctx.stroke();
        ctx.fillStyle='rgba(148,163,184,.45)';
        ctx.fillText(fmtY(val),pad.l-4,y+3);
      }

      /* Barras */
      const n=buckets.length;
      const gap=n>20?2:n>10?4:6;
      const barW=Math.max((plotW-(n-1)*gap)/n,4);
      const radius=Math.min(4,barW/2);

      buckets.forEach((d,i)=>{
        const x=pad.l+i*(barW+gap);
        /* Track */
        ctx.fillStyle='rgba(255,255,255,.03)';
        roundRect(ctx,x,pad.t,barW,plotH,radius);ctx.fill();
        /* Barra azul */
        if(d.fat>0){
          const bh=Math.max(d.fat/maxVal*plotH,3);
          const y=pad.t+plotH-bh;
          const grad=ctx.createLinearGradient(0,y,0,y+bh);
          grad.addColorStop(0,'#a78bfa');
          grad.addColorStop(1,'#6d28d9');
          ctx.fillStyle=grad;
          roundRect(ctx,x,y,barW,bh,radius);ctx.fill();
        }
      });

      /* Labels X */
      const showEvery=n>20?Math.ceil(n/7):n>10?Math.ceil(n/6):1;
      ctx.fillStyle='rgba(148,163,184,.6)';
      ctx.font=`${Math.max(7.5,Math.min(9,barW*0.65))}px Inter,sans-serif`;
      ctx.textAlign='center';
      buckets.forEach((d,i)=>{
        if(i%showEvery!==0&&i!==n-1)return;
        const x=pad.l+i*(barW+gap)+barW/2;
        ctx.fillText(d.label,x,ch-5);
      });

      /* Hover tooltip */
      canvas.onmousemove=function(e){
        const rect=canvas.getBoundingClientRect();
        const mx=e.clientX-rect.left;
        let found=null;
        buckets.forEach((d,i)=>{const x=pad.l+i*(barW+gap);if(mx>=x&&mx<=x+barW)found={d,i};});
        if(!found){tip.style.display='none';return;}
        const {d,i}=found;
        const addRevDayTotal=(d.addrevs||[]).reduce((s,r)=>s+parseFloat(r.amount||0),0);
        const addRevNames=(d.addrevs||[]).map(r=>r.name).join(', ');
        const acum=period===0?buckets.slice(0,i+1).reduce((s,b)=>s+b.fat,0):0;
        tip.innerHTML=`
          <div style="font-size:9px;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;font-weight:800;margin-bottom:6px">${d.label}</div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:16px">
              <span style="font-size:9px;color:var(--txt3);font-weight:600">Faturado</span>
              <span style="font-size:13px;font-weight:800;color:var(--p3)">${brl(d.fat)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:16px">
              <span style="font-size:9px;color:var(--txt3);font-weight:600">Lucro líquido</span>
              <span style="font-size:12px;font-weight:800;color:${d.lucro>=0?'#34d399':'#f87171'}">${brl(d.lucro)}</span>
            </div>
            ${period===0?`<div style="display:flex;justify-content:space-between;align-items:center;gap:16px;margin-top:1px">
              <span style="font-size:9px;color:var(--txt3);font-weight:600">Acumulado mês</span>
              <span style="font-size:11px;font-weight:700;color:var(--p3);opacity:.75">${brl(acum)}</span>
            </div>`:''}
            ${addRevDayTotal>0?`<div style="margin-top:2px;padding-top:4px;border-top:1px solid rgba(255,255,255,.06)">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
                <span style="font-size:9px;color:var(--green2);font-weight:600">💰 Rendimento extra</span>
                <span style="font-size:11px;font-weight:700;color:var(--green2)">+${brl(addRevDayTotal)}</span>
              </div>
              ${addRevNames?`<div style="font-size:8px;color:var(--txt3);margin-top:2px;max-width:180px;white-space:normal">${addRevNames}</div>`:''}
            </div>`:''}
          </div>
        `;
        tip.style.display='block';
        const tipW=tip.offsetWidth;
        let left=pad.l+i*(barW+gap)+barW/2-tipW/2;
        if(left<4)left=4;if(left+tipW>cw-4)left=cw-tipW-4;
        tip.style.left=left+'px';
        tip.style.top=(pad.t+4)+'px';
      };
      canvas.onmouseleave=()=>{tip.style.display='none';};
    });
  };

  /* ── Busca dados (com cache por período) ── */
  if(!window._SS_CHART_CACHE)window._SS_CHART_CACHE={};
  if(totalEl)totalEl.textContent='Carregando...';
  // period=0 → mês atual: busca 31 dias para garantir o mês cheio
  const apiPeriod=period===0?31:period;
  // v2.1 — cache separado por conta para não misturar dados de contas diferentes
  const cacheKey=period+'|'+(PLAT||'')+'|'+(ACC_FILTER||'');
  const ordersPromise=window._SS_CHART_CACHE[cacheKey]
    ?Promise.resolve(window._SS_CHART_CACHE[cacheKey])
    :api(`/api/orders?period=${apiPeriod}${PLAT?'&platform='+PLAT:''}`).then(({data})=>{
      let orders=data||[];
      if(ACC_FILTER)orders=orders.filter(o=>(o.shop_name||'')===ACC_FILTER);
      window._SS_CHART_CACHE[cacheKey]=orders;
      return orders;
    }).catch(()=>ALL);
  // Busca todos os rendimentos extras com starts_at para distribuir por dia
  const _fetchAddRevItems=()=>{
    const fetcher=typeof ssFetchJson==='function'
      ?ssFetchJson(`${API}/api/additional-revenues/all`)
      :api('/api/additional-revenues/all').then(r=>r.data||r);
    return fetcher.then(j=>{
      const items=Array.isArray(j)?j:Array.isArray(j.items)?j.items:[];
      return items;
    }).catch(e=>{console.warn('[Chart] addRevItems erro:',e.message);return[];});
  };
  const addRevPromise=_fetchAddRevItems();
  Promise.all([ordersPromise,addRevPromise]).then(([orders,addRevItems])=>{
    render(orders,addRevItems);
  });
}

function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h);
  ctx.lineTo(x,y+h);
  ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

function openOrder(idx){
  const o=(window._orderRowCache||[])[idx];
  if(!o)return;
  window._currentOrder=o;
  openMo('mo-order');
  const luc=o.status==='cancelled'?null:parseFloat(o.profit||0);
  const marg=luc!=null&&o.total_amount>0?(luc/o.total_amount*100):0;
  document.getElementById('od-title').textContent='Pedido '+(o.platform_order_id||'—');
  document.getElementById('od-sub').textContent=(o.shop_name||'—')+' · '+(o.platform||'').toUpperCase();
  const img=o.item_image?`<img class="od-img-big" src="${o.item_image}" onerror="this.outerHTML='<div class=od-img-big-ph>📦</div>'">`:'<div class="od-img-big-ph">📦</div>';
  const sc=STATUS_PT[o.status]||o.status;const sclr=STATUS_CLR[o.status]||'var(--txt3)';const sbg=STATUS_BG[o.status]||'transparent';
  document.getElementById('od-body').innerHTML=`
    <div style="display:flex;gap:14px;background:var(--bg3);border:1px solid var(--border);border-radius:14px;padding:14px;">${img}
      <div style="flex:1"><div style="font-size:14px;font-weight:700;margin-bottom:8px;line-height:1.4">${o.item_title||'—'}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${PBADGE[o.platform]||''}
          <span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;background:${sbg};color:${sclr}">${sc}</span>
          ${o.fulfillment_type==='full'?'<span class="type-full">📦 Full</span>':'<span class="type-normal">🏪 Normal</span>'}
          ${shipBadge(o)}
          ${labelButton(o)}
          ${o.item_sku?`<span style="background:rgba(139,92,246,.1);color:var(--p3);font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;border:1px solid rgba(139,92,246,.2)">SKU: ${o.item_sku}</span>`:''}
        </div>
      </div>
    </div>
    <div class="grid2">
      <div class="od-block"><div class="od-block-title"><i class="ti ti-user"></i> Comprador</div>
        <div class="od-row"><span class="l">Nome</span><span class="v">${o.buyer_name||'—'}</span></div>
        <div class="od-row"><span class="l">Conta</span><span class="v">${o.shop_name||'—'}</span></div>
        <div class="od-row"><span class="l">Data</span><span class="v">${fdt(o.order_date)}</span></div>
        <div class="od-row"><span class="l">Plataforma</span><span class="v">${(o.platform||'').toUpperCase()}</span></div>
        <div class="od-row"><span class="l">Pagamento</span><span class="v">${o.payment_method||'—'} ${o.installments?`· ${o.installments}x`:''}</span></div>
      </div>
      <div class="od-block"><div class="od-block-title"><i class="ti ti-receipt"></i> Valores</div>
        ${o.platform==='magalu'?`
        <div class="od-row"><span class="l">Valor de venda</span><span class="v">${f(o.total_amount)}</span></div>
        ${o.discount_amount>0?`<div class="od-row"><span class="l">Desconto</span><span class="v" style="color:var(--txt3)">− ${f(o.discount_amount)}</span></div>`:''}
        <div class="od-row"><span class="l">Tarifa plataf.</span><span class="v" style="color:var(--red2)">− ${f(o.platform_fee)}</span></div>
        <div class="od-row"><span class="l">Frete</span><span class="v" style="color:var(--yellow2)">− ${f(o.shipping_fee)}</span></div>
        <div class="od-row" style="border-top:1px solid rgba(255,255,255,.08);margin-top:3px;padding-top:5px"><span class="l" style="font-weight:700">Pago pelo cliente</span><span class="v" style="color:var(--p3)">${f(o.paid_amount||o.total_amount)}</span></div>
        <div class="od-row"><span class="l">Impostos</span><span class="v" style="color:var(--blue2)">− ${f(o.tax_amount)}</span></div>
        `:`
        <div class="od-row"><span class="l">Valor venda</span><span class="v">${f(o.total_amount)}</span></div>
        <div class="od-row"><span class="l">Pago cliente</span><span class="v">${f(o.paid_amount||o.total_amount)}</span></div>
        <div class="od-row"><span class="l">Tarifa ML/Plataf.</span><span class="v" style="color:var(--red2)">− ${f(o.platform_fee)}</span></div>
        <div class="od-row"><span class="l">Frete</span><span class="v" style="color:var(--yellow2)">− ${f(o.shipping_fee)} ${o.manual_shipping_fee!==null&&o.manual_shipping_fee!==undefined?'<small style="color:var(--txt3)">manual</small>':''}</span></div>
        <div class="od-row"><span class="l">Frete auto ML</span><span class="v">${f(o.auto_shipping_fee ?? o.shipping_fee)} <small style="color:var(--txt3)">${o.shipping_fee_source||'auto'}</small></span></div>
        <div class="od-row"><span class="l">Impostos</span><span class="v" style="color:var(--blue2)">− ${f(o.tax_amount)}</span></div>
        `}
      </div>
      ${o.platform==='codesoftware'&&Array.isArray(o.itens)&&o.itens.length?`
      <div class="od-block" style="grid-column:1/-1"><div class="od-block-title"><i class="ti ti-package"></i> Itens da Venda (${o.itens.length})</div>
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead><tr style="color:var(--txt3);font-size:10px;border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:4px 6px">Produto</th>
            <th style="text-align:center;padding:4px 6px">Qtd</th>
            <th style="text-align:right;padding:4px 6px">Vl. Unit</th>
            <th style="text-align:right;padding:4px 6px">Vl. Total</th>
            <th style="text-align:right;padding:4px 6px;color:var(--orange2)">Custo</th>
            <th style="text-align:right;padding:4px 6px;color:var(--green2)">Lucro</th>
          </tr></thead>
          <tbody>
          ${o.itens.map((it,_itIdx)=>{
            const vt=parseFloat(it.vr_total||0),ct=parseFloat(it.custo_total_venda||0),luc=vt-ct;
            const ref=String(it.produto?.codigo_ref??'');
            return`<tr style="border-bottom:1px solid rgba(255,255,255,.04)">
              <td style="padding:5px 6px;color:var(--txt1)">${it.produto?.nome_produto||'—'}<br><small style="color:var(--txt3)">Ref: ${ref||'—'}</small></td>
              <td style="text-align:center;padding:5px 6px;color:var(--txt2)">${it.quantidade||1}</td>
              <td style="text-align:right;padding:5px 6px">${f(it.vr_unitario||0)}</td>
              <td style="text-align:right;padding:5px 6px;font-weight:700">${f(vt)}</td>
              <td id="csit-ct-${_itIdx}" style="text-align:right;padding:5px 6px">
                <span id="csit-ct-view-${_itIdx}" ${ref?`onclick="csEditItemCost(${_itIdx},'${ref.replace(/'/g,"\\'")}',${vt})"`:''} style="color:var(--orange2);${ref?'cursor:pointer;border-bottom:1px dashed rgba(251,146,60,.4)':''}" title="${ref?'Clique para editar o custo só desta venda':''}">− ${f(ct)} ${it.custo_overridden?'<i class="ti ti-pencil" title="Custo manual" style="font-size:9px;opacity:.7"></i>':''}</span>
              </td>
              <td id="csit-luc-${_itIdx}" style="text-align:right;padding:5px 6px;color:${luc>=0?'var(--green2)':'var(--red2)'};font-weight:700">${f(luc)}</td>
            </tr>`;
          }).join('')}
          </tbody>
        </table>
      </div>`:`
      <div class="od-block"><div class="od-block-title"><i class="ti ti-package"></i> Produto</div>
        <div class="od-row"><span class="l">SKU</span><span class="v" style="color:var(--p3)">${o.item_sku||'—'}</span></div>
        <div class="od-row"><span class="l">Custo prod.</span><span class="v" style="color:var(--orange2)">${f(o.total_cost)}</span></div>
        <div class="od-row"><span class="l">Quantidade</span><span class="v">${o.quantity||1}</span></div>
        <div class="od-row"><span class="l">Tipo</span><span class="v">${o.fulfillment_type==='full'?'Full':'Normal'}</span></div>
        <div class="od-row"><span class="l">Item ML</span><span class="v">${o.item_id||'—'}</span></div>
        <div class="od-row"><span class="l">Anúncio</span><span class="v">${o.listing_type_id||'—'}</span></div>
      </div>`}
      <div class="od-block"><div class="od-block-title"><i class="ti ti-trending-up"></i> Performance</div>
        <div class="od-row"><span class="l">Receita líq.</span><span class="v">${f(o.net_revenue)}</span></div>
        <div class="od-row"><span class="l">Margem</span><span class="v">${pct(marg)}</span></div>
        <div class="od-row"><span class="l">Status</span><span class="v" style="color:${sclr}">${sc}</span></div>
        <div class="od-row"><span class="l">Envio</span><span class="v">${shipBadge(o)}</span></div>
        <div class="od-row"><span class="l">ID Envio</span><span class="v" style="font-size:9px;color:var(--txt3)">${o.ml_shipping_id||'—'}</span></div>
        <div class="od-row"><span class="l">Rastreio</span><span class="v">${o.ml_tracking_number||'—'}</span></div>
        <div class="od-row"><span class="l">ID</span><span class="v" style="font-size:9px;color:var(--txt3)">${o.platform_order_id||'—'}</span></div>
      </div>
    </div>
    <div class="od-total">
      <div><div style="font-size:13px;font-weight:700;color:var(--txt2)">Lucro Líquido</div><div style="font-size:10px;color:var(--txt3);margin-top:2px">Margem: ${pct(marg)}</div></div>
      <div style="font-size:24px;font-weight:800;letter-spacing:-.5px;color:${luc!=null&&luc>=0?'var(--green2)':'var(--red2)'}">${luc!=null?f(luc):'Cancelado'}</div>
    </div>
    <button class="btn ghost" onclick="closeMo('mo-order')"><i class="ti ti-x"></i> Fechar</button>`;
}

// v5.17 — Custo manual por item, exclusivo Code Software (vale só para esta venda) — edição inline na célula
function csEditItemCost(itIdx,itemRef,vrTotal){
  const o=window._currentOrder;
  if(!o||o.platform!=='codesoftware')return;
  const it=o.itens[itIdx];
  const ctAtual=parseFloat(it.custo_total_venda||0);
  const cell=document.getElementById('csit-ct-'+itIdx);
  if(!cell||cell.querySelector('input'))return;
  cell.innerHTML=`<span style="display:inline-flex;align-items:center;gap:4px">
    <span style="font-size:10px;color:var(--orange2)">R$</span>
    <input id="csit-input-${itIdx}" type="number" step="0.01" min="0" value="${ctAtual.toFixed(2)}"
      style="width:72px;padding:3px 5px;border-radius:6px;border:1.5px solid var(--orange2);background:var(--bg1);color:var(--txt);font-size:11px;font-weight:700;text-align:right;outline:none"
      onkeydown="if(event.key==='Enter')csSaveItemCost(${itIdx},'${itemRef.replace(/'/g,"\\'")}',${vrTotal});if(event.key==='Escape')csCancelItemCost(${itIdx})"/>
    <i class="ti ti-check" style="cursor:pointer;color:var(--green2);font-size:13px" onclick="csSaveItemCost(${itIdx},'${itemRef.replace(/'/g,"\\'")}',${vrTotal})"></i>
    <i class="ti ti-x" style="cursor:pointer;color:var(--txt3);font-size:13px" onclick="csCancelItemCost(${itIdx})"></i>
  </span>`;
  const inp=document.getElementById('csit-input-'+itIdx);
  inp.focus();inp.select();
}

function csCancelItemCost(itIdx){
  const o=window._currentOrder;
  const idx=(window._orderRowCache||[]).indexOf(o);
  openOrder(idx>=0?idx:0);
}

async function csSaveItemCost(itIdx,itemRef,vrTotal){
  const o=window._currentOrder;
  const inp=document.getElementById('csit-input-'+itIdx);
  const novo=parseFloat(String(inp.value).replace(',','.'));
  if(isNaN(novo)||novo<0){toast('Valor inválido.');return;}
  try{
    await api('/api/codesoftware/item-cost',{method:'POST',body:JSON.stringify({platform_order_id:o.platform_order_id,item_ref:itemRef,custo:novo})});
    // Atualiza localmente sem precisar re-sincronizar tudo
    o.itens[itIdx].custo_total_venda=novo;
    o.itens[itIdx].custo_overridden=true;
    const novoCustoTotal=o.itens.reduce((s,it)=>s+parseFloat(it.custo_total_venda||0),0);
    o.total_cost=novoCustoTotal;o.unit_cost=novoCustoTotal;
    o.profit=o.status==='cancelled'?0:parseFloat(o.total_amount||0)-novoCustoTotal-parseFloat(o.platform_fee||0)-parseFloat(o.shipping_fee||0);
    o.margin=o.total_amount>0?(o.profit/o.total_amount*100):0;
    // Reflete na linha da tabela de pedidos por trás do modal também
    const idx=(window._orderRowCache||[]).indexOf(o);
    if(idx>=0)window._orderRowCache[idx]=o;
    toast('✓ Custo do item atualizado!');
    openOrder(idx>=0?idx:0); // re-renderiza o modal com os novos valores
  }catch(e){toast('Erro: '+(e.message||e));}
}

function platLabel(platform){
  return {mercadolivre:'Mercado Livre',magalu:'Magalu',shopee:'Shopee',geral:'Geral'}[platform] || platform || 'Geral';
}
function platShort(platform){
  return {mercadolivre:'ML',magalu:'Magalu',shopee:'Shopee',geral:'Geral'}[platform] || platform || 'Geral';
}
function escAttr(v){return String(v??'').replace(/&/g,'&amp;').replace(/'/g,'&#39;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function productKey(platform,sku){return String(platform||'geral')+'|'+String(sku||'');}
function rowDefaults(platform,sku){
  return ALL.find(o=>String(o.item_sku||'')===String(sku||'') && String(o.platform||'geral')===String(platform||'geral')) || {};
}
function metricLabel(field){return {cost:'Custo',tax_pct:'Imposto',fee_pct:'Tarifa',shipping_fee:'Frete'}[field]||field;}
function metricCurrent(o,field,fallback){
  if(field==='cost') return parseFloat((o.unit_cost ?? ((o.total_cost||0)/(o.quantity||1)))||0);
  if(o[field]!==null && o[field]!==undefined && o[field]!=='') return parseFloat(o[field]||0);
  return fallback ?? 0;
}
function editableMetric(o,field,type,fallback){
  const current=metricCurrent(o,field,fallback);
  if(field==='shipping_fee'){
    const platform=escAttr(o.platform||''), oid=escAttr(o.platform_order_id||o.id||'');
    const isManual=o.manual_shipping_fee!==null&&o.manual_shipping_fee!==undefined;
    const source=isManual?'manual':(o.shipping_fee_source||'auto');
    const auto=o.auto_shipping_fee!=null?` Auto: ${f(o.auto_shipping_fee)}`:'';
    // Label de source só aparece em modo debug (ou se for manual para indicar ao usuário)
    const srcLabel=window.SS_DEBUG
      ? `<small style="color:var(--txt3);font-size:8px;max-width:90px;overflow:hidden;text-overflow:ellipsis;display:inline-block;vertical-align:middle"> ${source}</small>`
      : (isManual ? `<small style="color:var(--p3);font-size:8px"> manual</small>` : '');
    return `<span class="inline-edit" style="color:var(--yellow2);font-weight:700;font-size:10px" title="Editar frete deste pedido.${auto}" onclick="event.stopPropagation();editOrderShippingCell(this,'${platform}','${oid}',${Number(current)||0})">${f(current)}${srcLabel}<i class="ti ti-pencil" style="font-size:10px;color:var(--txt3)"></i></span>`;
  }
  if(!o.item_sku) return `<span style="color:var(--txt3)">—</span>`;
  const platform=escAttr(o.platform||'geral'), sku=escAttr(o.item_sku||'');
  const shown=(field==='tax_pct'||field==='fee_pct')
    ? (o[field]===null||o[field]===undefined?`<span style="color:var(--txt3)">${f(fallback)}</span>`:pct(current))
    : f(current);
  const color=field==='cost'?'var(--orange2)':field==='tax_pct'?'var(--blue2)':field==='fee_pct'?'var(--red2)':'var(--yellow2)';
  return `<span class="inline-edit" style="color:${color};font-weight:700;font-size:10px" title="Editar ${metricLabel(field)}" onclick="event.stopPropagation();editMetricCell(this,'${platform}','${sku}','${field}','${type}',${Number(current)||0})">${shown}<i class="ti ti-pencil" style="font-size:10px;color:var(--txt3)"></i></span>`;
}
function editMetricCell(el,platform,sku,field,type,cur){
  if(field==='cost'){
    abrirHistoricoCusto(sku, platform, sku);
    return;
  }
  const id=Math.random().toString(36).slice(2,8);
  el.outerHTML=`<span class="inline-edit" onclick="event.stopPropagation()"><input class="inline-input" type="number" step="0.01" value="${cur||0}" id="m-${id}" autofocus onkeydown="if(event.key==='Enter')saveMetricCell('${platform}','${sku}','${field}','${id}');if(event.key==='Escape')loadData()"/><i class="ti ti-check save-mini" onclick="event.stopPropagation();saveMetricCell('${platform}','${sku}','${field}','${id}')"></i><i class="ti ti-x cancel-mini" onclick="event.stopPropagation();loadData()"></i></span>`;
  setTimeout(()=>{const i=document.getElementById('m-'+id);if(i){i.focus();i.select();}},20);
}
function editOrderShippingCell(el,platform,orderId,cur){
  const id=Math.random().toString(36).slice(2,8);
  el.outerHTML=`<span class="inline-edit" onclick="event.stopPropagation()"><input class="inline-input" type="number" step="0.01" value="${cur||0}" id="os-${id}" autofocus onkeydown="if(event.key==='Enter')saveOrderShippingCell('${platform}','${orderId}','${id}');if(event.key==='Escape')loadData()"/><i class="ti ti-check save-mini" onclick="event.stopPropagation();saveOrderShippingCell('${platform}','${orderId}','${id}')"></i><i class="ti ti-rotate-clockwise cancel-mini" title="Voltar para automático" onclick="event.stopPropagation();resetOrderShippingCell('${platform}','${orderId}')"></i></span>`;
  setTimeout(()=>{const i=document.getElementById('os-'+id);if(i){i.focus();i.select();}},20);
}
async function saveOrderShippingCell(platform,orderId,id){
  const val=parseFloat(document.getElementById('os-'+id)?.value||0);
  try{await api('/api/orders/'+encodeURIComponent(platform)+'/'+encodeURIComponent(orderId)+'/shipping',{method:'PUT',body:JSON.stringify({shipping_fee:val})});toast('Frete do pedido salvo!');loadData();}
  catch(e){toast('Erro: '+e.message);}
}
async function resetOrderShippingCell(platform,orderId){
  try{await api('/api/orders/'+encodeURIComponent(platform)+'/'+encodeURIComponent(orderId)+'/shipping',{method:'PUT',body:JSON.stringify({shipping_fee:null})});toast('Frete voltou para automático');loadData();}
  catch(e){toast('Erro: '+e.message);}
}
async function saveMetricCell(platform,sku,field,id){
  const val=parseFloat(document.getElementById('m-'+id)?.value||0);
  const row=rowDefaults(platform,sku);
  const body={
    platform,
    cost: metricCurrent(row,'cost',0),
    tax_pct: row.tax_pct===null||row.tax_pct===undefined?null:parseFloat(row.tax_pct||0),
    fee_pct: row.fee_pct===null||row.fee_pct===undefined?null:parseFloat(row.fee_pct||0),
    shipping_fee: row.shipping_fee===null||row.shipping_fee===undefined?null:parseFloat(row.shipping_fee||0)
  };
  if(field==='cost') body.cost=val;
  else body[field]=val;
  try{await api('/api/products/'+encodeURIComponent(sku)+'/cost',{method:'PUT',body:JSON.stringify(body)});toast(metricLabel(field)+' salvo!');loadProducts();loadData();}
  catch(e){toast('Erro: '+e.message);}
}
async function saveProductRow(platform,sku){
  const id=productKey(platform,sku).replace(/[^a-zA-Z0-9_-]/g,'_');
  const body={
    platform,
    cost:parseFloat(document.getElementById('pcost-'+id)?.value||0),
    tax_pct:document.getElementById('ptax-'+id)?.value===''?null:parseFloat(document.getElementById('ptax-'+id)?.value||0),
    fee_pct:document.getElementById('pfee-'+id)?.value===''?null:parseFloat(document.getElementById('pfee-'+id)?.value||0),
    shipping_fee:document.getElementById('pship-'+id)?.value===''?null:parseFloat(document.getElementById('pship-'+id)?.value||0)
  };
  try{await api('/api/products/'+encodeURIComponent(sku)+'/cost',{method:'PUT',body:JSON.stringify(body)});toast('SKU atualizado!');loadProducts();loadData();}
  catch(e){toast('Erro: '+e.message);}
}
const DEFAULT_PLATFORMS=['mercadolivre','magalu','shopee','geral'];
function defaultRow(data,platform){return (data||[]).find(p=>String(p.platform||'geral')===platform && String(p.sku||'').toUpperCase()==='__DEFAULT__') || {};}
function defaultPlaceholder(defaults,platform,field,suffix=''){
  const d=defaults[platform]||{};
  const v=d[field];
  if(v===null||v===undefined||v==='') return 'Auto';
  return String(parseFloat(v||0))+suffix;
}
function renderPlatformDefaults(data){
  const box=document.getElementById('platform-defaults');
  if(!box)return;
  const rows={};DEFAULT_PLATFORMS.forEach(p=>rows[p]=defaultRow(data,p));
  box.innerHTML=DEFAULT_PLATFORMS.map(platform=>{
    const d=rows[platform]||{};
    const id='def-'+platform;
    return `<div class="default-card">
      <span class="plat-chip ${platform}">${platShort(platform)}</span>
      <div><label>Imposto padrão %</label><input id="${id}-tax" type="number" step="0.01" value="${d.tax_pct===null||d.tax_pct===undefined?'':parseFloat(d.tax_pct||0)}" placeholder="Ex: 10"/></div>
      <div><label>Tarifa padrão %</label><input id="${id}-fee" type="number" step="0.01" value="${d.fee_pct===null||d.fee_pct===undefined?'':parseFloat(d.fee_pct||0)}" placeholder="Auto"/></div>
      <div><label>Frete padrão R$</label><input id="${id}-ship" type="number" step="0.01" value="${d.shipping_fee===null||d.shipping_fee===undefined?'':parseFloat(d.shipping_fee||0)}" placeholder="Auto"/></div>
      <button class="ib" title="Salvar padrão" onclick="savePlatformDefaults('${platform}')"><i class="ti ti-check"></i></button>
    </div>`;
  }).join('');
}
async function savePlatformDefaults(platform){
  const id='def-'+platform;
  const taxRaw=document.getElementById(id+'-tax')?.value;
  const feeRaw=document.getElementById(id+'-fee')?.value;
  const shipRaw=document.getElementById(id+'-ship')?.value;
  const body={
    platform,
    sku:'__DEFAULT__',
    name:'Padrão '+platLabel(platform),
    cost:0,
    tax_pct:taxRaw===''?null:parseFloat(taxRaw||0),
    fee_pct:feeRaw===''?null:parseFloat(feeRaw||0),
    shipping_fee:shipRaw===''?null:parseFloat(shipRaw||0)
  };
  try{await api('/api/products',{method:'POST',body:JSON.stringify(body)});toast('Padrão de '+platLabel(platform)+' salvo!');loadProducts();loadData();}
  catch(e){toast('Erro: '+e.message);}
}
async function loadProducts(){
  const list=document.getElementById('products-list');
  try{
    const{data}=await api('/api/products');
    renderPlatformDefaults(data);
    const defaults={};DEFAULT_PLATFORMS.forEach(p=>defaults[p]=defaultRow(data,p));
    const products=(data||[]).filter(p=>String(p.sku||'').toUpperCase()!=='__DEFAULT__');
    if(!products.length){list.innerHTML='<div class="empty"><i class="ti ti-package-off"></i><p>Nenhum SKU cadastrado</p></div>';return;}
    list.innerHTML=products.map(p=>{
      const platform=p.platform||'geral';
      const id=productKey(platform,p.sku).replace(/[^a-zA-Z0-9_-]/g,'_');
      return `<div class="cost-card">
        <span class="plat-chip ${platform}">${platShort(platform)}</span>
        <div class="cost-field"><label>SKU</label><div><div class="cost-sku" title="${escAttr(p.sku)}">${p.sku}</div><div class="cost-name" title="${escAttr(p.name)}">${p.name||'Sem nome'}</div></div></div>
        <div class="cost-field"><label>Custo unit.</label><input id="pcost-${id}" type="number" step="0.01" value="${parseFloat(p.cost||0)}"/></div>
        <div class="cost-field"><label>Imposto %</label><input id="ptax-${id}" type="number" step="0.01" value="${p.tax_pct===null||p.tax_pct===undefined?'':parseFloat(p.tax_pct||0)}" placeholder="Padrão ${defaultPlaceholder(defaults,platform,'tax_pct','%')}"/></div>
        <div class="cost-field"><label>Tarifa %</label><input id="pfee-${id}" type="number" step="0.01" value="${p.fee_pct===null||p.fee_pct===undefined?'':parseFloat(p.fee_pct||0)}" placeholder="${platform==='mercadolivre'?'Auto ML':('Padrão '+defaultPlaceholder(defaults,platform,'fee_pct','%'))}"/></div>
        <div class="cost-field"><label>Frete R$</label><input id="pship-${id}" type="number" step="0.01" value="${p.shipping_fee===null||p.shipping_fee===undefined?'':parseFloat(p.shipping_fee||0)}" placeholder="${platform==='mercadolivre'?'Auto ML':('Padrão '+defaultPlaceholder(defaults,platform,'shipping_fee'))}"/></div>
        <button class="ib" title="Salvar alterações" onclick="saveProductRow('${escAttr(platform)}','${escAttr(p.sku)}')"><i class="ti ti-check"></i></button>
        <button class="ib danger" title="Apagar SKU" onclick="deleteProductRow(${Number(p.id)||0},'${escAttr(p.sku)}','${escAttr(platform)}')"><i class="ti ti-trash"></i></button>
      </div>`;
    }).join('');
  }catch(e){list.innerHTML='<div class="empty"><p>'+e.message+'</p></div>';}
}

async function deleteProductRow(id,sku,platform){
  if(!id)return toast('ID do SKU não encontrado');
  const ok=confirm(`Apagar o SKU ${sku} de ${platLabel(platform)}?`);
  if(!ok)return;
  try{
    await api('/api/products/'+encodeURIComponent(id),{method:'DELETE'});
    toast('SKU apagado!');
    loadProducts();
    loadData();
  }catch(e){toast('Erro: '+e.message);}
}
async function deleteAllProducts(){
  const ok=confirm('Apagar TODOS os custos, impostos, tarifas, fretes e SKUs salvos?');
  if(!ok)return;
  try{
    await api('/api/products',{method:'DELETE'});
    toast('Tudo apagado!');
    loadProducts();
    loadData();
  }catch(e){toast('Erro: '+e.message);}
}
async function resetProductValues(){
  const ok=confirm('Zerar custos/impostos/tarifas/fretes, mas manter os SKUs cadastrados?');
  if(!ok)return;
  try{
    await api('/api/products/reset-values',{method:'POST'});
    toast('Valores zerados!');
    loadProducts();
    loadData();
  }catch(e){toast('Erro: '+e.message);}
}

async function addProduct(){
  const platform=document.getElementById('new-platform').value;
  const sku=document.getElementById('new-sku').value.trim();
  const name=document.getElementById('new-name').value.trim();
  const cost=parseFloat(document.getElementById('new-cost').value)||0;
  if(!sku||!name)return toast('Preencha SKU e nome');
  try{
    await api('/api/products',{method:'POST',body:JSON.stringify({platform,sku,name,cost,tax_pct:null,fee_pct:null,shipping_fee:null})});
    document.getElementById('new-sku').value='';document.getElementById('new-name').value='';document.getElementById('new-cost').value='';
    toast('SKU salvo! O imposto vem do padrão da plataforma.');loadProducts();loadData();
  }
  catch(e){toast('Erro: '+e.message);}
}
function editCostPr(platform,sku,name,cur,taxCur,feeCur,shipCur){
  openMo('mo-cst');
  setTimeout(()=>{
    const id=productKey(platform,sku).replace(/[^a-zA-Z0-9_-]/g,'_');
    const el=document.getElementById('pcost-'+id);
    if(el){el.focus();el.select();}
  },150);
}



// ══════════════════════════════════════════════════════════════
// FULL ENVIOS — ML Fulfillment
// ══════════════════════════════════════════════════════════════
function ssOpenFullEnvios(){
  openMo('mo-full-envios');
  ssLoadFullEnvios(false);
  // ESC fecha o modal
  const onKey=e=>{if(e.key==='Escape'){closeMo('mo-full-envios');document.removeEventListener('keydown',onKey);}};
  document.addEventListener('keydown',onKey);
}

async function ssLoadFullEnvios(force){
  const body=document.getElementById('full-envios-body');
  if(!body)return;
  body.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px;gap:14px;color:var(--txt3)">
    <div class="spin" style="width:32px;height:32px;border-width:3px"></div>
    <div style="font-size:12px">Consultando armazéns do Mercado Livre…</div>
    <div style="font-size:10px;opacity:.6">Isso pode levar alguns segundos</div>
  </div>`;
  try{
    const res=await api(`/api/fulfillment/stock${force?'?force=1':''}`);
    if(!res.success||!res.data){body.innerHTML=`<div class="empty"><i class="ti ti-package-off"></i><p>Erro ao carregar dados de fulfillment</p></div>`;return;}
    ssRenderFullEnvios(res.data,body);
  }catch(e){
    body.innerHTML=`<div class="empty"><i class="ti ti-wifi-off"></i><p>${e.message||'Erro ao conectar'}</p></div>`;
  }
}

function ssRenderFullEnvios(data,body){
  const R=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const accs=data.accounts||[];
  const month=data.month||{};

  let html=``;

  // Filtra contas sem nenhum produto no Full
  const accsComFull=accs.filter(acc=>!acc.error&&(acc.items||[]).length>0);
  const accsSemFull=accs.filter(acc=>!acc.error&&(acc.items||[]).length===0);

  if(!accs.length){
    html+=`<div class="empty"><i class="ti ti-package-off"></i><p>Nenhuma conta ML conectada</p></div>`;
    body.innerHTML=html; return;
  }
  if(!accsComFull.length){
    html+=`<div class="empty"><i class="ti ti-package-off"></i><p>Nenhuma conta tem produtos no Mercado Livre Full</p></div>`;
    body.innerHTML=html; return;
  }

  // Mostra aviso discreto sobre contas sem Full
  if(accsSemFull.length){
    html+=`<div style="padding:8px 14px;background:rgba(148,163,184,.06);border:1px solid var(--border);border-radius:10px;font-size:10px;color:var(--txt3)">
      <i class="ti ti-info-circle" style="margin-right:5px"></i>
      Conta${accsSemFull.length>1?'s':''} sem produtos no Full: ${accsSemFull.map(a=>a.shop_name).join(', ')}
    </div>`;
  }

  accsComFull.forEach(acc=>{
    if(acc.error){
      html+=`<div style="background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.2);border-radius:14px;padding:14px 16px;color:var(--red2);font-size:12px"><strong>${acc.shop_name}</strong>: ${acc.error}</div>`;
      return;
    }

    const items=acc.items||[];
    const ops=acc.operations||[];
    const totalAvail   = items.reduce((s,it)=>s+(it.stock?.available||0),0);
    const totalProc    = items.reduce((s,it)=>s+(it.stock?.processing||0),0);
    const totalDamaged = items.reduce((s,it)=>s+(it.stock?.damaged||0),0);
    const totalLost    = items.reduce((s,it)=>s+(it.stock?.lost||0),0);
    const totalItens   = items.length;
    const lowStock     = items.filter(it=>(it.stock?.available||0)<5);
    const rd=_shopRatings[acc.account_id]||{};

    // Ops por tipo
    const opMap={};
    ops.forEach(op=>{const t=(op.type||op.operation_type||'outros').toLowerCase();opMap[t]=(opMap[t]||0)+1;});
    const OP_LABEL={'inbound':'Entrada no armazém','outbound':'Saída (venda/devolução)','adjustment':'Ajuste de estoque','removal':'Retirada'};
    const OP_CLR={'inbound':'var(--green2)','outbound':'var(--blue2)','adjustment':'var(--orange2)','removal':'var(--red2)'};

    html+=`
    <div style="background:var(--bg3);border:1px solid var(--border2);border-radius:18px;overflow:hidden">
      <!-- Header conta -->
      <div style="background:linear-gradient(135deg,rgba(255,214,0,.07),rgba(109,40,217,.07));padding:14px 18px;border-bottom:1px solid var(--border2);display:flex;align-items:center;gap:12px">
        <div style="width:42px;height:42px;border-radius:12px;background:rgba(255,214,0,.10);border:1px solid rgba(255,214,0,.2);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#ffd600">${(acc.shop_name||'ML')[0].toUpperCase()}</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700;color:var(--txt)">${acc.shop_name||'Conta ML'}</div>
          <div style="font-size:10px;color:var(--txt3);margin-top:2px">Seller ID: ${acc.seller_id||'—'} · ${totalItens} produto${totalItens!==1?'s':''} no Full</div>
        </div>
        ${rd.level?`<div style="text-align:center;padding:8px 14px;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.18);border-radius:12px">
          <div style="display:flex;gap:3px;justify-content:center;margin-bottom:4px">${[1,2,3,4,5].map(i=>`<span style="width:12px;height:7px;border-radius:2px;background:${i<=rd.level?['#f23b26','#f57b00','#f5c518','#9ed40a','#39b54a'][i-1]:'rgba(255,255,255,.10)'}"></span>`).join('')}</div>
          ${rd.extra?.positive_pct!=null?`<div style="font-size:12px;font-weight:800;color:#4ade80">${rd.extra.positive_pct}% positivo</div>`:''}
          ${rd.extra?.power_seller?`<div style="font-size:9px;font-weight:700;color:#fbbf24;margin-top:2px;text-transform:capitalize">${rd.extra.power_seller}</div>`:''}
        </div>`:''}
      </div>

      <!-- KPIs estoque -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--border)">
        ${[
          {label:'Disponível',sub:'pronto para venda',val:totalAvail,clr:'var(--green2)',bg:'rgba(16,185,129,.06)'},
          {label:'Em processo',sub:'recebimento/reserva',val:totalProc,clr:'var(--blue2)',bg:'rgba(56,189,248,.05)'},
          {label:'Avariado',sub:'danificado no armazém',val:totalDamaged,clr:'var(--orange2)',bg:'rgba(251,146,60,.05)'},
          {label:'Extraviado',sub:'perdido pelo ML',val:totalLost,clr:'var(--red2)',bg:'rgba(248,113,113,.05)'},
        ].map((k,i)=>`<div style="padding:14px 12px;text-align:center;background:${k.bg};${i<3?'border-right:1px solid var(--border)':''}">
          <div style="font-size:26px;font-weight:900;color:${k.clr};line-height:1">${k.val}</div>
          <div style="font-size:10px;color:var(--txt2);margin-top:3px;font-weight:700">${k.label}</div>
          <div style="font-size:9px;color:var(--txt3);margin-top:1px">${k.sub}</div>
        </div>`).join('')}
      </div>

      <!-- Alerta estoque baixo -->
      ${lowStock.length?`<div style="margin:12px 16px 0;padding:9px 14px;background:rgba(251,146,60,.08);border:1px solid rgba(251,146,60,.22);border-radius:10px;display:flex;gap:10px;align-items:flex-start">
        <i class="ti ti-alert-triangle" style="color:var(--orange2);font-size:13px;margin-top:1px;flex-shrink:0"></i>
        <div style="font-size:10px;color:var(--txt2);line-height:1.5"><strong style="color:var(--orange2)">${lowStock.length} produto${lowStock.length!==1?'s com':' com'} estoque baixo</strong> (menos de 5 un): ${lowStock.map(it=>`<strong>${it.title?.slice(0,30)||it.id}</strong> (${it.stock?.available||0} un)`).join(', ')}</div>
      </div>`:''}

      <!-- Tabela de produtos -->
      ${items.length?`<div style="padding:14px 16px;border-bottom:1px solid var(--border)">
        <div style="font-size:11px;font-weight:700;color:var(--txt2);margin-bottom:10px;display:flex;align-items:center;gap:6px">
          <i class="ti ti-box" style="font-size:13px;color:var(--blue2)"></i> Estoque por produto
          <span style="margin-left:auto;font-size:9px;color:var(--txt3)">${totalAvail+totalProc} un no armazém</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;max-height:280px;overflow-y:auto;padding-right:4px">
          ${items.map(it=>{
            const avail=it.stock?.available||0;
            const proc=it.stock?.processing||0;
            const dmg=it.stock?.damaged||0;
            const lost=it.stock?.lost||0;
            const total=avail+proc+dmg+lost||1;
            const pctAvail=Math.round(avail/total*100);
            const barClr=avail<=0?'var(--red2)':avail<5?'var(--orange2)':'var(--green2)';
            return`<div style="display:grid;grid-template-columns:36px 1fr 52px 52px 46px 46px;gap:8px;align-items:center;background:var(--bg4);border-radius:10px;padding:8px 10px;border:1px solid var(--border)">
              <div style="width:34px;height:34px;border-radius:8px;overflow:hidden;background:var(--bg3);border:1px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:14px">
                ${it.thumbnail?`<img src="${it.thumbnail}" style="width:100%;height:100%;object-fit:cover" onerror="this.outerHTML='📦'">`:'📦'}
              </div>
              <div style="min-width:0">
                <div style="font-size:10px;font-weight:600;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px">${it.title||it.id}</div>
                <div style="height:5px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden;display:flex;gap:1px">
                  <div style="width:${pctAvail}%;background:${barClr};border-radius:3px;transition:width .4s"></div>
                </div>
              </div>
              <div style="text-align:center">
                <div style="font-size:15px;font-weight:900;color:${barClr};line-height:1">${avail}</div>
                <div style="font-size:8px;color:var(--txt3);margin-top:2px">Disp.</div>
              </div>
              <div style="text-align:center">
                <div style="font-size:13px;font-weight:700;color:var(--blue2);line-height:1">${proc}</div>
                <div style="font-size:8px;color:var(--txt3);margin-top:2px">Processo</div>
              </div>
              <div style="text-align:center">
                <div style="font-size:12px;font-weight:700;color:${dmg>0?'var(--orange2)':'var(--txt3)'};line-height:1">${dmg}</div>
                <div style="font-size:8px;color:var(--txt3);margin-top:2px">Avaria</div>
              </div>
              <div style="text-align:center">
                <div style="font-size:12px;font-weight:700;color:${lost>0?'var(--red2)':'var(--txt3)'};line-height:1">${lost}</div>
                <div style="font-size:8px;color:var(--txt3);margin-top:2px">Extrav.</div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`:`<div style="padding:20px;text-align:center;color:var(--txt3);font-size:11px"><i class="ti ti-package-off" style="font-size:20px;display:block;margin-bottom:6px"></i>Nenhum produto Full encontrado — verifique se você tem itens cadastrados no Mercado Livre Full</div>`}

      <!-- Operações recentes -->
      <div style="padding:14px 16px">
        <div style="font-size:11px;font-weight:700;color:var(--txt2);margin-bottom:8px;display:flex;align-items:center;gap:6px">
          <i class="ti ti-history" style="font-size:13px;color:var(--p3)"></i> Movimentações (mês atual)
          ${ops.length?`<div style="margin-left:auto;display:flex;gap:5px;flex-wrap:wrap">
            ${Object.entries(opMap).map(([t,n])=>`<span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:999px;background:rgba(148,163,184,.08);border:1px solid var(--border2);color:${OP_CLR[t]||'var(--txt3)'}">${OP_LABEL[t]||t}: ${n}</span>`).join('')}
          </div>`:''}
        </div>
        ${ops.length?`<div style="display:flex;flex-direction:column;gap:3px;max-height:200px;overflow-y:auto;padding-right:4px">
          ${ops.slice(0,40).map(op=>{
            const dt=op.date||op.created_at||op.operation_date||'';
            const dtBR=dt?new Date(dt).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})+' '+new Date(dt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'—';
            const tipo=(op.type||op.operation_type||'outros').toLowerCase();
            const qty=op.quantity??op.qty??'';
            const clr=OP_CLR[tipo]||'var(--txt3)';
            return`<div style="display:flex;align-items:center;gap:8px;padding:5px 9px;border-radius:8px;background:var(--bg4);border:1px solid var(--border)">
              <span style="font-size:9px;font-weight:800;color:${clr};min-width:70px;white-space:nowrap">${OP_LABEL[tipo]||tipo}</span>
              <span style="font-size:10px;color:var(--txt2);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${op.item_id||op.sku||op.inventory_id||'—'}</span>
              ${qty!==''?`<span style="font-size:10px;font-weight:800;color:${clr}">${qty>0?'+':''}${qty} un</span>`:''}
              <span style="font-size:9px;color:var(--txt3);flex-shrink:0">${dtBR}</span>
            </div>`;
          }).join('')}
        </div>`:`<div style="padding:10px 0;text-align:center;color:var(--txt3);font-size:10px">Nenhuma movimentação encontrada nos últimos 30 dias</div>`}
      </div>
    </div>`;
  });

  // Alerta de avaria/extravio
  const totalDmg=accs.reduce((s,a)=>s+(a.items||[]).reduce((ss,it)=>ss+(it.stock?.damaged||0)+(it.stock?.lost||0),0),0);
  if(totalDmg>0){
    html+=`<div style="background:linear-gradient(135deg,rgba(248,113,113,.07),rgba(251,146,60,.05));border:1px solid rgba(248,113,113,.2);border-radius:14px;padding:14px 16px;display:flex;gap:12px;align-items:flex-start">
      <i class="ti ti-alert-circle" style="font-size:18px;color:var(--red2);flex-shrink:0;margin-top:1px"></i>
      <div>
        <div style="font-size:12px;font-weight:700;color:var(--red2);margin-bottom:4px">Ação recomendada: ${totalDmg} unidade${totalDmg!==1?'s':''} avariada${totalDmg!==1?'s':''}/extraviada${totalDmg!==1?'s':''}</div>
        <div style="font-size:11px;color:var(--txt2);line-height:1.5">Você tem direito a ressarcimento pelo ML. Acesse: <strong>ML → Minha conta → Armazém → Reclamações → Avaria ou Extravio</strong> e abra um chamado para cada produto afetado.</div>
      </div>
    </div>`;
  }

  body.innerHTML=html;
}

let _shopRatings={}; // { accId: {rating, level, extra} }
async function ssLoadRatings(){
  try{
    const r=await api('/api/accounts/ratings');
    if(r?.data){
      r.data.forEach(x=>{ _shopRatings[x.id]={rating:x.rating,level:x.level??null,extra:x.extra??{}}; });
      buildPlatBar();
    }
  }catch(_){}
}

// Mini termômetro ML (5 segmentos, igual ao ML)
function mlThermoHtml(level){
  if(!level||level<1||level>5) return '';
  const segs=[
    {clr:'#f23b26'},{clr:'#f57b00'},{clr:'#f5c518'},{clr:'#9ed40a'},{clr:'#39b54a'}
  ];
  const bars=segs.map((s,i)=>{
    const lit=i<level;
    return `<span style="display:inline-block;width:7px;height:5px;border-radius:1px;background:${lit?s.clr:'rgba(255,255,255,.12)'};margin-right:1px;transition:background .3s"></span>`;
  }).join('');
  return `<span style="display:inline-flex;align-items:center;gap:0;vertical-align:middle;margin-left:3px">${bars}</span>`;
}

async function loadAccounts(){
  try{
    const{data}=await api('/api/accounts');
    ACCOUNTS=data;
    buildPlatBar();
    // Busca ratings em background (não bloqueia carregamento)
    setTimeout(ssLoadRatings, 1500);
    // Detecta contas Shopee que precisam reconectar (token nulo = invalidado)
    const needReconnect = data.filter(a => a.platform === 'shopee' && !a.is_connected && a.shop_name);
    if(needReconnect.length){
      const existing = document.getElementById('shopee-reconnect-alert');
      if(!existing){
        const bar = document.createElement('div');
        bar.id = 'shopee-reconnect-alert';
        bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99998;background:rgba(238,77,45,.18);border-bottom:2px solid #ee4d2d;padding:8px 16px;display:flex;align-items:center;gap:10px;font-size:12px;font-weight:700;color:#f1f5f9;backdrop-filter:blur(8px);';
        bar.innerHTML = `<span>🔴</span><span><strong>Shopee desconectada:</strong> Suas credenciais mudaram (sandbox → produção). Reconecte sua loja para continuar sincronizando.</span><button onclick="openMo('mo-mp')" style="margin-left:auto;background:#ee4d2d;color:#fff;border:none;border-radius:8px;padding:5px 14px;font-size:11px;font-weight:800;cursor:pointer;">Reconectar agora</button><span onclick="document.getElementById('shopee-reconnect-alert').remove()" style="cursor:pointer;font-size:16px;margin-left:8px;opacity:.6">✕</span>`;
        document.body.prepend(bar);
      }
    }
  }catch{}
}
// v5.15 — Plataforma: badge colorido com abreviação em vez de bolinha
const KARAKA_K_SVG=`<svg width="14" height="14" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" rx="6" fill="#C8960C"/><text x="16" y="23" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="22" font-weight="900" fill="#fff">K</text></svg>`;
const PLAT_BADGE={
  mercadolivre:{abbr:'ML',     color:'#ffd600',bg:'rgba(255,214,0,.15)',   cls:'ml'},
  shopee:       {abbr:'SHOPEE',color:'#ee4d2d',bg:'rgba(238,77,45,.15)',   cls:'sp'},
  magalu:       {abbr:'MAGALU',color:'#0078ff',bg:'rgba(0,120,255,.15)',   cls:'mg'},
  tiktok:       {abbr:'TIKTOK',color:'#ff0050',bg:'rgba(255,0,80,.15)',    cls:'tk'},
  codesoftware: {abbr:'CODE SW',color:'#C8960C',bg:'rgba(200,150,12,.15)',cls:'cs'},
};
function platBadgeHtml(platform){
  const b=PLAT_BADGE[platform]||{abbr:(platform||'?').toUpperCase().slice(0,6),color:'var(--p2)',bg:'rgba(109,40,217,.12)'};
  return`<span style="font-size:9px;font-weight:800;padding:1px 5px;border-radius:4px;color:${b.color};background:${b.bg};border:1px solid ${b.color}44;letter-spacing:.5px">${b.abbr}</span>`;
}
function buildPlatBar(){
  const bar=document.getElementById('platbar');
  bar.innerHTML='<div class="pfil on" onclick="setPlatFilter(\'\',this)">🌐 Todos</div>';

  // Agrupa contas conectadas por plataforma
  const connected=ACCOUNTS.filter(a=>a.is_connected);
  const byPlat={};
  connected.forEach(acc=>{
    if(!byPlat[acc.platform]) byPlat[acc.platform]=['mercadolivre','shopee','magalu','tiktok'].includes(acc.platform)?[]:null;
    if(Array.isArray(byPlat[acc.platform])) byPlat[acc.platform].push(acc);
  });

  Object.entries(byPlat).forEach(([plat,accs])=>{
    if(!accs||!accs.length) return;
    const b=PLAT_BADGE[plat]||{abbr:plat,color:'var(--p2)',bg:'rgba(109,40,217,.12)',cls:''};

    if(accs.length===1){
      // ── Conta única: pill simples ──
      const acc=accs[0];
      const d=document.createElement('div');
      d.className='pfil '+(b.cls||'');
      d.onclick=function(){setPlatFilter(plat,this,acc.shop_name||'');};
      const rd=_shopRatings[acc.id]||{};
      const thermo=plat==='mercadolivre'&&rd.level?mlThermoHtml(rd.level):'';
      const ratingTxt=rd.rating!=null
        ? plat==='mercadolivre'&&rd.extra?.positive_pct!=null
          ? `<span style="font-size:9px;font-weight:700;color:#4ade80;margin-left:2px">${rd.extra.positive_pct}%</span>`
          : `<span style="font-size:9px;font-weight:700;color:#fbbf24;margin-left:2px">${Number(rd.rating).toFixed(1)}⭐</span>`
        : '';
      d.innerHTML=`${platBadgeHtml(plat)} ${acc.shop_name||plat}${thermo}${ratingTxt}`;
      bar.appendChild(d);
    } else {
      // ── Múltiplas contas: pill com dropdown ──
      const wrap=document.createElement('div');
      wrap.style.cssText='position:relative;display:inline-flex';

      const pill=document.createElement('div');
      pill.className='pfil '+(b.cls||'');
      pill.style.gap='5px';
      pill.innerHTML=`${platBadgeHtml(plat)} ${accs.length} lojas <i class="ti ti-chevron-down" style="font-size:9px;opacity:.6"></i>`;

      const drop=document.createElement('div');
      drop.style.cssText=`display:none;position:absolute;top:calc(100% + 4px);left:0;z-index:9999;
        background:var(--bg2);border:1px solid var(--border2);border-radius:12px;
        padding:6px;min-width:200px;box-shadow:0 8px 24px rgba(0,0,0,.35);
        display:none;flex-direction:column;gap:4px`;

      accs.forEach(acc=>{
        const rd=_shopRatings[acc.id]||{};
        const thermo=plat==='mercadolivre'&&rd.level?mlThermoHtml(rd.level):'';
        const ratingTxt=rd.rating!=null
          ? plat==='mercadolivre'&&rd.extra?.positive_pct!=null
            ? `<span style="font-size:9px;font-weight:700;color:#4ade80">${rd.extra.positive_pct}% positivo</span>`
            : `<span style="font-size:9px;font-weight:700;color:#fbbf24">${Number(rd.rating).toFixed(1)}⭐</span>`
          : '';
        const item=document.createElement('div');
        item.style.cssText='display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;cursor:pointer;transition:background .15s';
        item.innerHTML=`<div style="width:28px;height:28px;border-radius:8px;background:${b.bg};border:1px solid ${b.color}33;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:${b.color}">${(acc.shop_name||plat)[0].toUpperCase()}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;font-weight:600;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${acc.shop_name||'—'}</div>
            <div style="display:flex;align-items:center;gap:4px;margin-top:2px">${thermo}${ratingTxt}</div>
          </div>`;
        item.onmouseenter=()=>item.style.background='rgba(255,255,255,.04)';
        item.onmouseleave=()=>item.style.background='';
        item.onclick=(e)=>{
          e.stopPropagation();
          drop.style.display='none';
          pill.classList.add('on');
          // Atualiza label do pill com a conta selecionada
          const rd2=_shopRatings[acc.id]||{};
          const th2=plat==='mercadolivre'&&rd2.level?mlThermoHtml(rd2.level):'';
          const rt2=rd2.rating!=null?`<span style="font-size:9px;font-weight:700;color:#fbbf24;margin-left:2px">${Number(rd2.rating).toFixed(1)}</span>`:'';
          pill.innerHTML=`${platBadgeHtml(plat)} ${acc.shop_name||plat}${th2}${rt2} <i class="ti ti-chevron-down" style="font-size:9px;opacity:.6"></i>`;
          setPlatFilter(plat,pill,acc.shop_name||'');
        };
        drop.appendChild(item);
      });

      // Opção "Todas as lojas desta plataforma"
      const allOpt=document.createElement('div');
      allOpt.style.cssText='display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;cursor:pointer;border-top:1px solid var(--border);margin-top:2px;padding-top:9px;transition:background .15s';
      allOpt.innerHTML=`<div style="font-size:10px;color:var(--txt3);font-weight:600">🌐 Todas as ${accs.length} lojas ${b.abbr}</div>`;
      allOpt.onmouseenter=()=>allOpt.style.background='rgba(255,255,255,.04)';
      allOpt.onmouseleave=()=>allOpt.style.background='';
      allOpt.onclick=(e)=>{
        e.stopPropagation();
        drop.style.display='none';
        pill.innerHTML=`${platBadgeHtml(plat)} ${accs.length} lojas <i class="ti ti-chevron-down" style="font-size:9px;opacity:.6"></i>`;
        setPlatFilter(plat,pill,'');
      };
      drop.appendChild(allOpt);

      // Dropdown vai pro body para escapar do overflow:hidden do platbar
      drop.className='pfil-drop';
      drop.style.position='fixed'; // fixed para sair do stacking context
      document.body.appendChild(drop);

      pill.onclick=(e)=>{
        e.stopPropagation();
        const isOpen=drop.style.display==='flex';
        document.querySelectorAll('.pfil-drop').forEach(x=>x.style.display='none');
        if(!isOpen){
          const rect=pill.getBoundingClientRect();
          drop.style.top=(rect.bottom+4)+'px';
          drop.style.left=rect.left+'px';
          drop.style.display='flex';
        }
      };

      wrap.appendChild(pill);
      bar.appendChild(wrap);
    }
  });

  // v5.14 — Code Software sempre visível para conta interna
  if(USER&&USER.email==='holdinglevelup@gmail.com'){
    const d=document.createElement('div');d.className='pfil';
    d.onclick=function(){setPlatFilter('codesoftware',this,'CODE SOFTWARE');};
    d.innerHTML=`${platBadgeHtml('codesoftware')} Code Software`;
    d.style.borderColor='#C8960C44';
    bar.appendChild(d);
  }

  // Fecha dropdowns ao clicar fora
  document.onclick=()=>document.querySelectorAll('.pfil-drop').forEach(x=>x.style.display='none');
}
async function loadAccountsMo(){
  const body=document.getElementById('mp-body');await loadAccounts();
  const pm={mercadolivre:{label:'Mercado Livre',cls:'ml',desc:'Vendas normais · Full'},shopee:{label:'Shopee',cls:'sp',desc:'Vendas normais'},magalu:{label:'Magalu',cls:'mg',desc:'Fulfillment · Normal'},tiktok:{label:'TikTok Shop',cls:'tk',desc:'Vendas TikTok Shop'}};
  const cfg=planCfg();
  const planBadge=`<span style="background:rgba(109,40,217,.15);color:${cfg.color};font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;border:1px solid currentColor;opacity:.8">Plano ${cfg.label}</span>`;

  body.innerHTML=`
    <div style="background:var(--bg3);border:1px solid var(--border2);border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:10px;">
      <div style="width:8px;height:8px;border-radius:50%;background:var(--green2);box-shadow:0 0 8px var(--green2);"></div>
      <span style="font-size:11px;color:var(--txt2)">API online</span>
      <div style="margin-left:auto;display:flex;align-items:center;gap:8px">${planBadge}<div class="ib" onclick="doSync()"><i class="ti ti-refresh"></i></div></div>
    </div>
    ${['mercadolivre','shopee','magalu','tiktok'].map(plat=>{
      const accs=ACCOUNTS.filter(a=>a.platform===plat),p=pm[plat];
      const connected=accs.filter(a=>a.is_connected);
      const maxAcc=planMaxAccounts();
      const canAdd=connected.length<maxAcc;
      const needsUpgrade=!canAdd&&connected.length>0;

      return`<div class="mpc">
        <div class="mpch" onclick="toggleMp('${plat}')">
          <div class="mp-ico ${p.cls}">${p.cls.toUpperCase()}</div>
          <div class="mp-info"><h3>${p.label}</h3><p>${p.desc}</p></div>
          <div class="mp-status">
            ${connected.length>0?`<span class="conn-badge">${connected.length>1?connected.length+'x ':''} Conectado</span>`:'<span class="disc-badge">Não conectado</span>'}
            <i class="ti ti-chevron-down chev" id="cv-${plat}"></i>
          </div>
        </div>
        <div class="mp-body" id="mp-${plat}">
          ${connected.map(acc=>`
          <div class="mp-acc">
            <div class="mp-ava">${(acc.shop_name||plat)[0].toUpperCase()}</div>
            <div class="mp-acc-info">
              <div class="mp-acc-name">${acc.shop_name||'—'}${_shopRatings[acc.id]!=null?` <span style="font-size:10px;color:#fbbf24;font-weight:700">${Number(_shopRatings[acc.id]).toFixed(1)} ⭐</span>`:''}</div>
              <div class="mp-acc-sub">${acc.mode==='full'||acc.mode==='both'?'<span class="type-full">📦 Full</span>':''}<span class="type-normal">🏪 Normal</span></div>
            </div>
            <div style="display:flex;gap:4px">
              <div class="ib" onclick="doSync()"><i class="ti ti-refresh"></i></div>
              <div class="ib danger" onclick="disconnPlat('${plat}',${acc.id})"><i class="ti ti-unlink"></i></div>
            </div>
          </div>
          <div class="mp-stats">
            <div class="mp-stat"><span>Última sinc.</span><strong>${acc.last_sync_at?new Date(acc.last_sync_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'—'}</strong></div>
            <div class="mp-stat"><span>Token</span><strong style="color:var(--green2)">✓ OK</strong></div>
            <div class="mp-stat"><span>Modo</span><strong>${acc.mode||'—'}</strong></div>
          </div>`).join('<hr style="border-color:var(--border);margin:6px 0">')}

          ${connected.length===0?`
          <div class="note"><i class="ti ti-shield-check"></i>Redirecionado para o site oficial. Sua senha nunca é armazenada.</div>
          <button class="btn primary" onclick="connectPlat('${plat}')"><i class="ti ti-external-link"></i> Conectar com ${p.label}</button>`:''}

          ${canAdd&&connected.length>0?`
          <button class="btn ghost" style="margin-top:6px" onclick="connectPlat('${plat}')">
            <i class="ti ti-plus"></i> Adicionar outra conta ${p.label} (${connected.length}/${maxAcc})
          </button>`:''}

          ${needsUpgrade?`
          <div onclick="planOpenUpgrade()" style="cursor:pointer;margin-top:8px;background:rgba(109,40,217,.08);border:1px solid rgba(109,40,217,.2);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px;">
            <i class="ti ti-lock" style="color:var(--p3);font-size:16px;flex-shrink:0"></i>
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--p3)">Limite de contas atingido</div>
              <div style="font-size:10px;color:var(--txt3);margin-top:2px">Plano ${cfg.label}: máx. ${maxAcc} conta(s) por plataforma. Faça upgrade para adicionar mais.</div>
            </div>
            <span style="margin-left:auto;font-size:10px;font-weight:700;color:var(--p3);white-space:nowrap">Ver planos →</span>
          </div>`:''}

          ${connected.length>0?`
          <a class="btn ghost" href="${API}/debug/${plat}?token=${TOKEN}&days=30" target="_blank" style="text-decoration:none;font-size:11px;padding:8px;margin-top:4px">
            <i class="ti ti-bug"></i> Debug ${p.label}
          </a>`:''}
        </div>
      </div>`;
    }).join('')}
    ${(USER&&USER.email==='holdinglevelup@gmail.com')?`
    <!-- v5.14 | Code Software / Karaka API -->
    <div class="mpc" id="mpc-codesoftware">
      <div class="mpch" onclick="toggleMp('codesoftware')">
        <div class="mp-ico" style="background:linear-gradient(135deg,#C8960C,#a87700);font-size:17px;font-weight:900;color:#fff">K</div>
        <div class="mp-info"><h3>Code Software</h3><p>ERP Karaka · API Interna</p></div>
        <div class="mp-status">
          <span id="cs-badge" class="disc-badge">Verificando...</span>
          <i class="ti ti-chevron-down chev" id="cv-codesoftware"></i>
        </div>
      </div>
      <div class="mp-body" id="mp-codesoftware">
        <div id="cs-status-row" style="display:flex;align-items:center;gap:10px;background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:10px 14px;margin-bottom:10px">
          <div id="cs-dot" style="width:8px;height:8px;border-radius:50%;background:#666;flex-shrink:0"></div>
          <span id="cs-status-txt" style="font-size:11px;color:var(--txt2)">Verificando API...</span>
          <button class="btn ghost" style="margin-left:auto;padding:5px 10px;font-size:11px" onclick="csCheckStatus()"><i class="ti ti-refresh"></i> Verificar</button>
        </div>
        <button class="btn primary" onclick="csSync(30)" style="width:100%"><i class="ti ti-refresh"></i> Sincronizar últimos 30 dias</button>
        <button class="btn ghost" onclick="csSync(7)" style="width:100%;margin-top:6px;font-size:11px"><i class="ti ti-calendar"></i> Sincronizar 7 dias</button>
        <div id="cs-sync-result" style="margin-top:8px;font-size:11px;color:var(--txt3)"></div>
      </div>
    </div>`:''}
    <div class="note"><i class="ti ti-lock"></i>OAuth 2.0 oficial — apenas o token é armazenado. Pedidos em tempo real.</div>`;
  // Verifica status do Code Software automaticamente para o user interno
  if(USER&&USER.email==='holdinglevelup@gmail.com') csCheckStatus();
}
// ═══════════════════════════════════════════════════════
// v2.1 | 2026-06-17 | Perguntas & Respostas — Mercado Livre
// ═══════════════════════════════════════════════════════
let QA_DATA=[], QA_POLL=null;

function qaOpenPanel(){
  document.getElementById('qa-panel').style.display='flex';
  document.getElementById('qa-overlay').style.display='block';
  qaLoad();
  // Polling a cada 2 minutos enquanto painel aberto
  if(QA_POLL)clearInterval(QA_POLL);
  QA_POLL=setInterval(qaLoad,120000);
}
function qaClosePanel(){
  document.getElementById('qa-panel').style.display='none';
  document.getElementById('qa-overlay').style.display='none';
  if(QA_POLL){clearInterval(QA_POLL);QA_POLL=null;}
}
async function qaLoad(){
  const ico=document.getElementById('qa-refresh-ico');
  const list=document.getElementById('qa-list');
  if(ico)ico.style.animation='spin .6s linear infinite';
  try{
    const r=await api('/api/questions');
    QA_DATA=r.questions||[];
    qaRender();
    qaUpdateBadge();
  }catch(e){
    list.innerHTML=`<div class="empty"><i class="ti ti-wifi-off"></i><p>${e.message}</p></div>`;
  }finally{
    if(ico)ico.style.animation='';
  }
}
function qaRender(){
  const list=document.getElementById('qa-list');
  const sub=document.getElementById('qa-panel-sub');
  if(!QA_DATA.length){
    list.innerHTML='<div class="empty"><i class="ti ti-checks" style="font-size:32px;color:var(--green2)"></i><p style="color:var(--txt3)">Nenhuma pergunta pendente!</p></div>';
    if(sub)sub.textContent='Tudo respondido ✓';
    return;
  }
  if(sub)sub.textContent=QA_DATA.length+' pendente'+(QA_DATA.length>1?'s':'');
  list.innerHTML=QA_DATA.map((q,i)=>{
    const dt=new Date(q.date_created);
    const dtStr=dt.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})+' '+dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    const img=q.item_image?`<img src="${q.item_image}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;flex-shrink:0" onerror="this.outerHTML='<div style=width:44px;height:44px;border-radius:8px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:20px>📦</div>'">`:'<div style="width:44px;height:44px;border-radius:8px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:20px">📦</div>';
    return`<div id="qa-card-${q.id}" style="background:var(--bg3);border:1px solid var(--border2);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;gap:10px;align-items:flex-start">
        ${img}
        <div style="flex:1;min-width:0">
          <div style="font-size:10px;color:var(--txt3);margin-bottom:3px">${q.shop_name||'ML'} · ${dtStr}</div>
          <div style="font-size:11px;color:var(--txt2);line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${q.item_title||'Produto'}</div>
        </div>
      </div>
      <div style="background:var(--bg);border-radius:10px;padding:10px;font-size:12px;color:var(--txt);line-height:1.5;border-left:3px solid var(--p3)">
        💬 ${q.text}
      </div>
      <div style="display:flex;gap:6px">
        <textarea id="qa-ans-${q.id}" placeholder="Digite sua resposta..." rows="2"
          style="flex:1;background:var(--bg);border:1px solid var(--border2);border-radius:8px;padding:8px;font-size:11px;color:var(--txt);resize:none;font-family:inherit;outline:none"
          onkeydown="if(event.ctrlKey&&event.key==='Enter')qaAnswer(${q.id},${i})"></textarea>
      </div>
      <div style="display:flex;gap:6px">
        <button onclick="qaAnswer(${q.id},${i})" id="qa-btn-${q.id}"
          style="flex:1;background:var(--p);color:#fff;border:none;border-radius:8px;padding:8px;font-size:11px;font-weight:700;cursor:pointer">
          <i class="ti ti-send"></i> Responder
        </button>
        <button onclick="qaSuggestAI(${q.id},${i})"
          style="background:rgba(109,40,217,.15);color:var(--p3);border:1px solid rgba(109,40,217,.3);border-radius:8px;padding:8px 12px;font-size:11px;font-weight:700;cursor:pointer" title="Sugerir resposta com IA">
          ✨ IA
        </button>
      </div>
    </div>`;
  }).join('');
}
function qaUpdateBadge(){
  const badge=document.getElementById('qa-badge');
  const btn=document.getElementById('qa-bell-btn');
  if(!badge)return;
  const n=QA_DATA.length;
  if(n>0){
    badge.textContent=n>99?'99+':n;
    badge.style.display='block';
    // Animação de notificação no sino
    if(btn){btn.style.animation='';void btn.offsetWidth;btn.style.animation='qaShake .5s ease';}
  }else{
    badge.style.display='none';
  }
}
async function qaAnswer(questionId, idx){
  const textarea=document.getElementById('qa-ans-'+questionId);
  const btn=document.getElementById('qa-btn-'+questionId);
  const text=textarea?.value?.trim();
  if(!text){toast('Digite uma resposta!');return;}
  const q=QA_DATA[idx];
  if(btn){btn.disabled=true;btn.innerHTML='<i class="ti ti-loader-2"></i> Enviando...';}
  try{
    await api('/api/questions/'+questionId+'/answer',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({text,account_id:q.account_id})
    });
    // Remove da lista
    QA_DATA.splice(idx,1);
    const card=document.getElementById('qa-card-'+questionId);
    if(card){
      card.style.transition='opacity .3s,transform .3s';
      card.style.opacity='0';card.style.transform='translateX(30px)';
      setTimeout(()=>{qaRender();qaUpdateBadge();},300);
    }
    toast('✅ Resposta enviada!');
  }catch(e){
    toast('Erro: '+(e.message||'Tente novamente'));
    if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-send"></i> Responder';}
  }
}
async function qaSuggestAI(questionId, idx){
  const textarea=document.getElementById('qa-ans-'+questionId);
  const q=QA_DATA[idx];
  if(!q||!textarea)return;
  textarea.value='Gerando sugestão...';textarea.disabled=true;
  // Sugestão local simples (sem API externa) — detecta tipo de pergunta
  await new Promise(r=>setTimeout(r,600));
  const text=q.text.toLowerCase();
  let suggestion='';
  if(text.includes('frete')||text.includes('entrega')||text.includes('prazo'))
    suggestion='Olá! O prazo de entrega varia conforme a sua região. O envio é realizado em até 2 dias úteis após a confirmação do pagamento. Para mais detalhes, o prazo exato aparece na tela de compra. Qualquer dúvida estamos à disposição!';
  else if(text.includes('original')||text.includes('garantia')||text.includes('autêntico'))
    suggestion='Olá! Sim, o produto é 100% original e acompanha nota fiscal. Garantia de fábrica conforme fabricante. Qualquer problema, entre em contato conosco!';
  else if(text.includes('cor')||text.includes('tamanho')||text.includes('modelo'))
    suggestion='Olá! As opções disponíveis estão descritas no anúncio. Caso tenha dúvidas sobre alguma especificação específica, pode nos informar que ajudamos!';
  else if(text.includes('disponível')||text.includes('estoque')||text.includes('tem'))
    suggestion='Olá! Sim, o produto está disponível em estoque! Pode realizar a compra com tranquilidade. Qualquer dúvida, é só perguntar!';
  else
    suggestion='Olá! Obrigado pela pergunta. '+q.item_title ? 'O produto '+q.item_title+' ' : 'Este produto '+'conta com todas as especificações descritas no anúncio. Qualquer dúvida adicional, estamos à disposição!';
  textarea.value=suggestion;textarea.disabled=false;textarea.focus();
}

// Polling de fundo — verifica perguntas novas a cada 3 min mesmo com painel fechado
async function qaBackgroundPoll(){
  try{
    const r=await api('/api/questions');
    const prev=QA_DATA.length;
    QA_DATA=r.questions||[];
    qaUpdateBadge();
    // Notificação pulsante se chegou pergunta nova
    if(QA_DATA.length>prev&&prev>=0){
      const btn=document.getElementById('qa-bell-btn');
      if(btn){btn.style.background='rgba(239,68,68,.2)';setTimeout(()=>{btn.style.background='';},3000);}
      toast('🔔 Nova pergunta no Mercado Livre!');
    }
  }catch(e){}
}

function planOpenUpgrade(){
  // v2.1 — fecha modal de conta antes de abrir planos (evita sobreposição)
  closeMo('mo-acc');
  const cur=USER?.plan||'free';
  ['simple','pro','business'].forEach(p=>{
    const card=document.getElementById('plan-card-'+p);
    const btn=document.getElementById('plan-btn-'+p);
    if(!card)return;
    if(p===cur){
      card.style.borderColor='var(--p2)';
      if(btn){btn.textContent='Plano atual';btn.style.cursor='default';btn.onclick=null;}
    } else {
      // restaura estado padrão caso tenha sido alterado antes
      if(btn&&btn.textContent==='Plano atual'){
        btn.textContent=p==='pro'?'Quero o Pro':'Quero o Business';
        btn.style.cursor='pointer';
        btn.onclick=()=>planContact(p);
      }
    }
  });
  openMo('mo-planos');
}
function planContact(plan){
  // v2.1 — exibe balão "EM DESENVOLVIMENTO" em vez de abrir email
  const btnId='plan-btn-'+plan;
  const btn=document.getElementById(btnId);
  if(!btn)return;
  const existing=document.getElementById('plan-dev-balloon');
  if(existing)existing.remove();
  const balloon=document.createElement('div');
  balloon.id='plan-dev-balloon';
  balloon.textContent='🚧 EM DESENVOLVIMENTO';
  Object.assign(balloon.style,{
    position:'fixed',zIndex:'99999',
    background:'#1e1e2e',border:'1px solid var(--p)',color:'var(--p)',
    borderRadius:'10px',padding:'8px 16px',fontSize:'11px',fontWeight:'700',
    pointerEvents:'none',transition:'opacity .3s',opacity:'1',
    boxShadow:'0 4px 20px rgba(109,40,217,.3)',letterSpacing:'.5px'
  });
  document.body.appendChild(balloon);
  const r=btn.getBoundingClientRect();
  balloon.style.left=(r.left+r.width/2-balloon.offsetWidth/2)+'px';
  balloon.style.top=(r.top-40)+'px';
  setTimeout(()=>{balloon.style.opacity='0';setTimeout(()=>balloon.remove(),300);},2000);
}
function connectMagalu(){
  window.location.href = API + '/auth/magalu?user_id=' + (USER?.id || '');
}
function connectPlat(plat){location.href=API+'/auth/'+plat+'?user_id='+(USER?.id||'');}
function connectMagaluDirect(){location.href=API+'/auth/magalu?user_id='+(USER?.id||'');}
async function disconnPlat(plat,accId){
  if(!confirm('Desconectar esta conta?'))return;
  try{
    // v5.16 — usa ID específico da conta se disponível, evita deslogar todas
    const url=accId?`/api/accounts/by-id/${accId}/disconnect`:`/api/accounts/${plat}/disconnect`;
    await api(url,{method:'POST'});
    toast('Desconectado!');ACCOUNTS=[];buildPlatBar();loadAccountsMo();loadData();
  }catch(e){toast('Erro: '+e.message);}
}

// ═══════════════════════════════════════════════════════════════
// v5.14 | 2026-06-19 | Code Software / Karaka — funções frontend
// ═══════════════════════════════════════════════════════════════
async function csWakeServer(){
  const btn=document.getElementById('cs-wake-btn');
  if(btn){btn.disabled=true;btn.innerHTML='<i class="ti ti-loader-2" style="animation:spin .8s linear infinite"></i> Acordando...';}
  try{
    const r=await fetch(API+'/health');
    const ok=r.ok;
    toast(ok?'✓ Servidor Render acordado!':'Servidor não respondeu, tente de novo em instantes');
  }catch(e){
    toast('Erro ao acordar servidor: '+(e.message||e));
  }finally{
    if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-zap"></i> Acordar servidor (Render)';}
  }
}

async function csCheckStatus(){
  const dot=document.getElementById('cs-dot');
  const txt=document.getElementById('cs-status-txt');
  const badge=document.getElementById('cs-badge');
  try{
    const r=await api('/api/codesoftware/status');
    if(r.online){
      if(dot){dot.style.background='var(--green2)';dot.style.boxShadow='0 0 8px var(--green2)';}
      if(txt)txt.textContent='API Code Software online';
      if(badge){badge.textContent='Online';badge.className='conn-badge';}
    }else{
      if(dot){dot.style.background='#ef4444';dot.style.boxShadow='none';}
      if(txt)txt.textContent='API offline: '+(r.error||'sem resposta');
      if(badge){badge.textContent='Offline';badge.className='disc-badge';}
    }
  }catch(e){
    if(dot){dot.style.background='#ef4444';}
    if(txt)txt.textContent='Erro ao verificar: '+e.message;
    if(badge){badge.textContent='Erro';badge.className='disc-badge';}
  }
}
async function csSync(days){
  const res=document.getElementById('cs-sync-result');
  if(res)res.innerHTML='<i class="ti ti-loader-2" style="animation:spin 1s linear infinite"></i> Sincronizando...';
  try{
    const r=await api('/api/codesoftware/sync?days='+(days||30),{method:'POST'});
    if(res)res.innerHTML=`<span style="color:var(--green2)">✓ ${r.synced} vendas sincronizadas (${r.from} → ${r.to})</span>`;
    toast(`✓ Code Software: ${r.synced} vendas`);
    await loadData(); buildPlatBar();
  }catch(e){
    if(res)res.innerHTML=`<span style="color:#ef4444">Erro: ${e.message}</span>`;
    toast('Erro sync Code Software: '+e.message);
  }
}

function renderDRE(){
  const d=DASH,fat=d.faturamento||0,luc=d.lucro||0,marg=d.marg||0;
  document.getElementById('dre-per').textContent=CUSTOM_FROM&&CUSTOM_TO?CUSTOM_FROM+' até '+CUSTOM_TO:(PERIOD===1?'Hoje':'Últimos '+PERIOD+' dias');
  document.getElementById('dre-body').innerHTML=`
    <div class="grid2">
      <div class="od-block"><div class="od-block-title"><i class="ti ti-trending-up"></i> Receitas</div>
        <div class="od-row"><span class="l">Faturamento</span><span class="v">${f(fat)}</span></div>
        <div class="od-row"><span class="l">Pedidos</span><span class="v">${d.total_orders||0}</span></div>
        <div class="od-row"><span class="l">Ticket médio</span><span class="v">${f(d.ticket||0)}</span></div>
      </div>
      <div class="od-block"><div class="od-block-title"><i class="ti ti-minus"></i> Deduções</div>
        <div class="od-row"><span class="l">Tarifas</span><span class="v" style="color:var(--red2)">− ${f(d.tarifas)}</span></div>
        <div class="od-row"><span class="l">Impostos</span><span class="v" style="color:var(--red2)">− ${f(d.impostos)}</span></div>
        <div class="od-row"><span class="l">Frete</span><span class="v" style="color:var(--red2)">− ${f(d.frete)}</span></div>
      </div>
      <div class="od-block"><div class="od-block-title"><i class="ti ti-package"></i> CMV</div>
        <div class="od-row"><span class="l">Custos produtos</span><span class="v" style="color:var(--orange2)">− ${f(d.custos)}</span></div>
        <div class="od-row"><span class="l">% do fat.</span><span class="v">${fat>0?pct(d.custos/fat*100):'—'}</span></div>
      </div>
      <div class="od-block"><div class="od-block-title"><i class="ti ti-x"></i> Cancelamentos</div>
        <div class="od-row"><span class="l">Quantidade</span><span class="v" style="color:var(--red2)">${d.cancelados||0}</span></div>
        <div class="od-row"><span class="l">Taxa</span><span class="v">${(d.total_orders||0)+(d.cancelados||0)>0?pct((d.cancelados||0)/((d.total_orders||0)+(d.cancelados||0))*100):'—'}</span></div>
      </div>
    </div>
    <div class="od-total">
      <div><div style="font-size:14px;font-weight:700;color:var(--txt2)">Lucro Operacional Líquido</div><div style="font-size:11px;color:var(--txt3);margin-top:3px">Margem: ${pct(marg)} · ${d.total_orders||0} pedidos</div></div>
      <div style="font-size:26px;font-weight:800;letter-spacing:-.5px;color:${luc>=0?'var(--green2)':'var(--red2)'}">${f(luc)}</div>
    </div>`;
}

function calc(){
  const p=parseFloat(document.getElementById('cp').value)||0,c=parseFloat(document.getElementById('cc').value)||0,t=parseFloat(document.getElementById('ct').value)||0;
  const imp=parseFloat(document.getElementById('ci2').value)||0,fr=parseFloat(document.getElementById('cfr').value)||0,ads=parseFloat(document.getElementById('cads').value)||0;
  const vt=p*t/100,vi=p*imp/100,l=p-c-vt-vi-fr-ads,mg=p>0?l/p*100:0;
  const ff=v=>'R$ '+v.toFixed(2).replace('.',',');
  document.getElementById('rr').textContent=ff(p);document.getElementById('rt').textContent='− '+ff(vt);
  document.getElementById('ri').textContent='− '+ff(vi);document.getElementById('rfr').textContent='− '+ff(fr);
  document.getElementById('rc').textContent='− '+ff(c);
  const rl=document.getElementById('rl');rl.textContent=ff(l);rl.style.color=l>=0?'var(--green2)':'var(--red2)';
  document.getElementById('rm').textContent=mg.toFixed(1)+'%';
  document.getElementById('rroas').textContent=ads>0?(p/ads).toFixed(2)+'x':'—';
}

let SRCH=''; // persiste entre refreshes
let PROD_FILTER=''; // filtro por produto clicado
function filterTable(v){SRCH=v.toLowerCase();PAGE=1;renderOrders();renderProdFilterBadge();}
function filtrarPorProduto(titulo){
  if(PROD_FILTER===titulo){PROD_FILTER='';} // toggle off
  else{PROD_FILTER=titulo;}
  PAGE=1;renderOrders();renderProdFilterBadge();
  // scroll para a tabela
  const el=document.getElementById('tbl-scroll');if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function renderProdFilterBadge(){
  let badge=document.getElementById('prod-filter-badge');
  if(PROD_FILTER){
    if(!badge){badge=document.createElement('div');badge.id='prod-filter-badge';badge.style.cssText='display:flex;align-items:center;gap:8px;background:rgba(109,40,217,.12);border:1px solid rgba(139,92,246,.3);border-radius:8px;padding:6px 12px;font-size:11px;color:var(--p3);font-weight:600;margin-bottom:8px';const tbl=document.querySelector('.tbl-head');if(tbl)tbl.after(badge);}
    badge.innerHTML=`<i class="ti ti-filter"></i> Filtrando: <span style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${PROD_FILTER}</span> <span onclick="filtrarPorProduto(PROD_FILTER)" style="cursor:pointer;margin-left:4px;opacity:.7" title="Limpar filtro"><i class="ti ti-x"></i></span>`;
  } else {
    if(badge) badge.remove();
  }
}
function changePage(d){
  let view=Array.isArray(FILTERED)?FILTERED:[];
  if(SRCH){const t=SRCH.toLowerCase();view=view.filter(o=>(o.item_title||'').toLowerCase().includes(t)||(o.item_sku||'').toLowerCase().includes(t)||(o.platform_order_id||'').toLowerCase().includes(t));}
  if(PROD_FILTER){view=view.filter(o=>(o.platform==='codesoftware'?'CODESOFTWARE VENDAS':(o.item_title||o.shop_name||o.platform))===PROD_FILTER);}
  const p=Math.max(1,Math.ceil(view.length/(window.PAGE_SIZE||20)));PAGE=Math.max(1,Math.min(p,PAGE+d));renderOrders();
}
function setPeriod(el,d){document.querySelectorAll('.pill').forEach(p=>p.classList.remove('on'));el.classList.add('on');CUSTOM_FROM='';CUSTOM_TO='';PERIOD=clampPeriod(d);loadData();}
let CUSTOM_PERIOD_EL=null;
function isoDateLocal(d){
  const x=new Date(d);x.setMinutes(x.getMinutes()-x.getTimezoneOffset());return x.toISOString().slice(0,10);
}
function daysBetween(a,b){
  const da=new Date(a+'T00:00:00'),db=new Date(b+'T00:00:00');
  return Math.round((db-da)/86400000)+1;
}
function ensureCustomDateModal(){
  let modal=document.getElementById('mo-date');
  if(modal)return modal;
  const wrap=document.createElement('div');
  wrap.innerHTML=`<div class="mo" id="mo-date" onclick="closeBg(event,'mo-date')">
    <div class="md" style="max-width:430px;">
      <div class="mh"><div class="mh-left"><div class="mh-ico"><i class="ti ti-calendar"></i></div><div><div class="mh-title">Data personalizada</div><div class="mh-sub">Selecione um período de até 45 dias</div></div></div><div class="mh-close" onclick="closeMo('mo-date')"><i class="ti ti-x"></i></div></div>
      <div class="mb">
        <div class="grid2">
          <div class="fi"><label>Data inicial</label><input type="date" id="custom-date-from" onchange="syncCustomDateLimits()"/></div>
          <div class="fi"><label>Data final</label><input type="date" id="custom-date-to"/></div>
        </div>
        <div class="note"><i class="ti ti-info-circle"></i> O limite é de 45 dias para evitar sobrecarga nas APIs dos marketplaces.</div>
        <button class="btn primary" onclick="applyCustomDate()"><i class="ti ti-check"></i> Aplicar filtro</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(wrap.firstElementChild);
  return document.getElementById('mo-date');
}
function setCustomPeriod(el){
  CUSTOM_PERIOD_EL=el;
  ensureCustomDateModal();
  const today=isoDateLocal(new Date());
  const from=document.getElementById('custom-date-from');
  const to=document.getElementById('custom-date-to');
  if(!from||!to)return toast('Calendário não carregou. Recarregue a página.');
  from.max=today;
  to.max=today;
  from.value=CUSTOM_FROM||today;
  to.value=CUSTOM_TO||today;
  syncCustomDateLimits();
  openMo('mo-date');
}
function syncCustomDateLimits(){
  const from=document.getElementById('custom-date-from');
  const to=document.getElementById('custom-date-to');
  if(!from||!to||!from.value)return;
  const start=new Date(from.value+'T00:00:00');
  const maxEnd=new Date(start);maxEnd.setDate(maxEnd.getDate()+44);
  const today=new Date();today.setHours(0,0,0,0);
  to.min=from.value;
  to.max=isoDateLocal(maxEnd>today?today:maxEnd);
  if(!to.value||to.value<to.min)to.value=to.min;
  if(to.value>to.max)to.value=to.max;
}
function applyCustomDate(){
  const ini=document.getElementById('custom-date-from').value;
  const fim=document.getElementById('custom-date-to').value;
  if(!ini||!fim)return toast('Selecione as duas datas');
  const total=daysBetween(ini,fim);
  if(total<1)return toast('Data final precisa ser depois da inicial');
  if(total>45)return toast('Escolha no máximo 45 dias');
  CUSTOM_FROM=ini;CUSTOM_TO=fim;
  document.querySelectorAll('.pill').forEach(p=>p.classList.remove('on'));
  if(CUSTOM_PERIOD_EL)CUSTOM_PERIOD_EL.classList.add('on');
  closeMo('mo-date');
  toast(`Filtro aplicado: ${ini.split('-').reverse().join('/')} até ${fim.split('-').reverse().join('/')}`);
  loadData();
}
// v2.1 — setPlatFilter agora aceita acc (shop_name) para filtrar conta específica
function setPlatFilter(plat,el,acc=''){document.querySelectorAll('.pfil').forEach(p=>p.classList.remove('on'));el.classList.add('on');PLAT=plat;ACC_FILTER=acc;loadData();}
function setFTab(el,tab){document.querySelectorAll('.ftab').forEach(t=>t.classList.remove('on'));el.classList.add('on');FTAB=tab;applyFilters();}
function setPTab(el,tab){document.querySelectorAll('.ptab').forEach(t=>t.classList.remove('on'));el.classList.add('on');PTAB=tab;renderProds();}
function setSbi(el){document.querySelectorAll('.s-btn').forEach(i=>i.classList.remove('on'));el.classList.add('on');}
function openMo(id){const m=document.getElementById(id);if(!m)return;m.classList.add('on');if(id==='mo-mp')loadAccountsMo();if(id==='mo-cst')loadProducts();if(id==='mo-dre')renderDRE();if(id==='mo-acc')ssInitDebugToggle();}
function closeMo(id){const m=document.getElementById(id);if(m)m.classList.remove('on');}
function closeBg(e,id){if(e.target.id===id)closeMo(id);}
function toggleMp(id){document.getElementById('mp-'+id).classList.toggle('on');document.getElementById('cv-'+id).classList.toggle('open');}
function toggleHide(){HIDDEN=!HIDDEN;document.getElementById('eye-btn').innerHTML=HIDDEN?'<i class="ti ti-eye-off"></i>':'<i class="ti ti-eye"></i>';computeDash();renderOrders();renderProds();}

function exportCSV(){
  const h='ID,Título,Plataforma,Conta,SKU,Status,Tipo,Valor,Tarifa,Frete,Imposto,Custo,Lucro,Margem,Data\n';
  const rows=FILTERED.map(o=>{const l=parseFloat(o.profit||0),m=o.total_amount>0?(l/o.total_amount*100).toFixed(1)+'%':'—';return[o.platform_order_id,o.item_title||'',o.platform,o.shop_name||'',o.item_sku||'',o.status,o.fulfillment_type,o.total_amount,o.platform_fee,o.shipping_fee,o.tax_amount,o.total_cost,l.toFixed(2),m,o.order_date].join(',');}).join('\n');
  const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(h+rows);a.download='salesync.csv';a.click();toast('CSV exportado!');
}

let _tt;function toast(msg){const t=document.getElementById('toast');document.getElementById('tmsg').textContent=msg;t.classList.add('on');clearTimeout(_tt);_tt=setTimeout(()=>t.classList.remove('on'),3000);}
</script>
<!-- SalesSync v17 — metas, impressões disponíveis e analytics -->
<style>
.goal-chip{background:rgba(109,40,217,.12);border:1px solid rgba(139,92,246,.28);border-radius:10px;padding:6px 10px;font-size:10px;color:var(--txt2);display:flex;gap:7px;align-items:center;cursor:pointer}.goal-chip strong{color:var(--p3)}
.ss-modal{position:fixed;inset:0;background:rgba(6,8,24,.82);backdrop-filter:blur(8px);z-index:9999;display:none;align-items:center;justify-content:center;padding:18px}.ss-modal.on{display:flex}.ss-box{background:var(--bg2);border:1px solid var(--border2);border-radius:18px;width:100%;max-width:760px;max-height:88vh;overflow:auto;box-shadow:0 30px 90px rgba(0,0,0,.65)}.ss-head{padding:16px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}.ss-head h3{font-size:15px;margin:0}.ss-close{width:30px;height:30px;border-radius:8px;background:var(--bg3);border:1px solid var(--border);color:var(--txt3);cursor:pointer}.ss-body{padding:16px 18px;display:flex;flex-direction:column;gap:12px}.ss-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.ss-card{background:var(--bg3);border:1px solid var(--border);border-radius:13px;padding:12px}.ss-card span{display:block;font-size:9px;color:var(--txt3);text-transform:uppercase;letter-spacing:.6px;font-weight:800}.ss-card strong{display:block;font-size:18px;margin-top:4px}.ss-input{background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:10px 12px;color:var(--txt);font-size:13px;width:100%;outline:none}.ss-btn{border:0;border-radius:10px;padding:10px 14px;font-size:12px;font-weight:800;cursor:pointer;background:linear-gradient(135deg,var(--p),var(--p2));color:white}.ss-btn.ghost{background:var(--bg4);border:1px solid var(--border2);color:var(--txt2)}.ss-list{display:flex;flex-direction:column;gap:8px}.ss-row{background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:10px 12px;display:grid;grid-template-columns:28px 1fr auto;gap:10px;align-items:center}.ss-row small{color:var(--txt3)}.ss-badge{font-size:9px;font-weight:800;padding:4px 8px;border-radius:999px;background:rgba(16,185,129,.12);color:var(--green2);border:1px solid rgba(16,185,129,.2)}.ss-progress{height:8px;background:var(--bg4);border-radius:99px;overflow:hidden;margin-top:8px}.ss-progress>div{height:100%;background:linear-gradient(90deg,var(--p),var(--green2));width:0%}@media(max-width:760px){.ss-grid{grid-template-columns:1fr}.ss-box{max-height:94vh}}
</style>
<div id="ss-goal-modal" class="ss-modal"><div class="ss-box" style="max-width:460px"><div class="ss-head"><h3>Meta de faturamento mensal</h3><button class="ss-close" onclick="ssCloseModal('ss-goal-modal')">×</button></div><div class="ss-body"><label style="font-size:12px;color:var(--txt2);display:flex;gap:8px;align-items:center"><input type="checkbox" id="ss-goal-enabled"> Usar meta de faturamento</label><input id="ss-goal-value" class="ss-input" type="number" min="0" step="100" placeholder="Ex: 200000"><button class="ss-btn" onclick="ssSaveGoal()">Salvar meta</button></div></div></div>
<div id="ss-print-modal" class="ss-modal"><div class="ss-box"><div class="ss-head"><h3>Possíveis impressões</h3><button class="ss-close" onclick="ssCloseModal('ss-print-modal')">×</button></div><div class="ss-body"><div style="display:flex;gap:8px;align-items:center;justify-content:space-between"><div style="font-size:12px;color:var(--txt3)">Busca últimos dias e mostra Magalu + Mercado Livre com etiqueta disponível para envio.</div><button class="ss-btn ghost" onclick="ssLoadPrintableDeliveries()">Atualizar</button></div><div id="ss-print-list" class="ss-list"></div><button class="ss-btn" onclick="ssPrintSelectedDeliveries()">Imprimir selecionadas</button></div></div></div>
<div id="ss-analytics-modal" class="ss-modal"><div class="ss-box"><div class="ss-head"><h3>Resumo SalesSync</h3><button class="ss-close" onclick="ssCloseModal('ss-analytics-modal')">×</button></div><div class="ss-body"><div id="ss-analytics-cards" class="ss-grid"></div><div id="ss-analytics-note" style="font-size:12px;color:var(--txt3)"></div></div></div></div>
<script>
function ssToken(){return localStorage.getItem('ss_token')||TOKEN||''}function ssHeaders(){return{Authorization:'Bearer '+ssToken(),'Content-Type':'application/json'}}function ssMoney(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}function ssCloseModal(id){document.getElementById(id)?.classList.remove('on')}function ssOpenModal(id){document.getElementById(id)?.classList.add('on')}async function ssFetchJson(url,opts={}){const r=await fetch(url,{...opts,headers:{...ssHeaders(),...(opts.headers||{})}});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||j.message||'Erro na requisição');return j}
async function ssLoadGoal(){try{const j=await ssFetchJson(`${API}/api/user-goals`),g=j.data||{};const en=document.getElementById('ss-goal-enabled'),val=document.getElementById('ss-goal-value');if(en)en.checked=!!g.revenue_goal_enabled;if(val)val.value=Number(g.monthly_revenue_goal||0)||''}catch(e){console.warn(e.message)}}
async function ssSaveGoal(){await ssFetchJson(`${API}/api/user-goals`,{method:'POST',body:JSON.stringify({revenue_goal_enabled:document.getElementById('ss-goal-enabled')?.checked||false,monthly_revenue_goal:Number(document.getElementById('ss-goal-value')?.value||0)})});ssCloseModal('ss-goal-modal');await ssLoadAnalyticsSummary(true);if(typeof toast==='function')toast('Meta salva')}
async function ssLoadAnalyticsSummary(updateTop=false){const j=await ssFetchJson(`${API}/api/analytics/summary`),d=j.data||{};if(updateTop){let chip=document.getElementById('ss-goal-chip');if(!chip){chip=document.createElement('div');chip.id='ss-goal-chip';chip.className='goal-chip';chip.onclick=()=>{ssLoadGoal();ssOpenModal('ss-goal-modal')};(document.querySelector('.t-r')||document.getElementById('topbar'))?.prepend(chip)}chip.innerHTML=d.revenue_goal_enabled&&d.monthly_revenue_goal>0?`<span>Meta:</span><strong>${ssMoney(d.monthly_revenue_goal)}</strong><span>Falta:</span><strong>${ssMoney(d.missing_to_goal)}</strong><span>${d.goal_progress_pct}%</span>`:`<span>Meta mensal</span><strong>Configurar</strong>`}return d}
async function ssOpenAnalytics(){const d=await ssLoadAnalyticsSummary(false);document.getElementById('ss-analytics-cards').innerHTML=`<div class="ss-card"><span>Faturamento mês</span><strong>${ssMoney(d.gross_sales)}</strong></div><div class="ss-card"><span>Lucro líquido</span><strong>${ssMoney(d.net_profit)}</strong></div><div class="ss-card"><span>Previsão mês</span><strong>${ssMoney(d.projected_revenue)}</strong></div><div class="ss-card"><span>Pedidos</span><strong>${d.orders_count}</strong></div><div class="ss-card"><span>Ticket médio</span><strong>${ssMoney(d.avg_ticket)}</strong></div><div class="ss-card"><span>Progresso meta</span><strong>${d.revenue_goal_enabled?d.goal_progress_pct+'%':'—'}</strong><div class="ss-progress"><div style="width:${Math.min(100,d.goal_progress_pct||0)}%"></div></div></div>`;document.getElementById('ss-analytics-note').innerHTML=`Produto mais vendido: <b>${d.best_seller_product||'—'}</b><br>Produto mais lucrativo: <b>${d.most_profitable_product||'—'}</b><br>${d.revenue_goal_enabled?(d.will_hit_goal?'No ritmo atual, deve bater a meta.':'No ritmo atual, ainda precisa acelerar para bater a meta.'):'Meta mensal desativada.'}`;ssOpenModal('ss-analytics-modal')}
async function ssLoadPrintableDeliveries(){
  const box=document.getElementById('ss-print-list');
  box.innerHTML='<div style="color:var(--txt3);font-size:12px">Carregando possíveis impressões...</div>';
  try{
    const j=await ssFetchJson(`${API}/api/printable-labels`),arr=j.data||[];
    if(!arr.length){box.innerHTML='<div style="color:var(--txt3);font-size:12px">Nenhuma impressão disponível agora.</div>';return}
    box.innerHTML=arr.map(x=>{
      const isML=x.platform==='mercadolivre';
      const value=isML?x.shipment_id:x.delivery_id;
      const badge=isML?'ML':'Magalu';
      const title=isML?`Envio: ${x.shipment_id}`:`Pedido: ${x.order_code||x.delivery_code}`;
      const sub=isML?`${x.customer_name||'Cliente'} · ${x.product||''}`:`${x.customer_name||'Cliente'} · ${x.customer_city||''}/${x.customer_state||''}`;
      const extra=isML?`SKU: ${x.sku||'—'} · ${x.status||'—'}`:`SKU: ${x.sku||'—'} · NF: ${x.invoice_key||'—'} · Status: ${x.status}`;
      return `<label class="ss-row"><input type="checkbox" class="ss-print-check" data-platform="${x.platform}" value="${value}" checked><div><b>${title}</b><br><small>${sub}</small><br><small>${extra}</small></div><span class="ss-badge">${badge}</span></label>`;
    }).join('')
  }catch(e){box.innerHTML=`<div style="color:var(--red2);font-size:12px">${e.message}</div>`}
}
function ssOpenPrintable(){ssOpenModal('ss-print-modal');ssLoadPrintableDeliveries()}
function ssPrintSelectedDeliveries(){
  const checks=[...document.querySelectorAll('.ss-print-check:checked')];
  if(!checks.length)return alert('Selecione pelo menos uma venda.');
  const mg=checks.filter(i=>i.dataset.platform==='magalu').map(i=>i.value);
  const ml=checks.filter(i=>i.dataset.platform==='mercadolivre').map(i=>i.value);
  if(mg.length && ml.length){
    window.open(`${API}/api/magalu/labels/zebra-completo?ids=${encodeURIComponent(mg.join(','))}&token=${encodeURIComponent(ssToken())}`,'_blank');
    setTimeout(()=>window.open(`${API}/api/ml/labels?shipment_ids=${encodeURIComponent(ml.join(','))}&token=${encodeURIComponent(ssToken())}`,'_blank'),600);
    return;
  }
  if(mg.length) return window.open(`${API}/api/magalu/labels/zebra-completo?ids=${encodeURIComponent(mg.join(','))}&token=${encodeURIComponent(ssToken())}`,'_blank');
  if(ml.length) return window.open(`${API}/api/ml/labels?shipment_ids=${encodeURIComponent(ml.join(','))}&token=${encodeURIComponent(ssToken())}`,'_blank');
}
function ssInstallSideButtons(){const sidebar=document.getElementById('sidebar');if(!sidebar)return;if(!document.getElementById('ss-side-print')){const b=document.createElement('div');b.id='ss-side-print';b.className='s-btn';b.innerHTML='<i class="ti ti-printer"></i><span class="s-tip">Possíveis impressões</span>';b.onclick=ssOpenPrintable;sidebar.insertBefore(b,sidebar.querySelector('.s-sp')||null)}if(!document.getElementById('ss-side-analytics')){const b=document.createElement('div');b.id='ss-side-analytics';b.className='s-btn';b.innerHTML='<i class="ti ti-chart-bar"></i><span class="s-tip">Resumo</span>';b.onclick=ssOpenAnalytics;sidebar.insertBefore(b,sidebar.querySelector('.s-sp')||null)}}
function ssOpenGoalSettings(){ssLoadGoal();ssOpenModal('ss-goal-modal')}
setTimeout(()=>{ssInstallSideButtons();ssLoadAnalyticsSummary(true).catch(()=>{});fetch(`${API}/api/analytics/monthly-snapshot`,{method:'POST',headers:ssHeaders()}).catch(()=>{})},1400);
</script>



<!-- SalesSync v19 — correção resumo: loading, gráfico e compatibilidade data/current_month -->
<style>
.ss-loader{width:34px;height:34px;border:3px solid rgba(167,139,250,.18);border-top-color:var(--p2);border-radius:50%;animation:ssspin .75s linear infinite}@keyframes ssspin{to{transform:rotate(360deg)}}
.ss-loading{min-height:240px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--txt2)}
.ss-bar-card{background:var(--bg3);border:1px solid var(--border);border-radius:13px;padding:12px;grid-column:1/-1}.ss-bar-title{font-size:12px;font-weight:800;margin-bottom:10px}.ss-bars{display:flex;align-items:flex-end;gap:8px;height:155px;border-bottom:1px solid rgba(255,255,255,.08);padding-top:10px}.ss-bar-wrap{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:5px;min-width:22px}.ss-bar{width:100%;max-width:36px;min-height:4px;border-radius:8px 8px 2px 2px;background:linear-gradient(180deg,var(--p2),var(--p));box-shadow:0 0 12px rgba(139,92,246,.25)}.ss-bar-lbl{font-size:8px;color:var(--txt3);white-space:nowrap}.ss-bar-val{font-size:8px;color:var(--txt2);writing-mode:vertical-rl;transform:rotate(180deg);max-height:58px;overflow:hidden}
</style>
<script>
function ssExtractAnalyticsPayload(j){
  const cm = j.current_month || j.data || {};
  return { cm, rows: Array.isArray(j.monthly_revenue) ? j.monthly_revenue : [] };
}
function ssBars(rows){
  rows = Array.isArray(rows) ? rows : [];
  if(!rows.length) return `<div class="ss-bar-card"><div class="ss-bar-title">Faturamento por mês</div><div style="padding:28px;color:var(--txt3);text-align:center">Sem histórico mensal ainda</div></div>`;
  const max = Math.max(...rows.map(r=>Number(r.gross_sales||0)), 1);
  return `<div class="ss-bar-card"><div class="ss-bar-title">Faturamento por mês</div><div class="ss-bars">${rows.map(r=>{const val=Number(r.gross_sales||0); const h=Math.max(4,Math.round((val/max)*125)); return `<div class="ss-bar-wrap" title="${r.label||r.month}: ${ssMoney(val)}"><div class="ss-bar-val">${ssMoney(val)}</div><div class="ss-bar" style="height:${h}px"></div><div class="ss-bar-lbl">${r.label||''}</div></div>`}).join('')}</div></div>`;
}
async function ssLoadAnalyticsSummary(updateTop=false){
  const j = await ssFetchJson(`${API}/api/analytics/summary`);
  const { cm, rows } = ssExtractAnalyticsPayload(j);
  const d = cm || {};
  if(updateTop){
    let chip=document.getElementById('ss-goal-chip');
    if(!chip){chip=document.createElement('div');chip.id='ss-goal-chip';chip.className='goal-chip';chip.onclick=()=>{ssLoadGoal();ssOpenModal('ss-goal-modal')};(document.querySelector('.t-r')||document.getElementById('topbar'))?.prepend(chip)}
    const missing = d.missing_to_goal ?? d.remaining_to_goal;
    chip.innerHTML=d.revenue_goal_enabled&&d.monthly_revenue_goal>0?`<span>Meta:</span><strong>${ssMoney(d.monthly_revenue_goal)}</strong><span>Falta:</span><strong>${ssMoney(missing)}</strong><span>${Number(d.goal_progress_pct||0).toFixed(1)}%</span>`:`<span>Meta mensal</span><strong>Configurar</strong>`;
  }
  return { ...d, monthly_revenue: rows };
}
async function ssOpenAnalytics(){
  ssOpenModal('ss-analytics-modal');
  const cards=document.getElementById('ss-analytics-cards');
  const note=document.getElementById('ss-analytics-note');
  if(cards) cards.innerHTML=`<div class="ss-loading" style="grid-column:1/-1"><div class="ss-loader"></div><div>Carregando resumo...</div><small style="color:var(--txt3)">Buscando vendas, metas e faturamento mensal</small></div>`;
  if(note) note.innerHTML='';
  try{
    const d=await ssLoadAnalyticsSummary(false);
    cards.innerHTML=`<div class="ss-card"><span>Faturamento mês</span><strong>${ssMoney(d.gross_sales)}</strong></div><div class="ss-card"><span>Lucro líquido</span><strong>${ssMoney(d.net_profit)}</strong></div><div class="ss-card"><span>Previsão mês</span><strong>${ssMoney(d.projected_revenue)}</strong></div><div class="ss-card"><span>Pedidos</span><strong>${d.orders_count||0}</strong></div><div class="ss-card"><span>Ticket médio</span><strong>${ssMoney(d.avg_ticket)}</strong></div><div class="ss-card"><span>Progresso meta</span><strong>${d.revenue_goal_enabled?Number(d.goal_progress_pct||0).toFixed(1)+'%':'—'}</strong><div class="ss-progress"><div style="width:${Math.min(100,d.goal_progress_pct||0)}%"></div></div></div>${ssBars(d.monthly_revenue)}`;
    note.innerHTML=`Produto mais vendido: <b>${d.best_seller_product||'—'}</b><br>Produto mais lucrativo: <b>${d.most_profitable_product||'—'}</b><br>${d.revenue_goal_enabled?(d.will_hit_goal?'No ritmo atual, deve bater a meta.':'No ritmo atual, ainda precisa acelerar para bater a meta.'):'Meta mensal desativada.'}`;
  }catch(e){
    if(cards) cards.innerHTML=`<div style="grid-column:1/-1;color:var(--red2);padding:20px">Erro ao carregar resumo: ${e.message}</div>`;
  }
}
</script>



<!-- SalesSync v20 — rendimentos extras no faturamento bruto -->
<style>
.ss-extra-form{display:grid;grid-template-columns:1fr 150px;gap:10px}.ss-check{font-size:12px;color:var(--txt2);display:flex;gap:8px;align-items:center;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:10px 12px}.ss-extra-total{background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.18);border-radius:12px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between}.ss-extra-total span{font-size:10px;color:var(--txt3);text-transform:uppercase;letter-spacing:.6px;font-weight:800}.ss-extra-total strong{font-size:18px;color:var(--green2)}.ss-row .ss-del{width:28px;height:28px;border-radius:8px;background:var(--bg4);border:1px solid var(--border);color:var(--red2);cursor:pointer}.ss-help{font-size:10px;color:var(--txt3);line-height:1.4}.ss-plus-tip{background:rgba(16,185,129,.14)!important;color:var(--green2)!important}@media(max-width:620px){.ss-extra-form{grid-template-columns:1fr}}
</style>
<div id="ss-extra-modal" class="ss-modal"><div class="ss-box" style="max-width:560px"><div class="ss-head"><h3>Adicionar rendimento ao faturamento bruto</h3><button class="ss-close" onclick="ssCloseModal('ss-extra-modal')">×</button></div><div class="ss-body"><div class="ss-help">Cadastre entradas extras, como rendimento manual, serviço, venda por fora ou qualquer valor que deve somar no faturamento bruto do resumo.</div><div class="ss-extra-form"><input id="ss-extra-name" class="ss-input" placeholder="Nome do rendimento. Ex: Venda balcão"><input id="ss-extra-value" class="ss-input" placeholder="R$ 0,00" inputmode="decimal" oninput="ssMaskMoneyInput(this)"></div><label class="ss-check"><input type="checkbox" id="ss-extra-recurring"> Esse rendimento entra todo mês?</label><button class="ss-btn" onclick="ssSaveExtraRevenue()"><i class="ti ti-plus"></i> Adicionar no faturamento</button><div class="ss-extra-total"><span>Total extra deste mês</span><strong id="ss-extra-total">R$ 0,00</strong></div><div id="ss-extra-list" class="ss-list"></div></div></div></div>
<script>
function ssParseBRMoney(v){v=String(v||'').replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',','.');const n=Number(v);return Number.isFinite(n)?n:0}
function ssMaskMoneyInput(el){const raw=String(el.value||'').replace(/\D/g,'');const n=Number(raw||0)/100;el.value=n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
async function ssLoadExtraRevenues(){const box=document.getElementById('ss-extra-list'),tot=document.getElementById('ss-extra-total');if(box)box.innerHTML='<div style="color:var(--txt3);font-size:12px">Carregando...</div>';try{const j=await ssFetchJson(`${API}/api/additional-revenues`),arr=j.data||[];if(tot)tot.textContent=ssMoney(j.total||0);if(!box)return;if(!arr.length){box.innerHTML='<div style="color:var(--txt3);font-size:12px">Nenhum rendimento extra cadastrado para este mês.</div>';return}box.innerHTML=arr.map(x=>`<div class="ss-row"><i class="ti ti-cash-banknote" style="color:var(--green2);font-size:20px"></i><div><b>${x.name}</b><br><small>${ssMoney(x.amount)} · ${x.recurring?'Todo mês':'Somente este mês'}</small></div><button class="ss-del" title="Remover" onclick="ssDeleteExtraRevenue(${x.id})"><i class="ti ti-trash"></i></button></div>`).join('')}catch(e){if(box)box.innerHTML=`<div style="color:var(--red2);font-size:12px">${e.message}</div>`}}
async function ssOpenExtraRevenue(){ssOpenModal('ss-extra-modal');document.getElementById('ss-extra-name').value='';document.getElementById('ss-extra-value').value='';document.getElementById('ss-extra-recurring').checked=false;await ssLoadExtraRevenues()}
async function ssSaveExtraRevenue(){const name=document.getElementById('ss-extra-name')?.value?.trim()||'';const amount=ssParseBRMoney(document.getElementById('ss-extra-value')?.value||'');const recurring=!!document.getElementById('ss-extra-recurring')?.checked;if(!name)return alert('Coloque o nome do rendimento.');if(amount<=0)return alert('Coloque um valor maior que zero.');await ssFetchJson(`${API}/api/additional-revenues`,{method:'POST',body:JSON.stringify({name,amount,recurring})});document.getElementById('ss-extra-name').value='';document.getElementById('ss-extra-value').value='';document.getElementById('ss-extra-recurring').checked=false;await ssLoadExtraRevenues();await ssLoadAnalyticsSummary(true).catch(()=>{});if(typeof toast==='function')toast('Rendimento adicionado ao faturamento bruto')}
async function ssDeleteExtraRevenue(id){if(!confirm('Remover esse rendimento do faturamento?'))return;await ssFetchJson(`${API}/api/additional-revenues/${id}`,{method:'DELETE'});await ssLoadExtraRevenues();await ssLoadAnalyticsSummary(true).catch(()=>{});if(typeof toast==='function')toast('Rendimento removido')}
const ssInstallSideButtonsBase=window.ssInstallSideButtons;
window.ssInstallSideButtons=function(){if(typeof ssInstallSideButtonsBase==='function')ssInstallSideButtonsBase();const sidebar=document.getElementById('sidebar');if(!sidebar||document.getElementById('ss-side-extra'))return;const anchor=document.getElementById('ss-side-analytics')||sidebar.querySelector('.s-sp');const b=document.createElement('div');b.id='ss-side-extra';b.className='s-btn';b.innerHTML='<i class="ti ti-plus"></i><span class="s-tip ss-plus-tip">Adicionar rendimento</span>';b.onclick=ssOpenExtraRevenue;if(anchor&&anchor.nextSibling)sidebar.insertBefore(b,anchor.nextSibling);else sidebar.insertBefore(b,sidebar.querySelector('.s-sp')||null)};
const ssOpenAnalyticsBase=window.ssOpenAnalytics;
window.ssOpenAnalytics=async function(){ssOpenModal('ss-analytics-modal');const cards=document.getElementById('ss-analytics-cards'),note=document.getElementById('ss-analytics-note');if(cards)cards.innerHTML=`<div class="ss-loading" style="grid-column:1/-1"><div class="ss-loader"></div><div>Carregando resumo...</div><small style="color:var(--txt3)">Buscando vendas, rendimentos extras, metas e faturamento mensal</small></div>`;if(note)note.innerHTML='';try{const d=await ssLoadAnalyticsSummary(false);cards.innerHTML=`<div class="ss-card"><span>Faturamento bruto mês</span><strong>${ssMoney(d.gross_sales)}</strong></div><div class="ss-card"><span>Vendas marketplaces</span><strong>${ssMoney(d.gross_sales_orders||0)}</strong></div><div class="ss-card"><span>Rendimentos extras</span><strong>${ssMoney(d.additional_revenue_total||0)}</strong></div><div class="ss-card"><span>Lucro líquido</span><strong>${ssMoney(d.net_profit)}</strong></div><div class="ss-card"><span>Previsão mês</span><strong>${ssMoney(d.projected_revenue)}</strong></div><div class="ss-card"><span>Pedidos</span><strong>${d.orders_count||0}</strong></div><div class="ss-card"><span>Ticket médio</span><strong>${ssMoney(d.avg_ticket)}</strong></div><div class="ss-card"><span>Progresso meta</span><strong>${d.revenue_goal_enabled?Number(d.goal_progress_pct||0).toFixed(1)+'%':'—'}</strong><div class="ss-progress"><div style="width:${Math.min(100,d.goal_progress_pct||0)}%"></div></div></div>${ssBars(d.monthly_revenue)}`;const extras=(d.additional_revenues||[]).map(x=>`${x.name}: <b>${ssMoney(x.amount)}</b>${x.recurring?' (todo mês)':''}`).join('<br>');note.innerHTML=`Rendimentos extras:<br>${extras||'<b>—</b>'}<br><br>Produto mais vendido: <b>${d.best_seller_product||'—'}</b><br>Produto mais lucrativo: <b>${d.most_profitable_product||'—'}</b><br>${d.revenue_goal_enabled?(d.will_hit_goal?'No ritmo atual, deve bater a meta.':'No ritmo atual, ainda precisa acelerar para bater a meta.'):'Meta mensal desativada.'}`;}catch(e){if(cards)cards.innerHTML=`<div style="grid-column:1/-1;color:var(--red2);padding:20px">Erro ao carregar resumo: ${e.message}</div>`}}
setTimeout(()=>{try{window.ssInstallSideButtons()}catch(e){}},300);
</script>



<!-- SalesSync v21 — Devoluções + botões dentro da conta -->
<style>
.ss-account-main-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ss-account-main-actions .btn{font-size:11px;padding:9px 10px}.ret-cost-inp{width:74px;background:var(--bg4);border:1px solid var(--border2);border-radius:7px;color:var(--txt);padding:5px 7px;font-size:10px;outline:none}.ret-cost-inp:focus{border-color:var(--p2)}.ret-total{font-weight:900;color:var(--red2)}.ss-account-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:8px}.ss-account-actions .btn{font-size:10px;padding:8px 9px}.ret-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.ret-kpi{background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:10px}.ret-kpi span{font-size:9px;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;font-weight:800}.ret-kpi strong{display:block;margin-top:4px;font-size:16px}@media(max-width:760px){.ret-kpis{grid-template-columns:1fr 1fr}.ss-account-actions{grid-template-columns:1fr}}
</style>
<style>
/* ── RETURNS MODAL ── */
.ret-modal-box{max-width:860px;width:100%;}
.ret-kpis{display:flex;align-items:center;gap:0;margin-bottom:14px;background:var(--bg3);border:1px solid var(--border2);border-radius:14px;overflow:hidden;}
.ret-kpi{flex:1;padding:12px 16px;border-right:1px solid var(--border);display:flex;align-items:center;gap:10px;}
.ret-kpi:last-child{border-right:none;}
.ret-kpi-icon{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;}
.ret-kpi-data span{font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:var(--txt3);font-weight:700;display:block;margin-bottom:2px;}
.ret-kpi-data strong{font-size:17px;font-weight:800;letter-spacing:-.5px;color:var(--txt);}
.ret-kpi.danger .ret-kpi-data strong{color:var(--red2);}
.ret-kpi.warn .ret-kpi-data strong{color:var(--orange2);}
@media(max-width:600px){.ret-kpis{flex-direction:column;}.ret-kpi{border-right:none;border-bottom:1px solid var(--border);}}
.ret-actions{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;}
.ret-search-wrap{display:grid;grid-template-columns:1fr auto;gap:8px;margin-bottom:14px;}
.ret-search{height:38px;border-radius:10px;border:1px solid var(--border2);background:var(--bg3);color:var(--txt);padding:0 12px;outline:none;font-size:13px;font-family:'Inter',sans-serif;width:100%;}
.ret-search:focus{border-color:var(--p2);}
.ret-cards{display:flex;flex-direction:column;gap:10px;max-height:54vh;overflow-y:auto;padding-right:2px;}
.ret-cards::-webkit-scrollbar{width:4px;}
.ret-cards::-webkit-scrollbar-thumb{background:var(--bg5);border-radius:4px;}
.ret-card{background:var(--bg3);border:1px solid var(--border2);border-radius:14px;padding:14px;cursor:pointer;transition:border-color .18s,box-shadow .18s;position:relative;}
.ret-card:hover{border-color:var(--p2);box-shadow:0 4px 18px rgba(109,40,217,.15);}
.ret-card-top{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.ret-card-id{font-size:12px;font-weight:700;color:var(--txt);letter-spacing:-.2px;}
.ret-card-date{margin-left:auto;font-size:10px;color:var(--txt3);}
.ret-card-title{font-size:12px;color:var(--txt2);margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ret-card-tags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;}
.ret-tag{font-size:9px;font-weight:800;padding:2px 8px;border-radius:999px;letter-spacing:.4px;text-transform:uppercase;}
.ret-tag.refund{background:rgba(248,113,113,.12);color:var(--red2);border:1px solid rgba(248,113,113,.22);}
.ret-tag.covered{background:rgba(16,185,129,.12);color:var(--green2);border:1px solid rgba(16,185,129,.22);}
.ret-tag.open{background:rgba(251,191,36,.1);color:var(--yellow2);border:1px solid rgba(251,191,36,.2);}
.ret-tag.neutral{background:var(--bg4);color:var(--txt3);border:1px solid var(--border2);}
.ret-tag.protected{background:rgba(16,185,129,.18);color:#34d399;border:1px solid rgba(16,185,129,.35);}
.ret-costs{display:grid;grid-template-columns:repeat(3,1fr) auto;gap:8px;align-items:end;}
.ret-cost-field{display:flex;flex-direction:column;gap:3px;}
.ret-cost-label{font-size:8px;color:var(--txt3);text-transform:uppercase;font-weight:700;letter-spacing:.4px;}
.ret-cost-inp{background:var(--bg4);border:1px solid var(--border2);border-radius:8px;color:var(--txt);padding:5px 8px;font-size:12px;font-family:'Inter',sans-serif;width:100%;outline:none;transition:border-color .15s;}
.ret-cost-inp:focus{border-color:var(--p2);}
.ret-cost-total{font-size:11px;font-weight:800;color:var(--red2);text-align:right;white-space:nowrap;}
.ret-cost-total small{display:block;font-size:8px;color:var(--txt3);font-weight:600;margin-bottom:2px;}
.ret-save-btn{margin-top:10px;display:flex;align-items:center;justify-content:flex-end;gap:8px;}
.ret-empty{padding:40px;text-align:center;color:var(--txt3);font-size:13px;}
.ret-action-btn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:8px;font-size:11px;font-weight:600;font-family:'Inter',sans-serif;cursor:pointer;border:1px solid var(--border2);background:var(--bg4);color:var(--txt2);transition:all .15s;}
.ret-action-btn:hover{border-color:var(--txt3);color:var(--txt);}
.ret-action-btn.primary{background:rgba(109,40,217,.18);border-color:rgba(139,92,246,.4);color:var(--p3);}
.ret-action-btn.primary:hover{background:rgba(109,40,217,.28);border-color:var(--p2);}

/* ── RETURN DETAIL DRAWER ── */
.ret-detail-box{max-width:600px;width:100%;}
.ret-detail-section{background:var(--bg3);border:1px solid var(--border2);border-radius:12px;padding:14px;margin-bottom:12px;}
.ret-detail-section h4{font-size:10px;text-transform:uppercase;letter-spacing:.7px;color:var(--txt3);font-weight:800;margin-bottom:10px;}
.ret-detail-row{display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);}
.ret-detail-row:last-child{border-bottom:0;}
.ret-detail-row span{font-size:11px;color:var(--txt3);}
.ret-detail-row strong{font-size:12px;color:var(--txt);font-weight:600;text-align:right;max-width:60%;word-break:break-all;}
.ret-detail-cost-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.ret-detail-cost-item{background:var(--bg4);border-radius:10px;padding:10px 12px;}
.ret-detail-cost-item span{font-size:9px;text-transform:uppercase;color:var(--txt3);font-weight:700;display:block;margin-bottom:4px;}
.ret-detail-cost-item strong{font-size:15px;font-weight:800;}
.ret-detail-cost-item.danger strong{color:var(--red2);}
.ret-detail-cost-item.safe strong{color:var(--green2);}
@media(max-width:768px){
  .ret-kpis{grid-template-columns:1fr 1fr;}
  .ret-costs{grid-template-columns:1fr 1fr;gap:6px;}
  .ret-detail-cost-grid{grid-template-columns:1fr 1fr;}
}
</style>

<!-- RETURNS MODAL -->
<div id="ss-returns-modal" class="ss-modal">
  <div class="ss-box ret-modal-box">
    <div class="ss-head">
      <h3><i class="ti ti-rotate-clockwise-2" style="margin-right:6px"></i>Devoluções</h3>
      <button class="ss-close" onclick="ssCloseModal('ss-returns-modal')">×</button>
    </div>
    <div class="ss-body">
      <div class="ret-kpis">
        <div class="ret-kpi">
          <div class="ret-kpi-icon" style="background:rgba(139,92,246,.12)"><i class="ti ti-rotate-clockwise-2" style="color:var(--p3)"></i></div>
          <div class="ret-kpi-data"><span>Devoluções</span><strong id="ret-qtd">—</strong></div>
        </div>
        <div class="ret-kpi warn">
          <div class="ret-kpi-icon" style="background:rgba(251,146,60,.10)"><i class="ti ti-truck-return" style="color:var(--orange2)"></i></div>
          <div class="ret-kpi-data"><span>Frete reverso</span><strong id="ret-ship">—</strong></div>
        </div>
        <div class="ret-kpi warn">
          <div class="ret-kpi-icon" style="background:rgba(251,146,60,.10)"><i class="ti ti-receipt-tax" style="color:var(--orange2)"></i></div>
          <div class="ret-kpi-data"><span>Taxas ML</span><strong id="ret-fee">—</strong></div>
        </div>
        <div class="ret-kpi danger">
          <div class="ret-kpi-icon" style="background:rgba(248,113,113,.10)"><i class="ti ti-trending-down" style="color:var(--red2)"></i></div>
          <div class="ret-kpi-data"><span>Prejuízo total</span><strong id="ret-total">—</strong></div>
        </div>
      </div>
      <div class="ret-actions">
        <button class="ss-btn ghost" onclick="ssSyncReturns('mercadolivre')"><i class="ti ti-refresh"></i> Sincronizar ML</button>
        <button class="ss-btn ghost" onclick="ssSyncReturns('magalu')"><i class="ti ti-refresh"></i> Sincronizar Magalu</button>
        <button class="ss-btn" onclick="ssRefreshReturnsList()"><i class="ti ti-list-check"></i> Atualizar lista</button>
        <!-- v2.1 — Limpa dados antigos e re-sincroniza do zero -->
        <button class="ss-btn" style="background:rgba(239,68,68,.15);color:var(--red2);border:1px solid rgba(239,68,68,.3)" onclick="ssResetReturns('mercadolivre')" title="Apaga dados antigos e busca tudo de novo com lógica corrigida"><i class="ti ti-trash"></i> Limpar e re-sincronizar ML</button>
      </div>
      <div class="ret-search-wrap">
        <input id="ss-returns-search" class="ret-search" oninput="ssFilterReturnCards()" placeholder="Buscar por pedido, produto, motivo..."/>
        <button class="ss-btn ghost" onclick="document.getElementById('ss-returns-search').value='';ssFilterReturnCards()">Limpar</button>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
        <select id="ret-date-type" onchange="ssFilterReturnCards()" style="background:var(--bg3);border:1px solid var(--bdr);color:var(--txt1);border-radius:8px;padding:5px 10px;font-size:11px;cursor:pointer">
          <option value="order">Data do pedido</option>
          <option value="devolucao">Data de devolução</option>
          <option value="chegou">Data que chegou</option>
        </select>
        <select id="ret-filter-period" onchange="ssFilterReturnCards()" style="background:var(--bg3);border:1px solid var(--bdr);color:var(--txt1);border-radius:8px;padding:5px 10px;font-size:11px;cursor:pointer">
          <option value="mes_atual">Este mês</option>
          <option value="mes_passado">Mês passado</option>
          <option value="3m">Últimos 3 meses</option>
          <option value="6m">Últimos 6 meses</option>
          <option value="todos">Todos os períodos</option>
        </select>
        <select id="ret-sort" onchange="ssFilterReturnCards()" style="background:var(--bg3);border:1px solid var(--bdr);color:var(--txt1);border-radius:8px;padding:5px 10px;font-size:11px;cursor:pointer">
          <option value="data_desc">Mais recentes</option>
          <option value="data_asc">Mais antigas</option>
          <option value="custo_desc">Mais caras</option>
          <option value="custo_asc">Menos caras</option>
        </select>
        <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--txt3);cursor:pointer;user-select:none">
          <input type="checkbox" id="ret-show-zero" onchange="localStorage.setItem('ss_ret_show_zero',this.checked?'1':'0');ssFilterReturnCards()" style="accent-color:var(--p2);width:14px;height:14px;cursor:pointer"/>
          Exibir custo zerado
        </label>
      </div>
      <!-- v2.1 — resumo por categoria (preenchido pelo ssReturnsSummaryHtml) -->
      <div id="ret-summary"></div>
      <div id="ss-returns-cards" class="ret-cards">
        <div class="ret-empty">Clique em "Sincronizar ML" para carregar devoluções</div>
      </div>
    </div>
  </div>
</div>

<!-- RETURN DETAIL MODAL -->
<div id="ss-return-detail-modal" class="ss-modal">
  <div class="ss-box ret-detail-box">
    <div class="ss-head">
      <h3><i class="ti ti-receipt" style="margin-right:6px"></i>Detalhes da devolução</h3>
      <button class="ss-close" onclick="ssCloseModal('ss-return-detail-modal')">×</button>
    </div>
    <div class="ss-body" id="ss-return-detail-body">
    </div>
  </div>
</div>

<script>
const R_BRL=(v)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
window.SS_RETURNS_DATA=[];

// v2.1 — categorias de devolução com ícones e cores distintas
const RET_CAT_LABEL={
  nao_entregue: {icon:'🚚',label:'Não entregue',color:'#f59e0b',desc:'Entregador não encontrou / devolveu ao remetente'},
  arrependimento:{icon:'↩️',label:'Arrependimento',color:'#60a5fa',desc:'Cliente recebeu e não quis mais'},
  defeito:       {icon:'⚠️',label:'Defeito / Problema',color:'#f87171',desc:'Produto chegou com defeito ou problema'},
};
function ssReturnTagHtml(r){
  const res=String(r.resolution_type||r.reason||r.status||'').toLowerCase();
  const prot=r.ml_protected===true||r.ml_protected==='true';
  const cat=RET_CAT_LABEL[r.return_category]||null;
  const tags=[];
  // Categoria principal
  if(cat)tags.push(`<span class="ret-tag" style="background:${cat.color}22;color:${cat.color};border-color:${cat.color}44">${cat.icon} ${cat.label}</span>`);
  // ML cobre ou vendedor paga
  if(prot||res.includes('seller_protection')||res.includes('covered')){
    tags.push('<span class="ret-tag covered">✓ ML Cobriu</span>');
  } else if(res.includes('refund')||res.includes('refunded')){
    tags.push('<span class="ret-tag refund">💸 Você Reembolsou</span>');
  } else if(res.includes('open')||res.includes('claimed')){
    tags.push('<span class="ret-tag open">⏳ Em aberto</span>');
  }
  return tags.join('');
}

function ssReturnsSummaryHtml(arr){
  const cats={nao_entregue:{qtd:0,total:0},arrependimento:{qtd:0,total:0},defeito:{qtd:0,total:0}};
  let mlCobre=0,vocePaga=0;
  arr.forEach(r=>{
    const cat=r.return_category||'arrependimento';
    const total=Number(r.return_total_cost||0)||Number(r.return_shipping_cost||0)+Number(r.return_fee||0)+Number(r.lost_product_cost||0);
    if(cats[cat]){cats[cat].qtd++;cats[cat].total+=total;}
    if(r.ml_protected===true||r.ml_protected==='true'){mlCobre+=total;}else{vocePaga+=total;}
  });
  return`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
    ${Object.entries(RET_CAT_LABEL).map(([k,v])=>`
    <div style="background:var(--bg3);border:1px solid ${v.color}33;border-radius:12px;padding:12px;text-align:center">
      <div style="font-size:18px">${v.icon}</div>
      <div style="font-size:18px;font-weight:800;color:${v.color}">${cats[k].qtd}</div>
      <div style="font-size:9px;font-weight:700;color:${v.color};text-transform:uppercase;margin:2px 0">${v.label}</div>
      <div style="font-size:10px;color:var(--red2);font-weight:600">${cats[k].total>0?'-'+R_BRL(cats[k].total):'R$ 0,00'}</div>
      <div style="font-size:8px;color:var(--txt3);margin-top:2px">${v.desc}</div>
    </div>`).join('')}
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
    <div style="background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.2);border-radius:10px;padding:10px;text-align:center">
      <div style="font-size:10px;color:var(--green2);font-weight:700">✓ ML Cobriu</div>
      <div style="font-size:16px;font-weight:800;color:var(--green2)">${R_BRL(mlCobre)}</div>
      <div style="font-size:9px;color:var(--txt3)">Você não teve prejuízo</div>
    </div>
    <div style="background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.2);border-radius:10px;padding:10px;text-align:center">
      <div style="font-size:10px;color:var(--red2);font-weight:700">💸 Você Pagou</div>
      <div style="font-size:16px;font-weight:800;color:var(--red2)">${R_BRL(vocePaga)}</div>
      <div style="font-size:9px;color:var(--txt3)">Custo real absorvido</div>
    </div>
  </div>`;
}

function ssRenderReturnCards(arr){
  const wrap=document.getElementById('ss-returns-cards');
  if(!wrap)return;
  if(!arr.length){wrap.innerHTML='<div class="ret-empty">Nenhuma devolução encontrada no período.</div>';return;}
  wrap.innerHTML=arr.map((r,i)=>{
    const origIdx=window.SS_RETURNS_DATA.indexOf(r);
    const idx=origIdx>=0?origIdx:i;
    const ship=Number(r.return_shipping_cost||0);
    const fee=Number(r.return_fee||0);
    const lost=Number(r.lost_product_cost||0);
    const total=Number(r.return_total_cost||0)||(ship+fee+lost);
    const prot=r.ml_protected===true||r.ml_protected==='true';
    const dateStr=r.order_date?new Date(r.order_date).toLocaleDateString('pt-BR'):(r.updated_at?new Date(r.updated_at).toLocaleDateString('pt-BR'):'—');
    const search=[r.platform_order_id,r.item_title,r.item_sku,r.reason,r.resolution_type,r.status,r.buyer_message].join(' ').toLowerCase();
    return `<div class="ret-card" data-search="${search.replace(/"/g,'&quot;')}" data-idx="${idx}">
      <div class="ret-card-top" onclick="ssOpenReturnDetail(${idx})">
        <span class="plat-chip ${r.platform||'mercadolivre'}">${r.platform||'ML'}</span>
        <span class="ret-card-id">#${r.platform_order_id||r.external_return_id||'—'}</span>
        <span class="ret-card-date">${dateStr}</span>
      </div>
      <div class="ret-card-title" onclick="ssOpenReturnDetail(${idx})">${r.item_title||(r.raw_json?.order_items?.[0]?.item?.title)||'Produto sem título'} ${r.item_sku?'<span style="color:var(--txt3)">· '+r.item_sku+'</span>':''}</div>
      <div class="ret-card-tags" onclick="ssOpenReturnDetail(${idx})">${ssReturnTagHtml(r)}</div>
      ${prot?`<div style="font-size:10px;color:var(--green2);background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.15);border-radius:8px;padding:6px 10px;margin-bottom:8px">✓ ML cobriu o custo — você não teve prejuízo financeiro nessa devolução</div>`:''}
      ${r.total_amount>0?`<div style="font-size:10px;color:var(--txt3);margin-bottom:6px">Valor do pedido: <strong style="color:var(--txt1)">${R_BRL(r.total_amount)}</strong></div>`:''}
      <div class="ret-costs">
        <div class="ret-cost-field">
          <label class="ret-cost-label">Tarifa envios</label>
          <input class="ret-cost-inp" id="rs-${r.id}" onclick="event.stopPropagation()" value="${ship.toFixed(2)}" type="number" step="0.01" min="0"/>
        </div>
        <div class="ret-cost-field">
          <label class="ret-cost-label">Tarifa devolução</label>
          <input class="ret-cost-inp" id="rf-${r.id}" onclick="event.stopPropagation()" value="${fee.toFixed(2)}" type="number" step="0.01" min="0"/>
        </div>
        <div class="ret-cost-field">
          <label class="ret-cost-label">Produto perdido</label>
          <input class="ret-cost-inp" id="rl-${r.id}" onclick="event.stopPropagation()" value="${lost.toFixed(2)}" type="number" step="0.01" min="0"/>
        </div>
        <div class="ret-cost-total"><small>Prejuízo</small>${R_BRL(total)}</div>
      </div>
      <div class="ret-save-btn">
        <button class="ret-action-btn" onclick="event.stopPropagation();ssOpenReturnDetail(${idx})"><i class="ti ti-eye"></i> Detalhes</button>
        <button class="ret-action-btn primary" onclick="event.stopPropagation();ssSaveReturnCost(${r.id})"><i class="ti ti-device-floppy"></i> Salvar</button>
      </div>
    </div>`;
  }).join('');
}

async function ssRefreshReturnsList(){
  const wrap=document.getElementById('ss-returns-cards');
  if(wrap)wrap.innerHTML='<div class="ret-empty" style="color:var(--txt3)"><i class="ti ti-loader" style="animation:spin 1s linear infinite;display:inline-block"></i> Carregando...</div>';
  try{
    const j=await ssFetchJson(`${API}/api/returns`);
    const arr=Array.isArray(j.data)?j.data:[];
    window.SS_RETURNS_DATA=arr;
    ssFilterReturnCards();
  }catch(e){
    if(wrap)wrap.innerHTML=`<div class="ret-empty" style="color:var(--red2)">${e.message}</div>`;
  }
}

async function ssLoadReturns(){
  ssOpenModal('ss-returns-modal');
  // restaura preferência salva
  const cb=document.getElementById('ret-show-zero');
  if(cb) cb.checked=localStorage.getItem('ss_ret_show_zero')==='1';
  await ssRefreshReturnsList();
}

function ssGetReturnDate(r,type){
  const raw=r.raw_json||{};
  if(type==='devolucao'){
    // claims path: raw.date_created = data criação da claim
    // fallback path: raw.date_closed ou raw.last_updated (encerramento do pedido)
    if(r.external_return_id&&r.external_return_id.startsWith('ml-claim-')) return raw.date_created||raw.last_updated||null;
    return raw.date_closed||raw.last_updated||null;
  }
  if(type==='chegou'){
    // data_returned do shipment original ou date_delivered
    const sh=raw._shipment_history||{};
    return sh.date_returned||sh.date_delivered||null;
  }
  // default: order_date — NÃO usar updated_at (é data de sync, não do pedido)
  const raw2=r.raw_json||{};
  return r.order_date||raw2.date_created||null;
}

function ssFilterReturnCards(){
  const v=(document.getElementById('ss-returns-search')?.value||'').toLowerCase().trim();
  const showZero=document.getElementById('ret-show-zero')?.checked||false;
  const period=document.getElementById('ret-filter-period')?.value||'mes_atual';
  const sort=document.getElementById('ret-sort')?.value||'data_desc';
  const dateType=document.getElementById('ret-date-type')?.value||'order';
  const now=new Date(); const y=now.getFullYear(); const m=now.getMonth();
  const periodFrom={
    mes_atual:  new Date(y,m,1),
    mes_passado:new Date(y,m-1,1),
    '3m':       new Date(y,m-3,1),
    '6m':       new Date(y,m-6,1),
    todos:      new Date(2000,0,1)
  }[period]||new Date(2000,0,1);
  const periodTo={
    mes_passado:new Date(y,m,0,23,59,59),
  }[period]||new Date(9999,0,1);

  // filtra e ordena o array base
  let arr=window.SS_RETURNS_DATA.filter(r=>{
    const ds=ssGetReturnDate(r,dateType);
    const d=ds?new Date(ds):new Date(0);
    return d>=periodFrom&&d<=periodTo;
  });
  arr.sort((a,b)=>{
    if(sort==='data_desc')return new Date(ssGetReturnDate(b,dateType)||0)-new Date(ssGetReturnDate(a,dateType)||0);
    if(sort==='data_asc') return new Date(ssGetReturnDate(a,dateType)||0)-new Date(ssGetReturnDate(b,dateType)||0);
    const ta=Number(a.return_total_cost||0)||(Number(a.return_shipping_cost||0)+Number(a.return_fee||0));
    const tb=Number(b.return_total_cost||0)||(Number(b.return_shipping_cost||0)+Number(b.return_fee||0));
    return sort==='custo_desc'?tb-ta:ta-tb;
  });

  // re-renderiza com o subset filtrado/ordenado
  ssRenderReturnCards(arr.filter(r=>{
    const total=Number(r.return_total_cost||0)||Number(r.return_shipping_cost||0)+Number(r.return_fee||0)+Number(r.lost_product_cost||0);
    const matchSearch=[r.platform_order_id,r.item_title,r.item_sku,r.reason,r.status].join(' ').toLowerCase().includes(v);
    return matchSearch&&(!total===0||showZero||total>0);
  }));

  // atualiza KPIs com os dados filtrados
  const filt=arr;
  const ship=filt.reduce((s,r)=>s+Number(r.return_shipping_cost||0),0);
  const fee=filt.reduce((s,r)=>s+Number(r.return_fee||0),0);
  const total=filt.reduce((s,r)=>s+Number(r.return_total_cost||0)||Number(r.return_shipping_cost||0)+Number(r.return_fee||0),0);
  document.getElementById('ret-qtd').textContent=filt.length;
  document.getElementById('ret-ship').textContent=R_BRL(ship);
  document.getElementById('ret-fee').textContent=R_BRL(fee);
  document.getElementById('ret-total').textContent=R_BRL(total);
  const summaryEl=document.getElementById('ret-summary');
  if(summaryEl)summaryEl.innerHTML=ssReturnsSummaryHtml(filt);
}

async function ssOpenReturnDetail(idx){
  const r=window.SS_RETURNS_DATA[idx];
  if(!r)return;
  const body=document.getElementById('ss-return-detail-body');
  if(!body)return;
  // Abre o modal imediatamente com loading
  ssOpenModal('ss-return-detail-modal');
  body.innerHTML='<div style="text-align:center;padding:40px;color:var(--txt3)"><i class="ti ti-loader" style="animation:spin 1s linear infinite;display:inline-block;font-size:24px"></i><br><br>Carregando detalhes...</div>';
  // Busca raw_json sob demanda (não vem na listagem para economizar egress)
  if(!r.raw_json && r.id){
    try{
      const j=await ssFetchJson(`${API}/api/returns/${r.id}`);
      if(j.data){
        r.raw_json=j.data.raw_json;
        // aproveita para atualizar título/data se estavam vazios
        if(!r.item_title&&j.data.item_title) r.item_title=j.data.item_title;
        if(!r.order_date&&j.data.order_date) r.order_date=j.data.order_date;
      }
    }catch(_){}
  }
  const ship=Number(r.return_shipping_cost||0);
  const fee=Number(r.return_fee||0);
  const lost=Number(r.lost_product_cost||0);
  const total=Number(r.return_total_cost||0)||(ship+fee+lost);
  const prot=r.ml_protected===true||r.ml_protected==='true';
  // extrai dados do raw_json para detalhamento extra
  const raw=r.raw_json||{};
  const payments=Array.isArray(raw.payments)?raw.payments:[];
  const firstPay=payments[0]||{};
  const orderItems=Array.isArray(raw.order_items)?raw.order_items:[];
  const firstItem2=orderItems[0]||{};
  const saleFee=Number(firstPay.sale_fee||firstItem2.sale_fee||0);
  const transAmt=Number(firstPay.transaction_amount||raw.total_amount||r.total_amount||0);
  const refunded=Number(firstPay.transaction_amount_refunded||0);
  const shippingCostBuyer=Number(firstPay.shipping_cost||0);
  // título com fallback no raw_json
  const itemTitleFull=r.item_title||firstItem2?.item?.title||'Produto sem título';
  // imagem do produto via ALL orders
  const orderMatch=(ALL||[]).find(o=>String(o.platform_order_id||o.id)===String(r.platform_order_id));
  const imgUrl=orderMatch?.item_image||null;
  // datas
  const fmtD=s=>s?new Date(s).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';
  const fmtDT=s=>s?new Date(s).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
  const dataPedido=r.order_date||raw.date_created||null;
  // data abertura devolução
  const isClaim=r.external_return_id&&r.external_return_id.startsWith('ml-claim-');
  const dataDevolucao=isClaim?(raw.date_created||null):(raw.date_closed||raw.last_updated||null);
  // data que produto chegou de volta
  const shipHist=raw._shipment_history||{};
  const dataChegou=shipHist.date_returned||shipHist.date_delivered||null;

  body.innerHTML=`
    <div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:18px">
      ${imgUrl?`<img src="${imgUrl}" style="width:72px;height:72px;object-fit:contain;border-radius:10px;border:1px solid var(--bdr);background:var(--bg3);flex-shrink:0" onerror="this.style.display='none'">`:'<div style="width:72px;height:72px;border-radius:10px;border:1px solid var(--bdr);background:var(--bg3);display:flex;align-items:center;justify-content:center;color:var(--txt3);font-size:22px;flex-shrink:0"><i class="ti ti-package"></i></div>'}
      <div style="flex:1;min-width:0">
        <div style="font-size:15px;font-weight:800;color:var(--txt1);margin-bottom:4px;line-height:1.3">${itemTitleFull}</div>
        ${r.item_sku?`<div style="font-size:11px;color:var(--txt3);margin-bottom:4px">SKU: <strong>${r.item_sku}</strong></div>`:''}
        <div style="display:flex;gap:6px;flex-wrap:wrap">${ssReturnTagHtml(r)}<span class="plat-chip ${r.platform||''}" style="font-size:9px">${r.platform||'ML'}</span></div>
      </div>
    </div>

    <div class="ret-detail-section">
      <h4>Datas</h4>
      <div class="ret-detail-row"><span>📦 Data do pedido</span><strong>${fmtD(dataPedido)}</strong></div>
      <div class="ret-detail-row"><span>↩️ Devolução aberta</span><strong>${fmtD(dataDevolucao)}</strong></div>
      <div class="ret-detail-row"><span>🏠 Chegou ao vendedor</span><strong>${fmtDT(dataChegou)}</strong></div>
    </div>

    <div class="ret-detail-section">
      <h4>Pedido original</h4>
      <div class="ret-detail-row"><span>Nº do pedido</span><strong>#${r.platform_order_id||'—'}</strong></div>
      ${transAmt>0?`<div class="ret-detail-row"><span>Valor pago pelo comprador</span><strong>${R_BRL(transAmt)}</strong></div>`:''}
      ${shippingCostBuyer>0?`<div class="ret-detail-row"><span>Frete pago pelo comprador</span><strong>${R_BRL(shippingCostBuyer)}</strong></div>`:''}
      ${saleFee>0?`<div class="ret-detail-row"><span>Comissão ML (recebida de volta)</span><strong style="color:var(--green2)">+${R_BRL(saleFee)}</strong></div>`:''}
    </div>

    <div class="ret-detail-section">
      <h4>Devolução</h4>
      <div class="ret-detail-row"><span>Status</span><strong>${r.status||'—'}</strong></div>
      <div class="ret-detail-row"><span>Motivo</span><strong>${r.reason||'—'}</strong></div>
      ${r.return_tracking_code?`<div class="ret-detail-row"><span>Rastreio retorno</span><strong>${r.return_tracking_code}</strong></div>`:''}
      ${refunded>0?`<div class="ret-detail-row"><span>Reembolsado ao comprador</span><strong style="color:var(--red2)">-${R_BRL(refunded)}</strong></div>`:''}
      ${r.buyer_message?`<div class="ret-detail-row"><span>Mensagem do comprador</span><strong>${r.buyer_message}</strong></div>`:''}
    </div>

    <div class="ret-detail-section">
      <h4>Impacto financeiro</h4>
      ${prot?`<div style="background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);border-radius:10px;padding:10px 12px;margin-bottom:12px;font-size:11px;color:var(--green2)">✓ ML Protegeu o vendedor — custo absorvido pelo Mercado Livre</div>`:''}
      <div style="display:flex;flex-direction:column;gap:6px">
        ${ship>0?`<div style="display:flex;justify-content:space-between;padding:8px 12px;background:rgba(248,113,113,.06);border:1px solid rgba(248,113,113,.15);border-radius:8px">
          <span style="font-size:12px;color:var(--txt2)"><i class="ti ti-truck-return" style="margin-right:5px"></i>Tarifa por envios (retorno)</span>
          <strong style="color:var(--red2)">-${R_BRL(ship)}</strong>
        </div>`:''}
        ${fee>0?`<div style="display:flex;justify-content:space-between;padding:8px 12px;background:rgba(248,113,113,.06);border:1px solid rgba(248,113,113,.15);border-radius:8px">
          <span style="font-size:12px;color:var(--txt2)"><i class="ti ti-receipt-tax" style="margin-right:5px"></i>Tarifa de devolução</span>
          <strong style="color:var(--red2)">-${R_BRL(fee)}</strong>
        </div>`:''}
        ${lost>0?`<div style="display:flex;justify-content:space-between;padding:8px 12px;background:rgba(248,113,113,.06);border:1px solid rgba(248,113,113,.15);border-radius:8px">
          <span style="font-size:12px;color:var(--txt2)"><i class="ti ti-package-off" style="margin-right:5px"></i>Produto não devolvido</span>
          <strong style="color:var(--red2)">-${R_BRL(lost)}</strong>
        </div>`:''}
        <div style="display:flex;justify-content:space-between;padding:10px 12px;background:${prot?'rgba(16,185,129,.08)':'rgba(248,113,113,.1)'};border:1px solid ${prot?'rgba(16,185,129,.2)':'rgba(248,113,113,.25)'};border-radius:8px;margin-top:4px">
          <span style="font-size:13px;font-weight:700;color:var(--txt1)">Total saiu do seu bolso</span>
          <strong style="font-size:15px;color:${prot?'var(--green2)':'var(--red2)'}">${prot?'R$ 0,00':'-'+R_BRL(total)}</strong>
        </div>
      </div>
    </div>
    <div style="text-align:right;margin-top:6px">
      ${r.platform_order_id?`<a href="https://www.mercadolivre.com.br/vendas/${r.platform_order_id}/detalhe" target="_blank" class="ss-btn ghost" style="font-size:11px"><i class="ti ti-external-link"></i> Ver no ML</a>`:''}
    </div>
  `;
}

async function ssSyncReturns(platform){
  try{
    toast('Sincronizando devoluções '+platform+'...');
    await ssFetchJson(`${API}/api/returns/sync/${platform}`,{method:'POST'});
    await ssRefreshReturnsList();
    toast('Devoluções sincronizadas');
  }catch(e){toast('Erro: '+e.message)}
}

// v2.1 — limpa registros antigos (possivelmente errados) e re-sincroniza do zero
async function ssResetReturns(platform){
  if(!confirm('Isso vai apagar todos os registros de devoluções do '+platform.toUpperCase()+' salvos e buscar tudo de novo com a lógica corrigida.\n\nContinuar?'))return;
  try{
    toast('Limpando e re-sincronizando...');
    const j=await ssFetchJson(`${API}/api/returns/reset/${platform}`,{method:'POST'});
    window.SS_RETURNS_DATA=Array.isArray(j.data)?j.data:[];
    await ssRefreshReturnsList();
    toast(`✅ Removidos ${j.deleted||0} registros antigos · ${j.synced||0} devoluções reais encontradas`);
  }catch(e){toast('Erro: '+e.message)}
}

async function ssSaveReturnCost(id){
  const body={
    return_shipping_cost:parseFloat(document.getElementById('rs-'+id)?.value||0),
    return_fee:parseFloat(document.getElementById('rf-'+id)?.value||0),
    lost_product_cost:parseFloat(document.getElementById('rl-'+id)?.value||0),
    refund_adjustment:0
  };
  await ssFetchJson(`${API}/api/returns/${id}/cost`,{method:'POST',body:JSON.stringify(body)});
  await ssRefreshReturnsList();
  await loadData();
  toast('Custo salvo');
}
const ssInstallSideButtonsV21=window.ssInstallSideButtons;
window.ssInstallSideButtons=function(){
  if(typeof ssInstallSideButtonsV21==='function')ssInstallSideButtonsV21();
  const sidebar=document.getElementById('sidebar');
  if(!sidebar)return;
  // Remove Resumo e Adicionar faturamento da lateral. Agora ficam em Minha Conta.
  ['ss-side-extra','ss-side-analytics'].forEach(id=>{const el=document.getElementById(id);if(el)el.remove();});
  if(!document.getElementById('ss-side-returns')){
    const b=document.createElement('div');b.id='ss-side-returns';b.className='s-btn';
    b.innerHTML='<i class="ti ti-rotate-clockwise-2"></i><span class="s-tip">Devoluções</span>';
    b.onclick=ssLoadReturns;sidebar.insertBefore(b,sidebar.querySelector('.s-sp')||null)
  }
};
const loadAccountsMoV21=window.loadAccountsMo;
window.loadAccountsMo=async function(){
  await loadAccountsMoV21();
  // Garante que esses botões não apareçam dentro das contas de marketplace.
  document.querySelectorAll('.mp-body .ss-account-actions').forEach(el=>el.remove());
};
setTimeout(()=>{try{window.ssInstallSideButtons()}catch(e){}},700);
</script>

<script>
// ── AI ASSISTANT ──
let AI_HISTORY=[];
let AI_OPEN=false;

function ssToggleAI(){AI_OPEN?ssCloseAI():ssOpenAI();}
function ssOpenAI(){
  AI_OPEN=true;
  const panel=document.getElementById('ai-panel');
  if(panel)panel.style.transform='translateX(0)';
  const fab=document.getElementById('ai-fab');
  if(fab)fab.style.transform='scale(0.9)';
  setTimeout(()=>document.getElementById('ai-input')?.focus(),300);
}
function ssCloseAI(){
  AI_OPEN=false;
  const panel=document.getElementById('ai-panel');
  if(panel)panel.style.transform='translateX(100%)';
  const fab=document.getElementById('ai-fab');
  if(fab)fab.style.transform='';
}
function ssAISendInput(){
  const inp=document.getElementById('ai-input');
  const msg=(inp?.value||'').trim();
  if(!msg)return;
  inp.value='';inp.style.height='';
  ssAISend(msg);
}
function ssAIMarkdown(text){
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/^#{1,3} (.+)$/gm,'<strong style="color:var(--p3)">$1</strong>')
    .replace(/^[•\-] (.+)$/gm,'&nbsp;• $1')
    .replace(/\n/g,'<br>');
}
// Detecta se a mensagem pede planilha/CSV e extrai bloco CSV da resposta
const AI_SHEET_KEYWORDS=/planilha|excel|csv|exportar|exporta|tabela|relatório|listar pedidos|todos os pedidos|gera.*pedidos/i;

function ssAIExtractCSV(text){
  const m=text.match(/```csv\n?([\s\S]+?)```/i)||text.match(/```\n?([\s\S]+?)```/i);
  return m?m[1].trim():null;
}

function ssAIDownloadCSV(csv,name='salassync-export.csv'){
  const bom='﻿'; // BOM para Excel reconhecer UTF-8
  const blob=new Blob([bom+csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=name;a.click();
  URL.revokeObjectURL(url);
}

function ssAIRenderResponse(reply){
  const csv=ssAIExtractCSV(reply);
  // Remove bloco CSV do texto visível para não poluir o chat
  const cleanText=reply.replace(/```csv[\s\S]+?```/gi,'').replace(/```[\s\S]+?```/gi,'').trim();
  let html=ssAIMarkdown(cleanText||'Planilha gerada com sucesso!');
  if(csv){
    const lines=csv.split('\n').filter(Boolean);
    const rows=lines.length-1; // descontando header
    const ts=new Date().toLocaleDateString('pt-BR').replace(/\//g,'-');
    html+=`<div style="margin-top:10px;padding:10px;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.2);border-radius:10px;">
      <div style="font-size:10px;color:var(--green2);font-weight:700;margin-bottom:6px">✅ Planilha pronta — ${rows} linha${rows!==1?'s':''}</div>
      <button onclick="ssAIDownloadCSV(${JSON.stringify(csv)},'SalesSync-${ts}.csv')"
        style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:var(--green);border:none;border-radius:8px;color:#fff;font-size:11px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;">
        <i class="ti ti-download"></i> Baixar planilha CSV
      </button>
    </div>`;
  }
  return html;
}

/* ── AI: manipulação de rendimentos extras ── */
// Intenção: ADICIONAR
const AI_ADD_RE=/\b(?:adicion|coloc|inserir?|criar?|registr|lanc[ae]r?|bota|boto|coloc[ae]i|add)\b.{0,40}\b(?:fat|receitas?|rendimentos?|valor|rend|dinheiro|entrada|venda\s+extra|faturamento)\b|\b(?:adicion|add)\b.{0,20}\b\d|\b(?:fat|receitas?|rendimentos?|faturamento|entrada)\b.{0,20}\b(?:de\s+R?\$?\s*[\d]|para\s+\w|em\s+\w)/i;
// Intenção: REMOVER
const AI_DEL_RE=/\b(?:remov|delet|exclu|apage?|tira|cancela|apago|tiro|tira|remove|deleta|exclui)\b.{0,40}\b(?:fat|receita|rendimento|rend|valor|entrada|faturamento)\b|\b(?:fat|receita|rendimento|faturamento)\b.{0,30}\b(?:remov|delet|exclu|apag|tir)\b/i;
// Intenção: EDITAR
const AI_EDIT_RE=/\b(?:edit|alter|mud|atualiz|modific|corrig|troc)\b.{0,40}\b(?:fat|receita|rendimento|rend|valor|entrada|faturamento)\b|\b(?:fat|receita|rendimento|faturamento)\b.{0,30}\b(?:edit|alter|mud|atualiz)\b/i;
// Intenção: LISTAR
const AI_LIST_RE=/\b(?:lista?r?|mostra?r?|ve[jr]|quais?|quantos?|tem\s+algum|quero\s+ver|me\s+(?:mostr|list|fal))\b.{0,30}\b(?:fat|receitas?|rendimentos?|faturamentos?\s*extra|rend\b)/i;

const brlFmt=v=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

/* Busca lista de rendimentos do usuário — usa endpoint sem filtro de mês */
async function ssAIFetchRevenues(onlyCurrentMonth=false){
  try{
    const j=await ssFetchJson(`${API}/api/additional-revenues/all`);
    let items=Array.isArray(j.items)?j.items:Array.isArray(j)?j:[];
    if(onlyCurrentMonth){
      const now=new Date();
      const ym=now.getFullYear()*100+now.getMonth(); // ex: 202506
      items=items.filter(r=>{
        if(!r.starts_at)return true;
        const d=new Date(r.starts_at);
        return d.getFullYear()*100+d.getMonth()===ym;
      });
    }
    return items;
  }catch(e){
    console.warn('ssAIFetchRevenues error:',e.message);
    return[];
  }
}

/* Executa ação confirmada */
async function ssAIExecuteAction(actionJson,confirmId){
  const action=typeof actionJson==='string'?JSON.parse(actionJson):actionJson;
  const el=document.getElementById(confirmId);
  const ok=msg=>{if(el)el.innerHTML=`<div style="padding:10px 12px;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.2);border-radius:8px;color:var(--green2);font-size:11px;font-weight:600;">${msg}</div>`;loadData();};
  const err=msg=>{if(el)el.innerHTML=`<div style="padding:8px 12px;background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.2);border-radius:8px;color:var(--red2);font-size:11px;">❌ ${msg}</div>`;console.error('ssAIExecuteAction erro:',msg);};
  try{
    if(action.type==='add_revenue'){
      if(!action.name||!action.amount||action.amount<=0){err('Nome ou valor inválido: "'+action.name+'" / '+action.amount);return;}
      const today=new Date().toLocaleDateString('en-CA'); // yyyy-mm-dd no timezone local
      const r=await ssFetchJson(`${API}/api/additional-revenues`,{method:'POST',body:JSON.stringify({name:action.name,amount:Number(action.amount),recurring:false,starts_at:today})});
      console.log('Rendimento criado:',r);
      ok(`✅ Rendimento <strong>"${action.name}"</strong> de <strong>${brlFmt(action.amount)}</strong> adicionado! Já aparece no seu DRE.`);
    }else if(action.type==='del_revenue'){
      await ssFetchJson(`${API}/api/additional-revenues/${action.id}`,{method:'DELETE'});
      ok(`✅ Rendimento <strong>"${action.name}"</strong> removido com sucesso.`);
    }else if(action.type==='edit_revenue'){
      const body={};
      if(action.name)body.name=action.name;
      if(action.amount)body.amount=action.amount;
      await ssFetchJson(`${API}/api/additional-revenues/${action.id}`,{method:'PATCH',body:JSON.stringify(body)});
      ok(`✅ Rendimento atualizado para <strong>"${action.name||'—'}"</strong> — <strong>${brlFmt(action.amount||0)}</strong>.`);
    }
  }catch(e){err(e.message);}
}

/* Card visual de confirmação */
function ssAIConfirmCard(action,label,details){
  const id='ai-ac-'+Date.now();
  const safe=encodeURIComponent(JSON.stringify(action));
  const colorMap={add_revenue:'109,40,217',del_revenue:'220,38,38',edit_revenue:'14,165,233'};
  const c=colorMap[action.type]||'109,40,217';
  return `<div id="${id}" style="margin-top:8px"><div style="background:rgba(${c},.08);border:1px solid rgba(${c},.3);border-radius:10px;padding:12px;">
    <div style="font-size:10px;color:rgba(${c},1);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">${label}</div>
    <div style="font-size:11px;color:var(--txt3);line-height:1.6">${details}</div>
    <div style="display:flex;gap:6px;margin-top:10px">
      <button onclick="ssAIExecuteAction(decodeURIComponent('${safe}'),'${id}')" style="flex:1;padding:7px;background:linear-gradient(135deg,var(--p),var(--p2));border:none;border-radius:7px;color:#fff;font-size:11px;font-weight:700;cursor:pointer;">✅ Confirmar</button>
      <button onclick="document.getElementById('${id}').remove()" style="padding:7px 12px;background:transparent;border:1px solid var(--border2);border-radius:7px;color:var(--txt3);font-size:11px;cursor:pointer;">✖ Cancelar</button>
    </div>
  </div></div>`;
}

/* Renderiza lista de rendimentos no chat */
function ssAIRevenueListCard(items){
  if(!items.length)return`<div style="padding:10px;color:var(--txt3);font-size:11px">Nenhum rendimento extra cadastrado ainda.</div>`;
  return`<div style="margin-top:8px;display:flex;flex-direction:column;gap:6px;">${items.map(r=>`
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--txt)">${r.name}</div>
        <div style="font-size:10px;color:var(--green2);font-weight:700">${brlFmt(r.amount)}</div>
        <div style="font-size:9px;color:var(--txt3)">${r.recurring?'Recorrente':'Único'} · ${r.starts_at?.slice(0,7)||'—'}</div>
      </div>
      <div style="display:flex;gap:4px;">
        <button onclick="ssAIStartEdit(${r.id},'${r.name.replace(/'/g,'&#39;')}',${r.amount})" style="padding:4px 8px;background:rgba(14,165,233,.12);border:1px solid rgba(14,165,233,.2);border-radius:6px;color:#38bdf8;font-size:10px;cursor:pointer;">✏️</button>
        <button onclick="ssAIStartDelete(${r.id},'${r.name.replace(/'/g,'&#39;')}')" style="padding:4px 8px;background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.2);border-radius:6px;color:var(--red2);font-size:10px;cursor:pointer;">🗑️</button>
      </div>
    </div>`).join('')}</div>`;
}

/* Botão editar inline */
/* Despacha ação quando usuário escolhe na lista de candidatos */
function ssAIHandleWhich(actionJson){
  const action=JSON.parse(actionJson);
  const box=document.getElementById('ai-messages');
  if(action.type==='del_revenue'){
    box.innerHTML+=`<div class="ai-msg bot"><div class="ai-bubble bot">
      É esse que você quer remover?
      ${ssAIConfirmCard(action,'🗑️ Remover rendimento',`Nome: <strong>${action.name}</strong>`)}
    </div></div>`;
    box.scrollTop=box.scrollHeight;
  }else if(action.type==='start_edit'){
    ssAIStartEdit(action.id,action.name,action.amount);
  }
}

function ssAIStartEdit(id,name,amount){
  const box=document.getElementById('ai-messages');
  const editId='aied'+Date.now();
  const html=`<div class="ai-msg bot"><div class="ai-bubble bot">
    <div style="font-size:10px;color:var(--p3);font-weight:700;margin-bottom:8px">✏️ Editar rendimento</div>
    <div style="display:flex;flex-direction:column;gap:6px;">
      <input id="${editId}-name" value="${name}" style="background:var(--bg4);border:1px solid var(--border2);border-radius:7px;padding:7px 10px;color:var(--txt);font-size:11px;outline:none;" placeholder="Nome"/>
      <input id="${editId}-amt" value="${amount}" type="number" step="0.01" style="background:var(--bg4);border:1px solid var(--border2);border-radius:7px;padding:7px 10px;color:var(--txt);font-size:11px;outline:none;" placeholder="Valor R$"/>
      <div style="display:flex;gap:6px;margin-top:4px">
        <button onclick="ssAIConfirmEdit(${id},'${editId}')" style="flex:1;padding:7px;background:linear-gradient(135deg,var(--p),var(--p2));border:none;border-radius:7px;color:#fff;font-size:11px;font-weight:700;cursor:pointer;">✅ Salvar</button>
      </div>
    </div>
  </div></div>`;
  box.innerHTML+=html;
  box.scrollTop=box.scrollHeight;
}
async function ssAIConfirmEdit(id,editId){
  const name=document.getElementById(editId+'-name')?.value?.trim();
  const amount=parseFloat(document.getElementById(editId+'-amt')?.value||0);
  if(!name||!amount)return;
  try{
    await ssFetchJson(`${API}/api/additional-revenues/${id}`,{method:'PATCH',body:JSON.stringify({name,amount})});
    const box=document.getElementById('ai-messages');
    box.innerHTML+=`<div class="ai-msg bot"><div class="ai-bubble bot"><div style="padding:8px 12px;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.2);border-radius:8px;color:var(--green2);font-size:11px;font-weight:600;">✅ Rendimento atualizado para <strong>"${name}"</strong> — <strong>${brlFmt(amount)}</strong>.</div></div></div>`;
    box.scrollTop=box.scrollHeight;
    loadData();
  }catch(e){toast('Erro: '+e.message);}
}
function ssAIStartDelete(id,name){
  const box=document.getElementById('ai-messages');
  const action={type:'del_revenue',id,name};
  box.innerHTML+=`<div class="ai-msg bot"><div class="ai-bubble bot">
    Confirma a remoção do rendimento <strong>"${name}"</strong>?
    ${ssAIConfirmCard(action,'🗑️ Remover rendimento',`Nome: <strong>${name}</strong>`)}
  </div></div>`;
  box.scrollTop=box.scrollHeight;
}

/* ── Fuzzy match: retorna itens ordenados por similaridade ── */
function ssAIFuzzyMatch(items, query){
  if(!query||!query.trim())return[];
  // Tokeniza a query em palavras significativas (>= 2 chars)
  const tokens=query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
    .split(/\s+/).filter(w=>w.length>=2);
  if(!tokens.length)return[];
  return items.map(r=>{
    const name=r.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    // Score: quantos tokens batem no nome
    const score=tokens.reduce((s,t)=>s+(name.includes(t)?1:0),0);
    return{...r,score};
  }).filter(r=>r.score>0).sort((a,b)=>b.score-a.score);
}

/* Extrai o "nome mencionado" da mensagem removendo palavras-chave comuns */
function ssAIExtractNameQuery(msg){
  return msg
    .replace(AI_ADD_RE,'').replace(AI_DEL_RE,'').replace(AI_EDIT_RE,'').replace(AI_LIST_RE,'')
    .replace(/\b(?:o|a|os|as|um|uma|esse|essa|aquele|aquela|meu|minha|de|do|da|para|pra|com|em|por|que|qual|no|na)\b/gi,' ')
    .replace(/R?\$\s*[\d.,]+/g,' ')
    .replace(/\s{2,}/g,' ').trim();
}

/* Detecta intenção e retorna ação ou null */
async function ssAIParseAction(message){
  const isAdd =AI_ADD_RE.test(message);
  const isDel =AI_DEL_RE.test(message);
  const isEdit=AI_EDIT_RE.test(message);
  const isList=AI_LIST_RE.test(message);

  if(!isAdd&&!isDel&&!isEdit&&!isList)return null;

  // LISTAR — só mês atual
  if(isList&&!isDel&&!isEdit&&!isAdd){
    const items=await ssAIFetchRevenues(true); // true = só mês atual
    return{type:'list_revenue',items};
  }

  // ADICIONAR
  if(isAdd&&!isDel&&!isEdit){
    // Extrai valor
    const amtM=/R?\$?\s*([\d]+(?:[.,][\d]{1,2})?)/i.exec(
      message.replace(/\b(?:adicion|coloc|inserir?|criar?|registr|lançar?|bota|add)\b/i,''));
    const rawAmt=amtM?String(amtM[1]).replace(/\./g,'').replace(',','.'):null;
    const amount=parseFloat(rawAmt||'');
    // Extrai nome: procura "em/para/pra/chamado" + nome na mensagem original
    const nameM=/\b(?:em|para|pra|chamad[ao]|chamado)\s+([A-Za-záéíóúâêîôûãõàèìòùçÁÉÍÓÚÂÊÎÔÛÃÕÀÈÌÒÙÇ][^0-9\n,;]{1,60}?)(?:\s+(?:de|R\$|\d|com\s+val)|[,;.]|$)/i
      .exec(message);
    // fallback: remove palavras-chave e valor, pega o que sobrou
    let name='Rendimento extra';
    if(nameM){
      name=nameM[1].replace(/\b(?:o|a|os|as|um|uma|meu|minha|esse|essa)\b/gi,' ').replace(/\s{2,}/g,' ').trim();
    }else{
      const stripped=message
        .replace(/\b(?:adicion|adicione|coloca|inserir?|criar?|registr|lançar?|bota|add)\b/gi,' ')
        .replace(/\b(?:receita|rendimento|rendimentos|faturamento|entrada|valor|rend|fat)\b/gi,' ')
        .replace(/\b(?:de|do|da|em|no|na|para|pra|com|ao|um|uma|o|a)\b/gi,' ')
        .replace(/R?\$?\s*[\d.,]+/g,' ')
        .replace(/\s{2,}/g,' ').trim();
      if(stripped.length>=2)name=stripped;
    }
    name=name.slice(0,80);
    if(amount>0)return{type:'add_revenue',name,amount};
    // Valor não encontrado — pede confirmação de qual valor
    return{type:'add_revenue_ask',name};
  }

  // REMOVER ou EDITAR — precisa de busca fuzzy
  const items=await ssAIFetchRevenues();
  const label=isDel?'remover':'editar';
  if(!items.length)return{type:'list_revenue',items,msg:`Você ainda não tem rendimentos cadastrados para ${label}.`};

  const query=ssAIExtractNameQuery(message);
  const matches=ssAIFuzzyMatch(items,query);

  // Match perfeito (único com score alto)
  if(matches.length===1||(matches.length>0&&matches[0].score>=2&&(!matches[1]||matches[0].score>matches[1].score))){
    const r=matches[0];
    if(isDel)return{type:'del_revenue_confirm',id:r.id,name:r.name};
    if(isEdit)return{type:'start_edit',id:r.id,name:r.name,amount:r.amount};
  }

  // Vários candidatos — pergunta qual é
  if(matches.length>0){
    return{type:'ask_which',action:isDel?'del':'edit',items:matches.slice(0,5),query};
  }

  // Sem match — mostra a lista completa
  return{type:'list_revenue',items,msg:`Não encontrei nenhum rendimento com esse nome. Qual desses você quer ${label}?`};
}

async function ssAISend(message){
  const box=document.getElementById('ai-messages');
  if(!box)return;
  const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
  box.innerHTML+=`<div class="ai-msg user"><div class="ai-bubble user">${esc(message)}</div></div>`;
  const typingId='ait'+Date.now();

  // Detecta se é uma ação de manipular dados ANTES de chamar a IA
  const directAction=await ssAIParseAction(message);
  if(directAction){
    const box2=document.getElementById('ai-messages');
    const T=directAction.type;

    if(T==='list_revenue'){
      box2.innerHTML+=`<div class="ai-msg bot"><div class="ai-bubble bot">
        ${directAction.msg||'Seus rendimentos extras cadastrados:'}
        ${ssAIRevenueListCard(directAction.items)}
      </div></div>`;

    }else if(T==='add_revenue'){
      box2.innerHTML+=`<div class="ai-msg bot"><div class="ai-bubble bot">
        Confirme os dados:
        ${ssAIConfirmCard(directAction,'💰 Adicionar rendimento',
          `Nome: <strong>${directAction.name}</strong><br>Valor: <strong style="color:var(--green2)">${brlFmt(directAction.amount)}</strong>`)}
      </div></div>`;

    }else if(T==='add_revenue_ask'){
      box2.innerHTML+=`<div class="ai-msg bot"><div class="ai-bubble bot">
        Qual o valor do rendimento <strong>"${directAction.name}"</strong>? Me diga o valor em reais (ex: R$ 500).
      </div></div>`;

    }else if(T==='del_revenue_confirm'){
      box2.innerHTML+=`<div class="ai-msg bot"><div class="ai-bubble bot">
        É esse que você quer remover?
        ${ssAIConfirmCard({type:'del_revenue',id:directAction.id,name:directAction.name},'🗑️ Remover rendimento',
          `Nome: <strong>${directAction.name}</strong>`)}
      </div></div>`;

    }else if(T==='start_edit'){
      ssAIStartEdit(directAction.id,directAction.name,directAction.amount);

    }else if(T==='ask_which'){
      /* Vários candidatos: mostra mini-lista com botão de ação */
      const actLabel=directAction.action==='del'?'Remover':'Editar';
      const cards=directAction.items.map(r=>{
        const actionObj=directAction.action==='del'
          ?{type:'del_revenue',id:r.id,name:r.name}
          :{type:'start_edit',id:r.id,name:r.name,amount:r.amount};
        const safe=encodeURIComponent(JSON.stringify(actionObj));
        return`<div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:8px 12px;gap:8px;">
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--txt)">${r.name}</div>
            <div style="font-size:10px;color:var(--green2)">${brlFmt(r.amount)}</div>
          </div>
          <button onclick="ssAIHandleWhich(decodeURIComponent('${safe}'))" style="padding:4px 10px;background:linear-gradient(135deg,var(--p),var(--p2));border:none;border-radius:6px;color:#fff;font-size:10px;font-weight:700;cursor:pointer;">${actLabel}</button>
        </div>`;
      }).join('');
      box2.innerHTML+=`<div class="ai-msg bot"><div class="ai-bubble bot">
        Encontrei mais de um. Qual desses você quis dizer?
        <div style="display:flex;flex-direction:column;gap:5px;margin-top:8px">${cards}</div>
      </div></div>`;
    }

    box2.scrollTop=box2.scrollHeight;
    return;
  }

  // Verifica se precisa dos dados da página
  const needsData=AI_SHEET_KEYWORDS.test(message);
  const pageData=needsData?(typeof FILTERED!=='undefined'?FILTERED:typeof ALL!=='undefined'?ALL:[]):null;

  box.innerHTML+=`<div class="ai-msg bot" id="${typingId}"><div class="ai-bubble bot typing">${needsData?'📊 Lendo os dados da tela...':'⏳ Analisando seus dados...'}</div></div>`;
  box.scrollTop=box.scrollHeight;

  const btn=document.getElementById('ai-send-btn');
  const inp=document.getElementById('ai-input');
  if(btn)btn.disabled=true;
  if(inp)inp.disabled=true;

  try{
    const body={message,history:AI_HISTORY,period_days:typeof PERIOD!=='undefined'?PERIOD:30};
    if(pageData&&pageData.length)body.page_data=pageData;

    const j=await ssFetchJson(`${API}/api/ai/chat`,{method:'POST',body:JSON.stringify(body)});
    document.getElementById(typingId)?.remove();
    const reply=j.reply||j.error||'Sem resposta.';
    AI_HISTORY.push({role:'user',content:message},{role:'assistant',content:reply});
    if(AI_HISTORY.length>20)AI_HISTORY=AI_HISTORY.slice(-20);
    box.innerHTML+=`<div class="ai-msg bot"><div class="ai-bubble bot">${ssAIRenderResponse(reply)}</div></div>`;
  }catch(e){
    document.getElementById(typingId)?.remove();
    box.innerHTML+=`<div class="ai-msg bot"><div class="ai-bubble bot" style="color:var(--red2)">Erro: ${e.message}</div></div>`;
  }finally{
    if(btn)btn.disabled=false;
    if(inp){inp.disabled=false;inp.focus();}
    box.scrollTop=box.scrollHeight;
  }
}
// FAB aparece ao logar
const _aiOrigShow=window.showApp;
window.showApp=function(...a){
  if(typeof _aiOrigShow==='function')_aiOrigShow(...a);
  const fab=document.getElementById('ai-fab');
  if(fab)fab.style.display='flex';
};
// Botão na sidebar
const _aiSideOrig=window.ssInstallSideButtons;
window.ssInstallSideButtons=function(){
  if(typeof _aiSideOrig==='function')_aiSideOrig();
  const sidebar=document.getElementById('sidebar');
  if(!sidebar||document.getElementById('ss-side-ai'))return;
  const b=document.createElement('div');
  b.id='ss-side-ai';b.className='s-btn';
  b.innerHTML='<span style="font-size:18px">🤖</span><span class="s-tip">Assistente IA</span>';
  b.onclick=ssToggleAI;
  sidebar.insertBefore(b,sidebar.querySelector('.s-sp')||null);
};
setTimeout(()=>{try{window.ssInstallSideButtons()}catch(e){}},1000);
/* ══════════════════════════════════════════
   DAILY BRIEF — popup de resumo diário
══════════════════════════════════════════ */
const SS_DAILY_MSGS=[
  "Consistência bate talento todo dia. Hoje é dia de superar ontem! 🔥",
  "Cada pedido que entra é um passo mais perto da meta. Vai lá! 💰",
  "O mercado não para — e você também não! Foco total no faturamento! 🎯",
  "Quem vende com constância constrói um negócio de verdade. Bora! ✨",
  "Meta na parede, olho no cliente, mão na massa. Hoje é o dia! 🚀",
  "Um dia ruim de vendas não define o mês. Hoje você vira o jogo! 💪",
  "Cada notificação de pedido é dinheiro entrando. Bora bombar! 🛒",
  "A diferença entre sonho e realidade é a ação. Vai vender! ⚡",
  "Seu concorrente não descansa — mas você vende melhor! 😎",
  "Números de ontem são combustível pro hoje. Até onde chegamos? 📈",
  "Pequenas vendas todos os dias fazem grandes meses. Continua! 🏆",
  "Cada produto enviado é uma promessa cumprida. Orgulho de faturar! 🎉",
];

async function ssDailyBrief(){
  if(window.innerWidth<768)return; // só desktop
  const today=localDateStr(new Date());
  const key='ss_brief_'+(USER?.id||'x');
  if(localStorage.getItem(key)===today)return;
  try{
    const y=new Date();y.setDate(y.getDate()-1);
    const yd=localDateStr(y);
    const{data}=await api(`/api/orders?date_from=${yd}&date_to=${yd}`);
    const brl=v=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    const paid=(data||[]).filter(o=>o.status!=='cancelled'&&o.status!=='pending');
    const can=(data||[]).filter(o=>o.status==='cancelled');
    const fat=paid.reduce((s,o)=>s+parseFloat(o.paid_amount||o.total_amount||0),0);
    const luc=paid.reduce((s,o)=>s+parseFloat(o.profit||0),0);
    // Saudação
    const hora=new Date().getHours();
    const saudacao=hora<12?'Bom dia':hora<18?'Boa tarde':'Boa noite';
    const emoji=hora<12?'☀️':hora<18?'🌤️':'🌙';
    const nome=(USER?.name||'').split(' ')[0]||'parceiro';
    // Data de ontem
    const dias=['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
    const meses=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    const dateLabel=`Resumo de ontem — ${dias[y.getDay()]}, ${String(y.getDate()).padStart(2,'0')} de ${meses[y.getMonth()]}`;
    // Mensagem aleatória
    const msg=SS_DAILY_MSGS[Math.floor(Math.random()*SS_DAILY_MSGS.length)];
    // Preenche
    const el=id=>document.getElementById(id);
    el('db-greeting').textContent=`${saudacao}, ${nome}! ${emoji}`;
    el('db-date-str').textContent=dateLabel;
    el('db-fat').textContent=brl(fat);
    el('db-luc').textContent=brl(luc);
    el('db-luc').style.color=luc>=0?'#34d399':'#f87171';
    el('db-ped').textContent=paid.length;
    el('db-can').textContent=can.length>0?`${can.length} cancelado${can.length>1?'s':''} ontem`:'';
    el('db-quote').textContent=`"${msg}"`;
    // Exibe overlay
    el('daily-brief-overlay').style.display='flex';
  }catch(e){}
}

function ssDailyBriefClose(){
  const key='ss_brief_'+(USER?.id||'x');
  localStorage.setItem(key,localDateStr(new Date()));
  const ov=document.getElementById('daily-brief-overlay');
  ov.style.transition='opacity .35s ease';
  ov.style.opacity='0';
  setTimeout(()=>{ov.style.display='none';ov.style.opacity='1';ov.style.transition='';},370);
}

// Auto-resize textarea
document.addEventListener('DOMContentLoaded',()=>{
  const ta=document.getElementById('ai-input');
  if(ta)ta.addEventListener('input',function(){this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px';});
});
</script>

<!-- ═══ DAILY BRIEF POPUP ═══ -->
<div id="daily-brief-overlay">
  <div id="daily-brief-card">
    <div class="db-greeting" id="db-greeting">Bom dia! ☀️</div>
    <span class="db-date-str" id="db-date-str">Resumo de ontem</span>

    <div class="db-fat-label">Faturamento de ontem</div>
    <div class="db-fat-val" id="db-fat">—</div>

    <div class="db-secondary">
      <div class="db-sec-item">
        <div class="db-sec-label">Lucro líquido</div>
        <div class="db-sec-val" id="db-luc" style="color:#34d399">—</div>
      </div>
      <div class="db-sec-item">
        <div class="db-sec-label">Pedidos pagos</div>
        <div class="db-sec-val" id="db-ped" style="color:#a78bfa">—</div>
        <div class="db-sec-sub" id="db-can"></div>
      </div>
    </div>

    <div class="db-quote-wrap">
      <div class="db-quote" id="db-quote">"Carregando mensagem..."</div>
    </div>

    <button class="db-cta-btn" onclick="ssDailyBriefClose()">🚀 Vamos faturar hoje!</button>
  </div>
</div>

</body>
</html>
