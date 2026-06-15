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
/* LIGHT MODE */
body.light-mode{
  --bg:#f0f4f8;--bg2:#ffffff;--bg3:#e8edf5;--bg4:#dde4f0;--bg5:#cdd6e8;
  --txt:#0f172a;--txt2:#334155;--txt3:#64748b;--txt4:#e2e8f0;
  --border:rgba(15,23,42,.08);--border2:rgba(15,23,42,.14);
  --glow:rgba(109,40,217,.2);
}
body.light-mode html,body.light-mode body{background:var(--bg);color:var(--txt);}
/* Badge estoque baixo */
.stock-alert-badge{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#dc2626,#ea580c);color:#fff;border-radius:14px;padding:10px 20px;font-size:13px;font-weight:700;display:flex;align-items:center;gap:10px;box-shadow:0 8px 32px rgba(220,38,38,.4);z-index:3000;animation:slideUp .4s ease;cursor:pointer;}
@keyframes slideUp{from{transform:translateX(-50%) translateY(20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
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
.prod-item{background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:5px 7px;display:flex;align-items:center;gap:6px;cursor:pointer;transition:all .2s;min-width:0;}
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
    <div class="t-metric"><span>Lucro</span><strong id="tb-luc" style="color:var(--green2)">—</strong></div>
    <div class="t-div"></div>
    <div class="t-metric" onclick="ssOpenExtraRevenue()" style="cursor:pointer;opacity:.85;transition:opacity .15s" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity='.85'" title="Clique para gerenciar rendimentos extras">
      <span>Rendimentos extras</span>
      <strong id="tb-addrev" style="color:var(--green2)">—</strong>
    </div>
    <div class="t-r">
      <div class="t-chip" onclick="openMo('mo-mp')"><span class="online"></span><span id="tb-user">—</span></div>
      <div class="t-btn" onclick="window.open(API+'/debug/magalu-expedicao?token='+encodeURIComponent(TOKEN),'_blank')" title="Debug Magalu Expedição"><i class="ti ti-truck-delivery"></i></div>
      <div class="t-btn" onclick="window.open(API+'/debug/shopee?token='+encodeURIComponent(TOKEN)+'&days=30','_blank')" title="Debug Shopee"><i class="ti ti-brand-shopee" style="color:#EE4D2D"></i></div>
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
    <div class="s-btn" onclick="openMo('mo-estoque')"><i class="ti ti-package"></i><span class="s-tip">Estoque</span></div>
    <div class="s-btn" onclick="openMo('mo-nf')"><i class="ti ti-file-invoice"></i><span class="s-tip">Emissão de NF</span></div>
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

<div class="mo" id="mo-acc" onclick="closeBg(event,'mo-acc')">
  <div class="md" style="max-width:380px;"><div class="mh"><div class="mh-left"><div class="mh-ico"><i class="ti ti-user-circle"></i></div><div><div class="mh-title">Minha Conta</div></div></div><div class="mh-close" onclick="closeMo('mo-acc')"><i class="ti ti-x"></i></div></div>
  <div class="mb">
    <div style="display:flex;align-items:center;gap:14px;background:var(--bg3);border:1px solid var(--border2);border-radius:14px;padding:14px 16px;">
      <div style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,var(--p),var(--p2));display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;box-shadow:0 4px 16px var(--glow);" id="acc-ava">?</div>
      <div><div style="font-size:15px;font-weight:700;" id="acc-name">—</div><div style="font-size:11px;color:var(--txt3);margin-top:2px;" id="acc-email">—</div>
        <div style="margin-top:6px;"><span style="background:rgba(109,40,217,.15);color:var(--p3);font-size:9px;font-weight:700;padding:2px 9px;border-radius:20px;border:1px solid rgba(109,40,217,.25);" id="acc-plan">—</span></div>
      </div>
    </div>
    <button class="btn primary" onclick="ssOpenGoalSettings()"><i class="ti ti-target-arrow"></i> Meta de faturamento</button>
    <div class="ss-account-main-actions">
      <button class="btn ghost" onclick="ssOpenAnalytics()"><i class="ti ti-chart-bar"></i> Resumo</button>
      <button class="btn ghost" onclick="ssOpenExtraRevenue()"><i class="ti ti-plus"></i> Adicionar faturamento</button>
    </div>

    <!-- CUSTOS POR SKU -->
    <div onclick="closeMo('mo-acc');openMo('mo-cst')" style="display:flex;align-items:center;justify-content:space-between;background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:10px 14px;cursor:pointer;transition:border-color .2s;" onmouseover="this.style.borderColor='var(--p2)'" onmouseout="this.style.borderColor='var(--border2)'">
      <div style="display:flex;align-items:center;gap:10px;">
        <i class="ti ti-building-bank" style="font-size:18px;color:var(--p3)"></i>
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--txt1)">Custos por SKU</div>
          <div style="font-size:10px;color:var(--txt3);margin-top:1px">Imposto, tarifa e custo por produto</div>
        </div>
      </div>
      <i class="ti ti-chevron-right" style="color:var(--txt3);font-size:14px"></i>
    </div>

    <!-- CERTIFICADO DIGITAL -->
    <label style="display:flex;align-items:center;gap:10px;background:rgba(2,132,199,.07);border:1px solid rgba(2,132,199,.2);border-radius:10px;padding:12px 14px;cursor:pointer;transition:border-color .2s" onmouseover="this.style.borderColor='#38bdf8'" onmouseout="this.style.borderColor='rgba(2,132,199,.2)'">
      <div style="width:36px;height:36px;border-radius:9px;background:rgba(2,132,199,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="ti ti-certificate" style="font-size:18px;color:var(--blue2)"></i></div>
      <div style="flex:1">
        <div style="font-size:12px;font-weight:700;color:var(--txt1)">Certificado Digital A1</div>
        <div style="font-size:10px;color:var(--txt3);margin-top:1px" id="acc-cert-info">Clique para enviar seu .pfx</div>
      </div>
      <i class="ti ti-upload" style="color:var(--blue2);font-size:16px"></i>
      <input type="file" accept=".pfx,.p12" style="display:none" onchange="accUploadCert(this)"/>
    </label>

    <!-- MODO DIA/NOITE -->
    <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:10px 14px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <i class="ti ti-sun" id="theme-icon" style="font-size:18px;color:#f59e0b"></i>
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--txt1)" id="theme-label">Modo claro</div>
          <div style="font-size:10px;color:var(--txt3);margin-top:1px">Alternar tema escuro / claro</div>
        </div>
      </div>
      <div onclick="toggleTheme()" id="theme-toggle-btn" style="width:40px;height:22px;border-radius:11px;background:var(--bg4);border:1px solid var(--border2);cursor:pointer;position:relative;transition:background .2s;flex-shrink:0;">
        <div id="theme-toggle-knob" style="width:16px;height:16px;border-radius:50%;background:var(--txt3);position:absolute;top:2px;left:2px;transition:all .2s;"></div>
      </div>
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
    <button class="btn ghost" onclick="doLogout()"><i class="ti ti-logout"></i> Sair da conta</button>
  </div></div>
</div>

<script>
// SalesSync v2.8
const API='https://salesync-backend.onrender.com';
let TOKEN=localStorage.getItem('ss_token')||'';
let USER=JSON.parse(localStorage.getItem('ss_user')||'null');
let ALL=[],FILTERED=[],PAGE=1,PERIOD=1,HIDDEN=false,PTAB='fat',FTAB='all',PLAT='',CUSTOM_FROM='',CUSTOM_TO='';
let ACCOUNTS=[],DASH={},CD=300;
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
  document.getElementById('acc-plan').textContent='Plano '+(USER?.plan||'free');
  loadAccounts().then(()=>{loadData();setTimeout(()=>doSync().catch(()=>{}),2000);setTimeout(ssDailyBrief,1200);});
  setTimeout(()=>checkShopeeKeyStatus().catch(()=>{}),3000);
  startCD();
  document.removeEventListener('visibilitychange',window._visSync);
  window._visSync=()=>{if(document.visibilityState==='visible'&&TOKEN&&USER)loadData();};
  document.addEventListener('visibilitychange',window._visSync);
  // Auto-refresh a cada 60s quando aba visível
  if(window._autoRefreshInterval)clearInterval(window._autoRefreshInterval);
  window._autoRefreshInterval=setInterval(()=>{
    if(document.visibilityState==='visible'&&TOKEN&&USER)loadData();
  },60000);
}

async function doQuickSync(){
  try{
    await Promise.all((ACCOUNTS||[]).filter(x=>x.is_connected).map(a=>
      fetch(`${API}/api/sync/quick?platform=${a.platform}`,{headers:{Authorization:`Bearer ${TOKEN}`}}).catch(()=>null)
    ));
  }catch(e){}
}

function startCD(){CD=300;clearInterval(window._ct);window._ct=setInterval(async()=>{CD--;const m=Math.floor(CD/60),s=CD%60;setText('next-sync',`${m}:${String(s).padStart(2,'0')}`);if(CD<=0){await doQuickSync();loadData();startCD();}},1000);}

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
    window._SS_CHART_CACHE={}; // limpa cache do gráfico ao recarregar
    window._PREV_DASH=null;
    // Abate estoque automaticamente pelos pedidos carregados
    if(typeof estoqueAbaterPedidos==='function') estoqueAbaterPedidos(ALL);
    applyFilters();
    ssDrawDailyChart();
    // Carrega comparação e rendimentos extras em paralelo
    loadCompare().then(()=>{ if(window._PREV_DASH)computeDash(); }).catch(()=>{});
    ssLoadAddRevTotal();
    setText('last-sync',new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}));
  }catch(e){document.getElementById('orders-body').innerHTML=`<tr><td colspan="15"><div class="empty"><i class="ti ti-wifi-off"></i><p>${e.message}</p></div></td></tr>`;}
  if($id('sync-ico'))$id('sync-ico').style.animation='';
}

function applyFilters(){
  let d=[...ALL];
  if(FTAB!=='all')d=d.filter(o=>o.fulfillment_type===FTAB);
  FILTERED=d;PAGE=1;computeDash();renderOrders();renderProds();
}

async function doSync(){
  toast('Sincronizando...');
  await Promise.all((ACCOUNTS||[]).filter(x=>x.is_connected).map(a=>api('/api/sync/'+a.platform).catch(()=>null)));
  await loadData();startCD();toast('✓ Sincronizado!');
}

function computeDash(){
  // pending excluído do faturamento/meta
  const paid=FILTERED.filter(o=>o.status!=='cancelled'&&o.status!=='pending');
  const can=FILTERED.filter(o=>o.status==='cancelled');
  const pend=FILTERED.filter(o=>o.status==='pending');
  const sum=(arr,k)=>arr.reduce((s,o)=>s+parseFloat(o[k]||0),0);
  const fat=sum(paid,'total_amount'),luc=sum(paid,'profit'),marg=fat>0?(luc/fat*100):0;
  DASH={total_orders:paid.length,cancelados:can.length,faturamento:fat,lucro:luc,tarifas:sum(paid,'platform_fee'),frete:sum(paid,'shipping_fee'),impostos:sum(paid,'tax_amount'),custos:sum(paid,'total_cost'),ticket:paid.length?fat/paid.length:0,marg};
  setText('tb-fat',f(fat));
  setText('tb-luc',f(luc));
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
    const fat=sum(paid,'total_amount');
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
  const total = Array.isArray(FILTERED) ? FILTERED.length : 0;
  const pages = Math.max(1, Math.ceil(total / pp));
  PAGE = Math.min(PAGE || 1, pages);

  const slice = (Array.isArray(FILTERED) ? FILTERED : []).slice((PAGE - 1) * pp, PAGE * pp);

  if (!slice.length) {
    document.getElementById('orders-body').innerHTML =
      '<tr><td colspan="15"><div class="empty"><i class="ti ti-package-off"></i><p>Nenhum pedido encontrado</p></div></td></tr>';
    document.getElementById('orders-count').textContent = '0 pedidos';
    document.getElementById('page-info').textContent = PAGE + ' de ' + pages;
    return;
  }

  let lastDay = '';
  let html = '';

  slice.forEach((o) => {
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

    const img = o.item_image
      ? `<img class="row-img" src="${o.item_image}" loading="lazy" onerror="this.outerHTML='<span class=row-img-ph>📦</span>'">`
      : '<span class="row-img-ph">📦</span>';

    const sc = STATUS_PT[o.status] || o.status || '—';
    const sclr = STATUS_CLR[o.status] || 'var(--txt3)';
    const sbg = STATUS_BG[o.status] || 'transparent';

    const ftype = o.fulfillment_type === 'full'
      ? '<span class="type-full">FULL</span>'
      : '<span class="type-normal">Normal</span>';

    const safeOrder = JSON.stringify(o).replace(/"/g, '&quot;');

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

    html += `<tr onclick="openOrder('${safeOrder}')">
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

      <td data-label="Total" style="font-weight:700">${f(o.total_amount)}</td>
      <td data-label="Tarifa">${metric('fee_pct','percent',o.platform_fee)}</td>
      <td data-label="Frete">${metric('shipping_fee','money',o.shipping_fee)}</td>
      <td data-label="Imposto">${metric('tax_pct','percent',o.tax_amount)}</td>
      <td data-label="Custo">${metric('cost','money',unitCost)}</td>

      <td data-label="Lucro">${lbdg}</td>
      <td data-label="NF" style="white-space:nowrap">${o.status!=='cancelled'&&o.fulfillment_type!=='full'?`<button onclick="event.stopPropagation();nfEmitirPedido('${o.id}')" title="Emitir NF de saída" style="background:${NF_EMITIDAS&&NF_EMITIDAS[o.id]?'rgba(16,185,129,.1)':'rgba(2,132,199,.1)'};border:1px solid ${NF_EMITIDAS&&NF_EMITIDAS[o.id]?'rgba(16,185,129,.25)':'rgba(2,132,199,.25)'};border-radius:7px;padding:3px 8px;cursor:pointer;font-size:10px;font-weight:700;color:${NF_EMITIDAS&&NF_EMITIDAS[o.id]?'var(--green2)':'var(--blue2)'}"><i class="ti ti-file-invoice"></i> ${NF_EMITIDAS&&NF_EMITIDAS[o.id]?'NF ✓':'NF'}</button>`:'<span style="font-size:10px;color:var(--txt3)">—</span>'}</td>
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
  src.forEach(o=>{const k=o.item_title||o.shop_name||o.platform;const v=PTAB==='fat'?parseFloat(o.total_amount||0):PTAB==='lucro'?parseFloat(o.profit||0):1;if(!map[k])map[k]={t:k,img:o.item_image,v:0,c:0};map[k].v+=v;map[k].c++;});
  const arr=Object.values(map).sort((a,b)=>b.v-a.v);
  const tot=arr.reduce((s,x)=>s+x.v,0)||1;
  const colors=['#8b5cf6','#38bdf8','#10b981','#fb923c','#fbbf24','#f87171'];
  if(!arr.length){list.innerHTML='<div class="empty"><i class="ti ti-package-off"></i><p>Sem dados</p></div>';return;}
  list.innerHTML=arr.slice(0,5).map((item,i)=>{
    const p=(item.v/tot*100).toFixed(1),color=colors[i%colors.length];
    const circ=Math.PI*2*14,dash=(p/100)*circ;
    const img=item.img?`<img class="prod-img" src="${item.img}" loading="lazy" onerror="this.outerHTML='<div class=prod-img-ph>📦</div>'">`:'<div class="prod-img-ph">📦</div>';
    return`<div class="prod-item">
      <svg width="38" height="38" viewBox="0 0 36 36"><circle cx="18" cy="18" r="14" fill="none" stroke="var(--bg5)" stroke-width="5"/>
        <circle cx="18" cy="18" r="14" fill="none" stroke="${color}" stroke-width="5" stroke-dasharray="${dash} ${circ-dash}" stroke-dashoffset="${circ/4}" transform="rotate(-90 18 18)"/>
        <text x="18" y="22" text-anchor="middle" fill="${color}" font-size="8" font-weight="700">${p}%</text></svg>
      ${img}
      <div class="prod-title" title="${item.t}">${item.t}</div>
      <div class="prod-right"><div class="v" style="color:${color}">${PTAB==='vendas'||PTAB==='canceladas'?item.c+' un.':f(item.v)}</div><div class="p">${p}%</div></div>
    </div>`;
  }).join('');
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
        slot.fat+=parseFloat(o.total_amount||0);
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
        map[sk].fat+=parseFloat(o.total_amount||0);
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
  const ordersPromise=window._SS_CHART_CACHE[period]
    ?Promise.resolve(window._SS_CHART_CACHE[period])
    :api(`/api/orders?period=${apiPeriod}${PLAT?'&platform='+PLAT:''}`).then(({data})=>{window._SS_CHART_CACHE[period]=data||[];return data||[];}).catch(()=>ALL);
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

function openOrder(oJson){
  const o=JSON.parse(oJson.replace(/&quot;/g,'"'));
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
      <div class="od-block"><div class="od-block-title"><i class="ti ti-package"></i> Produto</div>
        <div class="od-row"><span class="l">SKU</span><span class="v" style="color:var(--p3)">${o.item_sku||'—'}</span></div>
        <div class="od-row"><span class="l">Custo prod.</span><span class="v" style="color:var(--orange2)">${f(o.total_cost)}</span></div>
        <div class="od-row"><span class="l">Quantidade</span><span class="v">${o.quantity||1}</span></div>
        <div class="od-row"><span class="l">Tipo</span><span class="v">${o.fulfillment_type==='full'?'Full':'Normal'}</span></div>
        <div class="od-row"><span class="l">Item ML</span><span class="v">${o.item_id||'—'}</span></div>
        <div class="od-row"><span class="l">Anúncio</span><span class="v">${o.listing_type_id||'—'}</span></div>
      </div>
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



async function loadAccounts(){
  try{
    const{data}=await api('/api/accounts');
    ACCOUNTS=data;
    buildPlatBar();
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
function buildPlatBar(){
  const PI={mercadolivre:{label:'Mercado Livre',color:'#ffd600',cls:'ml'},shopee:{label:'Shopee',color:'#ee4d2d',cls:'sp'},magalu:{label:'Magalu',color:'#0078ff',cls:'mg'},tiktok:{label:'TikTok',color:'#ff0050',cls:'tk'}};
  const bar=document.getElementById('platbar');
  bar.innerHTML='<div class="pfil on" onclick="setPlatFilter(\'\',this)">🌐 Todos</div>';
  ACCOUNTS.filter(a=>a.is_connected).forEach(acc=>{
    const info=PI[acc.platform]||{label:acc.platform,color:'var(--p2)',cls:''};
    const d=document.createElement('div');d.className='pfil '+info.cls;d.onclick=function(){setPlatFilter(acc.platform,this);};
    d.innerHTML=`<span style="width:7px;height:7px;border-radius:50%;background:${info.color};display:inline-block"></span> ${acc.shop_name||info.label}`;
    bar.appendChild(d);
  });
}
async function loadAccountsMo(){
  const body=document.getElementById('mp-body');await loadAccounts();
  const pm={mercadolivre:{label:'Mercado Livre',cls:'ml',desc:'Vendas normais · Full'},shopee:{label:'Shopee',cls:'sp',desc:'Vendas normais'},magalu:{label:'Magalu',cls:'mg',desc:'Fulfillment · Normal'},tiktok:{label:'TikTok Shop',cls:'tk',desc:'Vendas TikTok Shop'}};
  body.innerHTML=`
    <div style="background:var(--bg3);border:1px solid var(--border2);border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:10px;">
      <div style="width:8px;height:8px;border-radius:50%;background:var(--green2);box-shadow:0 0 8px var(--green2);"></div>
      <span style="font-size:11px;color:var(--txt2)">API online · salesync-backend.onrender.com</span>
      <div style="margin-left:auto"><div class="ib" onclick="doSync()"><i class="ti ti-refresh"></i></div></div>
    </div>
    ${['mercadolivre','shopee','magalu','tiktok'].map(plat=>{
      const acc=ACCOUNTS.find(a=>a.platform===plat),p=pm[plat],ok=acc?.is_connected;
      return`<div class="mpc">
        <div class="mpch" onclick="toggleMp('${plat}')">
          <div class="mp-ico ${p.cls}">${p.cls.toUpperCase()}</div>
          <div class="mp-info"><h3>${p.label}</h3><p>${p.desc}</p></div>
          <div class="mp-status">${ok?'<span class="conn-badge">Conectado</span>':'<span class="disc-badge">Não conectado</span>'}<i class="ti ti-chevron-down chev" id="cv-${plat}"></i></div>
        </div>
        <div class="mp-body" id="mp-${plat}">
          ${ok?`<div class="mp-acc">
            <div class="mp-ava">${(acc.shop_name||plat)[0].toUpperCase()}</div>
            <div class="mp-acc-info"><div class="mp-acc-name">${acc.shop_name||'—'}</div>
              <div class="mp-acc-sub">${acc.mode==='full'||acc.mode==='both'?'<span class="type-full">📦 Full</span>':''}<span class="type-normal">🏪 Normal</span></div>
            </div>
            <div style="display:flex;gap:4px">
              <div class="ib" onclick="doSync()"><i class="ti ti-refresh"></i></div>
              <div class="ib danger" onclick="disconnPlat('${plat}')"><i class="ti ti-unlink"></i></div>
            </div>
          </div>
          <div class="mp-stats">
            <div class="mp-stat"><span>Última sinc.</span><strong>${acc.last_sync_at?new Date(acc.last_sync_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'—'}</strong></div>
            <div class="mp-stat"><span>Token</span><strong style="color:var(--green2)">✓ OK</strong></div>
            <div class="mp-stat"><span>Modo</span><strong>${acc.mode||'—'}</strong></div>
            <div class="mp-stat"><span>Período</span><strong>${CUSTOM_FROM&&CUSTOM_TO?CUSTOM_FROM+' a '+CUSTOM_TO:PERIOD+'d'}</strong></div>
          </div>
          <a class="btn ghost" href="${API}/debug/${plat}?token=${TOKEN}&days=30" target="_blank" style="text-decoration:none;font-size:11px;padding:8px">
            <i class="ti ti-bug"></i> Debug ${p.label}
          </a>`:`<div class="note"><i class="ti ti-shield-check"></i>Redirecionado para o site oficial. Sua senha nunca é armazenada.</div>
          <button class="btn primary" onclick="connectPlat('${plat}')"><i class="ti ti-external-link"></i> Conectar com ${p.label}</button>`}
        </div>
      </div>`;
    }).join('')}
    <div class="note"><i class="ti ti-lock"></i>OAuth 2.0 oficial — apenas o token é armazenado. Pedidos em tempo real.</div>`;
}
function connectMagalu(){
  window.location.href = API + '/auth/magalu?user_id=' + (USER?.id || '');
}
function connectPlat(plat){location.href=API+'/auth/'+plat+'?user_id='+(USER?.id||'');}
function connectMagaluDirect(){location.href=API+'/auth/magalu?user_id='+(USER?.id||'');}
async function disconnPlat(plat){if(!confirm('Desconectar '+plat+'?'))return;try{await api('/api/accounts/'+plat+'/disconnect',{method:'POST'});toast('Desconectado!');ACCOUNTS=[];buildPlatBar();loadAccountsMo();loadData();}catch(e){toast('Erro: '+e.message);}}

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

function filterTable(v){const t=v.toLowerCase();FILTERED=ALL.filter(o=>!t||(o.item_title||'').toLowerCase().includes(t)||(o.item_sku||'').toLowerCase().includes(t)||(o.platform_order_id||'').toLowerCase().includes(t));PAGE=1;renderOrders();}
function changePage(d){const p=Math.max(1,Math.ceil(FILTERED.length/20));PAGE=Math.max(1,Math.min(p,PAGE+d));renderOrders();}
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
function setPlatFilter(plat,el){document.querySelectorAll('.pfil').forEach(p=>p.classList.remove('on'));el.classList.add('on');PLAT=plat;loadData();}
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
.ret-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;}
.ret-kpi{background:var(--bg3);border:1px solid var(--border2);border-radius:12px;padding:12px 14px;}
.ret-kpi span{font-size:9px;text-transform:uppercase;letter-spacing:.6px;color:var(--txt3);font-weight:700;display:block;margin-bottom:4px;}
.ret-kpi strong{font-size:18px;font-weight:800;letter-spacing:-.5px;}
.ret-kpi.danger strong{color:var(--red2);}
.ret-kpi.warn strong{color:var(--orange2);}
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
        <div class="ret-kpi"><span>Devoluções</span><strong id="ret-qtd">—</strong></div>
        <div class="ret-kpi warn"><span>Frete reverso</span><strong id="ret-ship">—</strong></div>
        <div class="ret-kpi warn"><span>Taxas ML</span><strong id="ret-fee">—</strong></div>
        <div class="ret-kpi danger"><span>Prejuízo total</span><strong id="ret-total">—</strong></div>
      </div>
      <div class="ret-actions">
        <button class="ss-btn ghost" onclick="ssSyncReturns('mercadolivre')"><i class="ti ti-refresh"></i> Sincronizar ML</button>
        <button class="ss-btn ghost" onclick="ssSyncReturns('magalu')"><i class="ti ti-refresh"></i> Sincronizar Magalu</button>
        <button class="ss-btn" onclick="ssRefreshReturnsList()"><i class="ti ti-list-check"></i> Atualizar lista</button>
      </div>
      <div class="ret-search-wrap">
        <input id="ss-returns-search" class="ret-search" oninput="ssFilterReturnCards()" placeholder="Buscar por pedido, produto, motivo..."/>
        <button class="ss-btn ghost" onclick="document.getElementById('ss-returns-search').value='';ssFilterReturnCards()">Limpar</button>
      </div>
      <label style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--txt3);cursor:pointer;margin-bottom:10px;user-select:none">
        <input type="checkbox" id="ret-show-zero" onchange="ssFilterReturnCards()" style="accent-color:var(--p2);width:14px;height:14px;cursor:pointer"/>
        Exibir devoluções com custo zerado
      </label>
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

function ssReturnTagHtml(r){
  const res=String(r.resolution_type||r.reason||r.status||'').toLowerCase();
  const prot=r.ml_protected===true||r.ml_protected==='true';
  const tags=[];
  if(prot){tags.push('<span class="ret-tag protected">✓ ML Protegeu</span>');}
  if(res.includes('bpp_refunded')||res.includes('refund')){tags.push('<span class="ret-tag refund">Reembolsado</span>');}
  else if(res.includes('bpp_covered')||res.includes('covered')){tags.push('<span class="ret-tag covered">ML Absorveu</span>');}
  else if(res.includes('seller_protection')){tags.push('<span class="ret-tag protected">Protegido</span>');}
  else if(res.includes('open')||res.includes('claimed')){tags.push('<span class="ret-tag open">Em aberto</span>');}
  else if(res){tags.push(`<span class="ret-tag neutral">${res}</span>`);}
  const reasonTxt=r.reason||r.claim_reason||'';
  if(reasonTxt&&!tags.some(t=>t.includes(reasonTxt)))tags.push(`<span class="ret-tag neutral">${reasonTxt}</span>`);
  return tags.join('');
}

function ssRenderReturnCards(arr){
  const wrap=document.getElementById('ss-returns-cards');
  if(!wrap)return;
  if(!arr.length){wrap.innerHTML='<div class="ret-empty">Nenhuma devolução encontrada no período.</div>';return;}
  wrap.innerHTML=arr.map((r,i)=>{
    const ship=Number(r.return_shipping_cost||0);
    const fee=Number(r.return_fee||0);
    const lost=Number(r.lost_product_cost||0);
    const total=Number(r.return_total_cost||0)||(ship+fee+lost);
    const prot=r.ml_protected===true||r.ml_protected==='true';
    const dateStr=r.updated_at?new Date(r.updated_at).toLocaleDateString('pt-BR'):(r.order_date?new Date(r.order_date).toLocaleDateString('pt-BR'):'—');
    const search=[r.platform_order_id,r.item_title,r.item_sku,r.reason,r.resolution_type,r.status,r.buyer_message].join(' ').toLowerCase();
    return `<div class="ret-card" data-search="${search.replace(/"/g,'&quot;')}" data-idx="${i}">
      <div class="ret-card-top" onclick="ssOpenReturnDetail(${i})">
        <span class="plat-chip ${r.platform||'mercadolivre'}">${r.platform||'ML'}</span>
        <span class="ret-card-id">#${r.platform_order_id||r.external_return_id||'—'}</span>
        <span class="ret-card-date">${dateStr}</span>
      </div>
      <div class="ret-card-title" onclick="ssOpenReturnDetail(${i})">${r.item_title||'Produto sem título'} ${r.item_sku?'<span style="color:var(--txt3)">· '+r.item_sku+'</span>':''}</div>
      <div class="ret-card-tags" onclick="ssOpenReturnDetail(${i})">${ssReturnTagHtml(r)}</div>
      ${prot?`<div style="font-size:10px;color:var(--green2);background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.15);border-radius:8px;padding:6px 10px;margin-bottom:8px">✓ ML cobriu o custo — você não teve prejuízo financeiro nessa devolução</div>`:''}
      <div class="ret-costs">
        <div class="ret-cost-field">
          <label class="ret-cost-label">Frete reverso</label>
          <input class="ret-cost-inp" id="rs-${r.id}" onclick="event.stopPropagation()" value="${ship.toFixed(2)}" type="number" step="0.01" min="0"/>
        </div>
        <div class="ret-cost-field">
          <label class="ret-cost-label">Taxa ML</label>
          <input class="ret-cost-inp" id="rf-${r.id}" onclick="event.stopPropagation()" value="${fee.toFixed(2)}" type="number" step="0.01" min="0"/>
        </div>
        <div class="ret-cost-field">
          <label class="ret-cost-label">Produto perdido</label>
          <input class="ret-cost-inp" id="rl-${r.id}" onclick="event.stopPropagation()" value="${lost.toFixed(2)}" type="number" step="0.01" min="0"/>
        </div>
        <div class="ret-cost-total"><small>Prejuízo</small>${R_BRL(total)}</div>
      </div>
      <div class="ret-save-btn">
        <button class="ret-action-btn" onclick="event.stopPropagation();ssOpenReturnDetail(${i})"><i class="ti ti-eye"></i> Detalhes</button>
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
    const ship=arr.reduce((s,r)=>s+Number(r.return_shipping_cost||0),0);
    const fee=arr.reduce((s,r)=>s+Number(r.return_fee||0),0);
    const total=arr.reduce((s,r)=>s+Number(r.return_total_cost||0),0);
    document.getElementById('ret-qtd').textContent=arr.length;
    document.getElementById('ret-ship').textContent=R_BRL(ship);
    document.getElementById('ret-fee').textContent=R_BRL(fee);
    document.getElementById('ret-total').textContent=R_BRL(total);
    ssRenderReturnCards(arr);
  }catch(e){
    if(wrap)wrap.innerHTML=`<div class="ret-empty" style="color:var(--red2)">${e.message}</div>`;
  }
}

async function ssLoadReturns(){
  ssOpenModal('ss-returns-modal');
  await ssRefreshReturnsList();
}

function ssFilterReturnCards(){
  const v=(document.getElementById('ss-returns-search')?.value||'').toLowerCase().trim();
  const showZero=document.getElementById('ret-show-zero')?.checked||false;
  document.querySelectorAll('#ss-returns-cards .ret-card').forEach(el=>{
    const idx=parseInt(el.dataset.idx||'0');
    const r=window.SS_RETURNS_DATA[idx]||{};
    const total=Number(r.return_total_cost||0)||Number(r.return_shipping_cost||0)+Number(r.return_fee||0)+Number(r.lost_product_cost||0);
    const isZero=total===0;
    const matchSearch=(el.dataset.search||'').includes(v);
    el.style.display=(matchSearch&&(!isZero||showZero))?'':'none';
  });
}

function ssOpenReturnDetail(idx){
  const r=window.SS_RETURNS_DATA[idx];
  if(!r)return;
  const ship=Number(r.return_shipping_cost||0);
  const fee=Number(r.return_fee||0);
  const lost=Number(r.lost_product_cost||0);
  const total=Number(r.return_total_cost||0)||(ship+fee+lost);
  const prot=r.ml_protected===true||r.ml_protected==='true';
  const body=document.getElementById('ss-return-detail-body');
  if(!body)return;
  body.innerHTML=`
    <div class="ret-detail-section">
      <h4>Pedido</h4>
      ${r.item_title?`<div style="font-size:14px;font-weight:700;margin-bottom:10px">${r.item_title}</div>`:''}
      <div class="ret-detail-row"><span>ID do pedido</span><strong>#${r.platform_order_id||'—'}</strong></div>
      <div class="ret-detail-row"><span>Plataforma</span><strong><span class="plat-chip ${r.platform||''}" style="font-size:9px">${r.platform||'—'}</span></strong></div>
      ${r.item_sku?`<div class="ret-detail-row"><span>SKU</span><strong>${r.item_sku}</strong></div>`:''}
      ${r.total_amount?`<div class="ret-detail-row"><span>Valor do pedido</span><strong>${R_BRL(r.total_amount)}</strong></div>`:''}
      ${r.order_date?`<div class="ret-detail-row"><span>Data do pedido</span><strong>${new Date(r.order_date).toLocaleString('pt-BR')}</strong></div>`:''}
    </div>
    <div class="ret-detail-section">
      <h4>Devolução</h4>
      <div class="ret-detail-row"><span>Status</span><strong>${r.status||'—'}</strong></div>
      <div class="ret-detail-row"><span>Motivo</span><strong>${r.reason||'—'}</strong></div>
      <div class="ret-detail-row"><span>Tipo de resolução</span><strong>${r.resolution_type||'—'}</strong></div>
      ${r.return_tracking_code?`<div class="ret-detail-row"><span>Rastreio retorno</span><strong>${r.return_tracking_code}</strong></div>`:''}
      ${r.buyer_message?`<div class="ret-detail-row"><span>Mensagem do comprador</span><strong>${r.buyer_message}</strong></div>`:''}
      <div class="ret-detail-row"><span>Atualizado em</span><strong>${r.updated_at?new Date(r.updated_at).toLocaleString('pt-BR'):'—'}</strong></div>
    </div>
    <div class="ret-detail-section">
      <h4>Impacto financeiro</h4>
      ${prot?`<div style="background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);border-radius:10px;padding:10px 12px;margin-bottom:10px;font-size:11px;color:var(--green2)">✓ ML Protegeu o vendedor — custo foi absorvido pelo Mercado Livre</div>`:''}
      <div class="ret-detail-cost-grid">
        <div class="ret-detail-cost-item ${ship>0?'danger':''}"><span>Frete reverso</span><strong>${R_BRL(ship)}</strong></div>
        <div class="ret-detail-cost-item ${fee>0?'danger':''}"><span>Taxa ML</span><strong>${R_BRL(fee)}</strong></div>
        <div class="ret-detail-cost-item ${lost>0?'danger':''}"><span>Produto perdido</span><strong>${R_BRL(lost)}</strong></div>
        <div class="ret-detail-cost-item ${total>0&&!prot?'danger':'safe'}"><span>Prejuízo total</span><strong>${prot?'R$ 0,00':R_BRL(total)}</strong></div>
      </div>
    </div>
    ${r.platform_order_id?`<div style="text-align:right"><a href="https://www.mercadolivre.com.br/vendas/${r.platform_order_id}/detalhe" target="_blank" class="ss-btn ghost" style="font-size:11px"><i class="ti ti-external-link"></i> Ver no Mercado Livre</a></div>`:''}
  `;
  ssOpenModal('ss-return-detail-modal');
}

async function ssSyncReturns(platform){
  try{
    toast('Sincronizando devoluções '+platform+'...');
    await ssFetchJson(`${API}/api/returns/sync/${platform}`,{method:'POST'});
    await ssRefreshReturnsList();
    toast('Devoluções sincronizadas');
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
    const fat=paid.reduce((s,o)=>s+parseFloat(o.total_amount||0),0);
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

<!-- ═══ PAINEL ESTOQUE (sobrepõe #content) ═══ -->
<div id="painel-estoque" style="display:none;position:absolute;top:132px;left:56px;right:0;bottom:0;background:var(--bg);z-index:200;overflow-y:auto;padding:14px 16px;">
<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
  <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#059669,#10b981);display:flex;align-items:center;justify-content:center;font-size:18px"><i class="ti ti-package" style="color:#fff"></i></div>
  <div><div style="font-size:16px;font-weight:800">Estoque</div><div style="font-size:11px;color:var(--txt3)">Controle de quantidade por SKU</div></div>
  <button onclick="fecharEstoque()" style="margin-left:auto;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:6px 14px;color:var(--txt2);cursor:pointer;font-size:12px;font-weight:600"><i class="ti ti-x"></i> Fechar</button>
</div>

<!-- Alertas -->
<div id="estoque-alertas" style="margin-bottom:12px"></div>

<!-- Adicionar SKU -->
<div style="background:var(--bg3);border:1px solid var(--border2);border-radius:12px;padding:14px;margin-bottom:14px">
  <div style="font-size:10px;font-weight:800;color:var(--txt3);margin-bottom:10px">ADICIONAR / ATUALIZAR SKU</div>
  <div style="display:grid;grid-template-columns:120px 1fr 100px 100px 44px;gap:8px;align-items:end">
    <div><label style="font-size:10px;color:var(--txt3);font-weight:700;display:block;margin-bottom:3px">SKU</label><input id="est-sku" class="lfi" placeholder="paineloff" style="height:34px;font-size:12px"/></div>
    <div><label style="font-size:10px;color:var(--txt3);font-weight:700;display:block;margin-bottom:3px">Nome do produto</label><input id="est-nome" class="lfi" placeholder="Painel Ripado Off White" style="height:34px;font-size:12px"/></div>
    <div><label style="font-size:10px;color:var(--txt3);font-weight:700;display:block;margin-bottom:3px">Qtd atual</label><input id="est-qtd" type="number" min="0" class="lfi" placeholder="50" style="height:34px;font-size:12px"/></div>
    <div><label style="font-size:10px;color:var(--txt3);font-weight:700;display:block;margin-bottom:3px">Alerta quando &lt;</label><input id="est-min" type="number" min="0" class="lfi" placeholder="5" style="height:34px;font-size:12px"/></div>
    <button onclick="estoqueAdicionar()" class="btn primary" style="height:34px;padding:0 12px;font-size:13px;margin-top:auto"><i class="ti ti-plus"></i></button>
  </div>
</div>

<!-- Lista -->
<div id="estoque-lista"><div class="empty"><div class="spin"></div></div></div>
</div>

<!-- REMOVIDO: antigo mo-estoque modal substituído por painel acima -->
<div style="display:none" id="mo-estoque">
<div class="md wide" style="max-width:900px;"><div class="mh"><div class="mh-left"><div class="mh-ico" style="background:linear-gradient(135deg,#059669,#10b981)"><i class="ti ti-package"></i></div><div><div class="mh-title">Estoque</div><div class="mh-sub">Controle de quantidade por SKU</div></div></div><div class="mh-close" onclick="closeMo('mo-estoque')"><i class="ti ti-x"></i></div></div>
<div class="mb" style="padding:18px">

  <!-- Alerta de itens críticos -->
  <div id="estoque-alertas" style="margin-bottom:14px"></div>

  <!-- Adicionar/editar estoque -->
  <div style="display:grid;grid-template-columns:1fr 1fr 100px 100px 44px;gap:8px;margin-bottom:14px;align-items:end;">
    <div><label style="font-size:10px;color:var(--txt3);font-weight:700;display:block;margin-bottom:4px">SKU</label><input id="est-sku" class="lfi" placeholder="paineloff" style="height:36px;font-size:12px"/></div>
    <div><label style="font-size:10px;color:var(--txt3);font-weight:700;display:block;margin-bottom:4px">Nome do produto</label><input id="est-nome" class="lfi" placeholder="Painel Ripado Off White" style="height:36px;font-size:12px"/></div>
    <div><label style="font-size:10px;color:var(--txt3);font-weight:700;display:block;margin-bottom:4px">Qtd atual</label><input id="est-qtd" type="number" min="0" class="lfi" placeholder="50" style="height:36px;font-size:12px"/></div>
    <div><label style="font-size:10px;color:var(--txt3);font-weight:700;display:block;margin-bottom:4px">Alerta quando &lt;</label><input id="est-min" type="number" min="0" class="lfi" placeholder="5" style="height:36px;font-size:12px"/></div>
    <button onclick="estoqueAdicionar()" class="btn primary" style="height:36px;padding:0 12px;font-size:12px;margin-top:auto"><i class="ti ti-plus"></i></button>
  </div>

  <!-- Lista de SKUs -->
  <div id="estoque-lista" style="display:flex;flex-direction:column;gap:6px"><div class="empty"><div class="spin"></div></div></div>

</div></div></div>

<!-- ═══ PAINEL NF (sobrepõe #content) ═══ -->
<div id="painel-nf" style="display:none;position:absolute;top:132px;left:56px;right:0;bottom:0;background:var(--bg);z-index:200;overflow-y:auto;padding:14px 16px;">
<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
  <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#0284c7,#38bdf8);display:flex;align-items:center;justify-content:center;font-size:18px"><i class="ti ti-file-invoice" style="color:#fff"></i></div>
  <div><div style="font-size:16px;font-weight:800">Emissão de Nota Fiscal</div><div style="font-size:11px;color:var(--txt3)">NF-e de saída por pedido</div></div>
  <button onclick="fecharNF()" style="margin-left:auto;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:6px 14px;color:var(--txt2);cursor:pointer;font-size:12px;font-weight:600"><i class="ti ti-x"></i> Fechar</button>
</div>

<!-- Lista de pedidos aguardando NF -->
<div id="nf-lista-panel">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
    <div style="font-size:12px;font-weight:700;color:var(--txt2)">Vendas normais sem NF emitida</div>
    <button onclick="nfEmitirSelecionados()" class="btn primary" style="font-size:11px;height:32px;padding:0 14px"><i class="ti ti-file-plus"></i> Emitir selecionadas</button>
  </div>
  <div id="nf-pedidos-lista"><div class="empty" style="height:80px">Carregando pedidos...</div></div>
</div>

<!-- Wizard de emissão -->
<div id="nf-wizard" style="display:none">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
    <button onclick="nfVoltarLista()" style="background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:6px 12px;color:var(--txt2);cursor:pointer;font-size:12px"><i class="ti ti-arrow-left"></i> Voltar</button>
    <div id="nf-wizard-progress" style="font-size:12px;color:var(--txt3)">Pedido 1 de 1</div>
    <div id="nf-wizard-steps" style="display:flex;gap:4px;margin-left:auto"></div>
  </div>
  <div id="nf-wizard-body"></div>
</div>
</div>

<!-- Dummy para compatibilidade (sidebar chama openMo('mo-nf')) -->
<div style="display:none" id="mo-nf"></div>

<style>
.plat-tk{background:rgba(255,0,80,.1);color:#ff0050;border:1px solid rgba(255,0,80,.25);border-radius:5px;font-size:9px;font-weight:800;padding:2px 5px;}
.est-row{display:grid;grid-template-columns:110px 1fr 130px 70px 90px 100px 36px;gap:8px;align-items:center;background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:10px 14px;font-size:12px;transition:border-color .2s;}
.est-row.critico{border-color:rgba(239,68,68,.5);background:rgba(239,68,68,.05);}
.est-row.baixo{border-color:rgba(251,191,36,.4);background:rgba(251,191,36,.04);}
.est-label{font-size:9px;font-weight:700;color:var(--txt3);margin-bottom:2px;text-transform:uppercase}
.est-val{font-size:13px;font-weight:700}
@media(max-width:900px){.est-row{grid-template-columns:1fr 1fr;}}
/* NF pedido row */
.nf-row{display:grid;grid-template-columns:20px 60px 1fr 100px 90px 80px 110px;gap:8px;align-items:center;background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:10px 14px;font-size:12px;transition:border-color .2s;}
.nf-row:hover{border-color:var(--p2);}
.nf-row.emitida{opacity:.5;}
/* NF wizard */
.nf-step-dot{width:28px;height:28px;border-radius:50%;border:2px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--txt3);cursor:default;}
.nf-step-dot.ativo{border-color:var(--p2);background:rgba(139,92,246,.15);color:var(--p3);}
.nf-step-dot.ok{border-color:var(--green2);background:rgba(16,185,129,.12);color:var(--green2);}
.nf-step-dot.erro{border-color:var(--red2);background:rgba(248,113,113,.1);color:var(--red2);}
.nf-campo label{font-size:10px;font-weight:700;color:var(--txt3);display:block;margin-bottom:3px;text-transform:uppercase}
.nf-campo input,.nf-campo select,.nf-campo textarea{width:100%;background:var(--bg4);border:1px solid var(--border2);border-radius:8px;padding:8px 10px;color:var(--txt);font-size:12px;outline:none;font-family:'Inter',sans-serif;}
.nf-campo input:focus,.nf-campo select:focus{border-color:var(--p2);}
</style>

<script>
// ══════════════════════════════════════
// LIGHT / DARK MODE
// ══════════════════════════════════════
function toggleTheme(){
  const light=document.body.classList.toggle('light-mode');
  localStorage.setItem('ss_theme',light?'light':'dark');
  updateThemeUI(light);
}
function updateThemeUI(light){
  const icon=document.getElementById('theme-icon'),label=document.getElementById('theme-label'),knob=document.getElementById('theme-toggle-knob'),btn=document.getElementById('theme-toggle-btn');
  if(!icon)return;
  if(light){icon.className='ti ti-moon';icon.style.color='#818cf8';if(label)label.textContent='Modo escuro';if(knob){knob.style.left='20px';knob.style.background='#818cf8';}if(btn)btn.style.background='rgba(109,40,217,.3)';}
  else{icon.className='ti ti-sun';icon.style.color='#f59e0b';if(label)label.textContent='Modo claro';if(knob){knob.style.left='2px';knob.style.background='var(--txt3)';}if(btn)btn.style.background='var(--bg4)';}
}
(function(){const t=localStorage.getItem('ss_theme');if(t==='light')document.body.classList.add('light-mode');document.addEventListener('DOMContentLoaded',()=>updateThemeUI(document.body.classList.contains('light-mode')));})();

// ══════════════════════════════════════
// PAINEIS (substituem #content)
// ══════════════════════════════════════
function abrirPainel(id){
  // Esconde content principal
  const c=document.getElementById('content');if(c)c.style.display='none';
  document.querySelectorAll('[id^="painel-"]').forEach(p=>p.style.display='none');
  const p=document.getElementById('painel-'+id);if(p)p.style.display='block';
}
function fecharEstoque(){
  document.getElementById('painel-estoque').style.display='none';
  const c=document.getElementById('content');if(c)c.style.display='';
}
function fecharNF(){
  document.getElementById('painel-nf').style.display='none';
  const c=document.getElementById('content');if(c)c.style.display='';
}

// Intercepta openMo para os novos painéis
const __openMoBase=window.openMo;
window.openMo=function(id){
  if(id==='mo-estoque'){abrirPainel('estoque');estoqueRender();return;}
  if(id==='mo-nf'){abrirPainel('nf');nfCarregarPedidos();return;}
  if(typeof __openMoBase==='function')__openMoBase(id);
};

// ══════════════════════════════════════
// ESTOQUE
// ══════════════════════════════════════
let ESTOQUE=JSON.parse(localStorage.getItem('ss_estoque')||'{}');
function estoqueS(){localStorage.setItem('ss_estoque',JSON.stringify(ESTOQUE));}

function estoqueAdicionar(){
  const sku=document.getElementById('est-sku').value.trim();
  const nome=document.getElementById('est-nome').value.trim();
  const qtd=parseInt(document.getElementById('est-qtd').value)||0;
  const min=parseInt(document.getElementById('est-min').value)||5;
  if(!sku)return alert('Informe o SKU');
  ESTOQUE[sku]={nome:nome||sku,qtd,minAlert:min,updatedAt:Date.now()};
  estoqueS();estoqueRender();estoqueCheckAlerts();
  ['est-sku','est-nome','est-qtd','est-min'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
}
function estoqueAjuste(sku,delta){
  if(!ESTOQUE[sku])return;
  ESTOQUE[sku].qtd=Math.max(0,(ESTOQUE[sku].qtd||0)+delta);
  ESTOQUE[sku].updatedAt=Date.now();
  estoqueS();estoqueRender();estoqueCheckAlerts();
}
function estoqueSetQtd(sku,val){
  if(!ESTOQUE[sku])return;
  ESTOQUE[sku].qtd=Math.max(0,parseInt(val)||0);
  ESTOQUE[sku].updatedAt=Date.now();
  estoqueS();estoqueCheckAlerts();
}
function estoqueRemove(sku){
  if(!confirm('Remover '+sku+'?'))return;
  delete ESTOQUE[sku];estoqueS();estoqueRender();estoqueCheckAlerts();
}

function estoqueRender(){
  const lista=document.getElementById('estoque-lista');if(!lista)return;
  const skus=Object.keys(ESTOQUE);
  // alertas
  const alertas=document.getElementById('estoque-alertas');
  if(alertas){
    const crit=skus.filter(s=>ESTOQUE[s].qtd<=0);
    const baixos=skus.filter(s=>ESTOQUE[s].qtd>0&&ESTOQUE[s].qtd<=ESTOQUE[s].minAlert);
    let h='';
    if(crit.length)h+=`<div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:10px 14px;font-size:12px;color:var(--red2);display:flex;align-items:center;gap:8px;margin-bottom:8px"><i class="ti ti-alert-triangle"></i><strong>Estoque zerado:</strong>&nbsp;${crit.join(', ')}</div>`;
    if(baixos.length)h+=`<div style="background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.2);border-radius:10px;padding:10px 14px;font-size:12px;color:var(--yellow2);display:flex;align-items:center;gap:8px"><i class="ti ti-alert-circle"></i><strong>Estoque baixo:</strong>&nbsp;${baixos.join(', ')}</div>`;
    alertas.innerHTML=h;
  }
  if(!skus.length){lista.innerHTML='<div class="empty" style="height:100px;color:var(--txt3)">Nenhum SKU cadastrado. Adicione acima ↑</div>';return;}
  lista.innerHTML=`
  <div class="est-row" style="background:transparent;border-color:transparent;padding:4px 14px">
    <span style="font-size:10px;font-weight:700;color:var(--txt3)">SKU</span>
    <span style="font-size:10px;font-weight:700;color:var(--txt3)">PRODUTO</span>
    <span style="font-size:10px;font-weight:700;color:var(--txt3)">QUANTIDADE</span>
    <span style="font-size:10px;font-weight:700;color:var(--txt3)">MÍNIMO</span>
    <span style="font-size:10px;font-weight:700;color:var(--txt3)">STATUS</span>
    <span style="font-size:10px;font-weight:700;color:var(--txt3)">ATUALIZADO</span>
    <span></span>
  </div>
  ${skus.map(sku=>{
    const e=ESTOQUE[sku];
    const cls=e.qtd<=0?'critico':e.qtd<=e.minAlert?'baixo':'';
    const st=e.qtd<=0?'<span style="color:var(--red2);font-weight:700;font-size:11px">🔴 Zerado</span>':e.qtd<=e.minAlert?'<span style="color:var(--yellow2);font-weight:700;font-size:11px">🟡 Baixo</span>':'<span style="color:var(--green2);font-size:11px">🟢 OK</span>';
    const ua=e.updatedAt?new Date(e.updatedAt).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
    return `<div class="est-row ${cls}">
      <div><div class="est-label">SKU</div><div class="est-val" style="font-size:11px;color:var(--p3)">${sku}</div></div>
      <div><div class="est-label">PRODUTO</div><div class="est-val" style="font-size:12px">${e.nome}</div></div>
      <div style="display:flex;align-items:center;gap:5px">
        <button onclick="estoqueAjuste('${sku}',-1)" style="width:26px;height:26px;border:1px solid var(--border2);background:var(--bg4);border-radius:6px;cursor:pointer;color:var(--txt2);font-size:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0">−</button>
        <input type="number" value="${e.qtd}" min="0" onchange="estoqueSetQtd('${sku}',this.value)" style="width:54px;height:28px;text-align:center;background:var(--bg4);border:1px solid var(--border2);border-radius:6px;color:var(--txt);font-size:13px;font-weight:700"/>
        <button onclick="estoqueAjuste('${sku}',1)" style="width:26px;height:26px;border:1px solid var(--border2);background:var(--bg4);border-radius:6px;cursor:pointer;color:var(--txt2);font-size:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0">+</button>
      </div>
      <div><div class="est-label">MÍNIMO</div><div class="est-val">${e.minAlert}</div></div>
      <div>${st}</div>
      <div style="font-size:10px;color:var(--txt3)">${ua}</div>
      <button onclick="estoqueRemove('${sku}')" style="width:30px;height:30px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.18);border-radius:8px;color:var(--red2);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center"><i class="ti ti-trash"></i></button>
    </div>`;
  }).join('')}`;
}

function estoqueAbaterPedidos(orders){
  const jaAbatidos=JSON.parse(sessionStorage.getItem('ss_abatidos')||'[]');
  let mudou=false;
  for(const o of orders){
    if(jaAbatidos.includes(o.id)||o.status==='cancelled')continue;
    const sku=o.item_sku||'';
    if(sku&&ESTOQUE[sku]){
      ESTOQUE[sku].qtd=Math.max(0,(ESTOQUE[sku].qtd||0)-(parseInt(o.quantity)||1));
      ESTOQUE[sku].updatedAt=Date.now();
      jaAbatidos.push(o.id);mudou=true;
    }
  }
  if(mudou){estoqueS();sessionStorage.setItem('ss_abatidos',JSON.stringify(jaAbatidos));estoqueCheckAlerts();}
}

function estoqueCheckAlerts(){
  const old=document.getElementById('stock-alert-global');if(old)old.remove();
  const crit=Object.entries(ESTOQUE).filter(([s,e])=>e.qtd<=e.minAlert);
  if(!crit.length)return;
  const badge=document.createElement('div');
  badge.id='stock-alert-global';badge.className='stock-alert-badge';
  badge.onclick=()=>openMo('mo-estoque');
  const nomes=crit.slice(0,3).map(([s,e])=>`${e.nome} (${e.qtd})`).join(', ');
  const extra=crit.length>3?` +${crit.length-3} mais`:'';
  badge.innerHTML=`<i class="ti ti-alert-triangle"></i> Estoque baixo: ${nomes}${extra} <i class="ti ti-x" onclick="event.stopPropagation();this.parentElement.remove()" style="margin-left:8px;opacity:.7;font-size:16px"></i>`;
  document.body.appendChild(badge);
  setTimeout(()=>{if(badge.parentElement){badge.style.transition='opacity .4s';badge.style.opacity='0';setTimeout(()=>badge.remove(),400);}},8000);
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(estoqueCheckAlerts,3000));

// ══════════════════════════════════════
// NOTA FISCAL — lista + wizard
// ══════════════════════════════════════
let NF_EMITIDAS=JSON.parse(localStorage.getItem('ss_nf_emitidas')||'{}'); // {order_id: true}
let NF_FILA=[];     // pedidos selecionados para emitir
let NF_FILA_IDX=0;  // índice atual no wizard

function nfCarregarPedidos(){
  const lista=document.getElementById('nf-pedidos-lista');if(!lista)return;
  // Filtra ALL: só vendas normais (não Full) e não canceladas
  const pedidos=(typeof ALL!=='undefined'?ALL:[])
    .filter(o=>o.status!=='cancelled' && o.fulfillment_type!=='full' && !NF_EMITIDAS[o.id])
    .sort((a,b)=>new Date(b.order_date)-new Date(a.order_date));

  if(!pedidos.length){
    lista.innerHTML='<div class="empty" style="height:80px;color:var(--txt3)">Nenhuma venda normal pendente de NF. ✅</div>';return;
  }
  const f=v=>v!=null?'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2}):'—';
  lista.innerHTML=`
  <div class="nf-row" style="background:transparent;border-color:transparent;padding:4px 14px">
    <input type="checkbox" id="nf-sel-all" onchange="nfSelecionarTodos(this.checked)" title="Selecionar todos"/>
    <span style="font-size:10px;font-weight:700;color:var(--txt3)">DATA</span>
    <span style="font-size:10px;font-weight:700;color:var(--txt3)">PRODUTO</span>
    <span style="font-size:10px;font-weight:700;color:var(--txt3)">COMPRADOR</span>
    <span style="font-size:10px;font-weight:700;color:var(--txt3)">VALOR</span>
    <span style="font-size:10px;font-weight:700;color:var(--txt3)">PLATAFORMA</span>
    <span style="font-size:10px;font-weight:700;color:var(--txt3)">STATUS NF</span>
  </div>
  ${pedidos.map(o=>`
  <div class="nf-row ${NF_EMITIDAS[o.id]?'emitida':''}">
    <input type="checkbox" class="nf-sel" value="${o.id}" ${NF_EMITIDAS[o.id]?'disabled checked':''}/>
    <div style="font-size:10px;color:var(--txt3)">${new Date(o.order_date).toLocaleDateString('pt-BR')}</div>
    <div>
      <div style="font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px">${o.item_title||'—'}</div>
      <div style="font-size:10px;color:var(--txt3)">${o.platform_order_id}</div>
    </div>
    <div style="font-size:11px;color:var(--txt2)">${o.buyer_name||'—'}</div>
    <div style="font-size:12px;font-weight:700">${f(o.total_amount)}</div>
    <div><span class="plat-chip ${o.platform}">${o.platform?.toUpperCase()}</span></div>
    <div>${NF_EMITIDAS[o.id]?'<span style="color:var(--green2);font-size:11px">✅ Emitida</span>':'<span style="color:var(--txt3);font-size:11px">⏳ Pendente</span>'}</div>
  </div>`).join('')}`;
}

function nfSelecionarTodos(v){
  document.querySelectorAll('.nf-sel:not(:disabled)').forEach(cb=>cb.checked=v);
}

function nfEmitirSelecionados(){
  const selecionados=[...document.querySelectorAll('.nf-sel:checked:not(:disabled)')].map(cb=>cb.value);
  if(!selecionados.length)return alert('Selecione pelo menos uma venda.');
  NF_FILA=(typeof ALL!=='undefined'?ALL:[]).filter(o=>selecionados.includes(o.id));
  NF_FILA_IDX=0;
  document.getElementById('nf-lista-panel').style.display='none';
  document.getElementById('nf-wizard').style.display='block';
  nfWizardRender();
}

function nfVoltarLista(){
  document.getElementById('nf-wizard').style.display='none';
  document.getElementById('nf-lista-panel').style.display='block';
  nfCarregarPedidos();
}

function nfWizardRender(){
  const total=NF_FILA.length,idx=NF_FILA_IDX,o=NF_FILA[idx];
  if(!o){nfVoltarLista();return;}

  // Steps
  const prog=document.getElementById('nf-wizard-progress');
  if(prog)prog.textContent=`Pedido ${idx+1} de ${total}`;
  const steps=document.getElementById('nf-wizard-steps');
  if(steps)steps.innerHTML=NF_FILA.map((_,i)=>`<div class="nf-step-dot ${i<idx?'ok':i===idx?'ativo':''}">${i<idx?'✓':i+1}</div>`).join('');

  const f=v=>v!=null?'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2}):'—';
  document.getElementById('nf-wizard-body').innerHTML=`
  <!-- Info do pedido -->
  <div style="background:var(--bg3);border:1px solid var(--border2);border-radius:12px;padding:14px 16px;margin-bottom:14px;display:flex;gap:14px;align-items:flex-start">
    <div style="flex:1">
      <div style="font-size:13px;font-weight:700;margin-bottom:4px">${o.item_title||'Produto'}</div>
      <div style="font-size:11px;color:var(--txt3)">Pedido: <strong style="color:var(--txt2)">${o.platform_order_id}</strong> · ${o.platform?.toUpperCase()} · ${new Date(o.order_date).toLocaleDateString('pt-BR')}</div>
      <div style="font-size:11px;color:var(--txt3);margin-top:3px">Comprador: <strong style="color:var(--txt2)">${o.buyer_name||'—'}</strong></div>
    </div>
    <div style="text-align:right;flex-shrink:0">
      <div style="font-size:18px;font-weight:800;color:var(--green2)">${f(o.total_amount)}</div>
      <div style="font-size:10px;color:var(--txt3)">valor de venda</div>
    </div>
  </div>

  <!-- Status busca CPF (só ML) -->
  ${o.platform==='mercadolivre'?`<div id="nfw-cpf-status" style="background:rgba(2,132,199,.07);border:1px solid rgba(2,132,199,.18);border-radius:10px;padding:10px 14px;font-size:11px;color:var(--blue2);display:flex;align-items:center;gap:8px;margin-bottom:12px"><div class="spin" style="width:14px;height:14px;border-width:2px;flex-shrink:0"></div> Buscando CPF do comprador no Mercado Livre...</div>`:''}

  <!-- Campos NF -->
  <div style="background:var(--bg3);border:1px solid var(--border2);border-radius:12px;padding:16px;margin-bottom:14px">
    <div style="font-size:10px;font-weight:800;color:var(--txt3);margin-bottom:12px">DADOS PARA A NOTA FISCAL DE SAÍDA</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="nf-campo"><label>CPF / CNPJ do destinatário</label><input id="nfw-dest-doc" placeholder="000.000.000-00" value="${o.buyer_cpf||''}"/></div>
      <div class="nf-campo"><label>Nome / Razão social</label><input id="nfw-dest-nome" placeholder="Nome do comprador" value="${o.buyer_name||''}"/></div>
      <div class="nf-campo"><label>CFOP</label>
        <select id="nfw-cfop">
          <option value="6102">6102 — Venda fora do estado</option>
          <option value="5102">5102 — Venda dentro do estado</option>
          <option value="6108">6108 — Venda prod. adquirido</option>
        </select>
      </div>
      <div class="nf-campo"><label>Natureza da operação</label><input id="nfw-natureza" value="Venda de mercadoria"/></div>
      <div class="nf-campo"><label>Valor do produto (R$)</label><input id="nfw-valor" type="number" step="0.01" value="${o.total_amount||''}"/></div>
      <div class="nf-campo"><label>Qtd</label><input id="nfw-qtd" type="number" value="${o.quantity||1}"/></div>
      <div class="nf-campo" style="grid-column:1/-1"><label>Descrição do produto</label><input id="nfw-desc" value="${o.item_title||''}"/></div>
      <div class="nf-campo"><label>NCM</label><input id="nfw-ncm" placeholder="00000000"/></div>
      <div class="nf-campo"><label>Unidade</label><input id="nfw-un" value="UN"/></div>
    </div>
  </div>

  <!-- Ações -->
  <div style="display:flex;gap:10px;align-items:center">
    ${idx>0?`<button onclick="NF_FILA_IDX--;nfWizardRender()" style="background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:10px 18px;color:var(--txt2);cursor:pointer;font-size:12px;font-weight:600"><i class="ti ti-arrow-left"></i> Anterior</button>`:''}
    <button onclick="nfWizardEmitir(${idx})" class="btn primary" style="flex:1;height:42px;font-size:13px;font-weight:700"><i class="ti ti-file-check"></i> Emitir NF e ${idx<total-1?'avançar':'finalizar'}</button>
    <button onclick="nfWizardPular(${idx})" style="background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:10px 18px;color:var(--txt3);cursor:pointer;font-size:12px">Pular <i class="ti ti-arrow-right"></i></button>
  </div>
  <div id="nfw-result" style="margin-top:10px;font-size:12px"></div>`;

  // Busca CPF automaticamente para pedidos do ML
  if(o.platform==='mercadolivre') nfBuscarCpfML(o.platform_order_id||o.id);
}

// Busca CPF do comprador via backend (ML billing_info)
async function nfBuscarCpfML(orderId){
  const statusEl=document.getElementById('nfw-cpf-status');
  try {
    const d=await api(`/api/ml/billing/${orderId}`);
    if(d.ok && d.doc){
      const docInput=document.getElementById('nfw-dest-doc');
      const nomeInput=document.getElementById('nfw-dest-nome');
      if(docInput&&!docInput.value) docInput.value=d.doc;
      if(nomeInput&&!nomeInput.value&&d.buyer_name) nomeInput.value=d.buyer_name;
      // Preenche endereço se tiver campos
      if(d.address){
        const fields={
          'nfw-end-rua':d.address.street+' '+d.address.number,
          'nfw-end-bairro':d.address.neighborhood,
          'nfw-end-cidade':d.address.city,
          'nfw-end-uf':d.address.state,
          'nfw-end-cep':d.address.zip,
        };
        Object.entries(fields).forEach(([id,val])=>{const el=document.getElementById(id);if(el&&val?.trim())el.value=val.trim();});
      }
      if(statusEl)statusEl.innerHTML=`<i class="ti ti-circle-check" style="color:var(--green2)"></i> <span style="color:var(--green2)">CPF/CNPJ obtido do ML: <strong>${d.doc}</strong></span>`;
    } else {
      if(statusEl)statusEl.innerHTML=`<i class="ti ti-alert-circle" style="color:var(--yellow2)"></i> <span style="color:var(--yellow2)">CPF não disponível automaticamente. Preencha manualmente.</span>`;
    }
  } catch(e){
    const msg=e.message||'Erro';
    con
