import { useState, useMemo, useRef, useEffect } from "react";

// ── Florida helpers ──────────────────────────────────────────────
function calcFLTitle(amt){if(amt<=0)return 0;let t=0;if(amt<=100000)return amt/1000*5.75;t+=100000/1000*5.75;const r1=Math.min(amt-100000,900000);t+=r1/1000*5;if(amt<=1000000)return t;const r2=Math.min(amt-1000000,4000000);t+=r2/1000*2.5;if(amt<=5000000)return t;const r3=Math.min(amt-5000000,5000000);t+=r3/1000*2.25;if(amt<=10000000)return t;return t+(amt-10000000)/1000*2;}
const docStDeed=p=>Math.ceil(p/100)*0.70;
const docStMtg=l=>Math.ceil(l/100)*0.35;
const intangTax=l=>l*0.002;
function moPI(prin,rate,yrs){if(prin<=0||rate<=0||yrs<=0)return 0;const r=rate/100/12,n=yrs*12;return prin*(r*Math.pow(1+r,n))/(Math.pow(1+r,n)-1);}
function pmiCalc(loan,hp,lt){if(lt==="VA"||lt==="Cash")return 0;const ltv=loan/hp;if(lt==="FHA")return loan*0.0055/12;if(lt==="Conventional"&&ltv<=0.80)return 0;if(ltv>0.95)return loan*0.01/12;if(ltv>0.90)return loan*0.0075/12;if(ltv>0.85)return loan*0.005/12;return loan*0.003/12;}
function daysIntoYr(ds){if(!ds)return 180;const d=new Date(ds+"T12:00:00");return Math.floor((d-new Date(d.getFullYear(),0,1))/86400000);}
const fmt=n=>"$"+(Number(n)||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtW=n=>"$"+(Number(n)||0).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0});
const defDate=()=>{const d=new Date();d.setDate(d.getDate()+30);return d.toISOString().slice(0,10);};
const C={bdr:"#e2e4e9",text:"#1a1d26",mid:"#5a5f72",lt:"#9096a6",acc:"#2d5bff",accBg:"#eef2ff",grn:"#0d9f6e",grnBg:"#ecfdf5",red:"#dc2626",c1:"#2d5bff",c2:"#0d9f6e",c3:"#f59e0b",c4:"#ef4444",c5:"#8b5cf6",c6:"#06b6d4"};

// ── Donut ────────────────────────────────────────────────────────
function Donut({data,total,label,size=160}){
  const cx=size/2,cy=size/2,r=size*0.36,sw=size*0.14,circ=2*Math.PI*r;let off=0;
  return(<div style={{textAlign:"center"}}><svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8eaef" strokeWidth={sw}/>
    {data.filter(d=>d.v>0).map((d,i)=>{const pct=d.v/(total||1),dash=pct*circ,doff=-off*circ+circ*0.25;off+=pct;
      return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.c} strokeWidth={sw} strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={doff} style={{transition:"all 0.4s"}}/>;
    })}<text x={cx} y={cy-6} textAnchor="middle" style={{fontSize:"16px",fontWeight:700,fill:C.text,fontFamily:"monospace"}}>{fmtW(total)}</text>
    <text x={cx} y={cy+12} textAnchor="middle" style={{fontSize:"9px",fill:C.lt,textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}</text>
  </svg><div style={{display:"flex",flexWrap:"wrap",gap:"3px 10px",justifyContent:"center",marginTop:"4px"}}>
    {data.filter(d=>d.v>0).map((d,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:"3px",fontSize:"10px",color:C.mid}}>
      <span style={{width:7,height:7,borderRadius:"50%",background:d.c,flexShrink:0}}/>{d.l}</div>))}
  </div></div>);
}

// ── UI ───────────────────────────────────────────────────────────
function F({label,value,onChange,type="text",prefix,suffix,options,step,span2,small}){
  const s={width:"100%",padding:small?"8px 10px":"10px 12px",paddingLeft:prefix?"26px":"12px",paddingRight:suffix?"36px":"12px",
    border:`1px solid ${C.bdr}`,borderRadius:"8px",fontSize:small?"14px":"15px",background:"#fff",color:C.text,boxSizing:"border-box",WebkitAppearance:"none",outline:"none"};
  return(<div style={{marginBottom:small?"6px":"10px",gridColumn:span2?"1 / -1":undefined}}>
    <label style={{display:"block",fontSize:"11px",fontWeight:600,color:C.lt,marginBottom:"3px",textTransform:"uppercase",letterSpacing:"0.4px"}}>{label}</label>
    <div style={{position:"relative"}}>
      {prefix&&<span style={{position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",color:C.lt,fontSize:"13px",pointerEvents:"none"}}>{prefix}</span>}
      {options?<select value={value} onChange={e=>onChange(e.target.value)} style={{...s,cursor:"pointer"}}>
        {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}</select>
      :<input type={type} value={value} onChange={e=>onChange(e.target.value)} step={step} style={s}/>}
      {suffix&&<span style={{position:"absolute",right:"10px",top:"50%",transform:"translateY(-50%)",color:C.lt,fontSize:"12px",pointerEvents:"none"}}>{suffix}</span>}
    </div></div>);
}

// Linked % + $ field: auto-fills from %, but agent can override $
function PctDollarField({label,pct,onPctChange,dollar,onDollarChange,baseAmount}){
  return(<div style={{marginBottom:"10px",gridColumn:"1 / -1"}}>
    <label style={{display:"block",fontSize:"11px",fontWeight:600,color:C.lt,marginBottom:"3px",textTransform:"uppercase",letterSpacing:"0.4px"}}>{label}</label>
    <div style={{display:"flex",gap:"8px"}}>
      <div style={{position:"relative",flex:"0 0 80px"}}>
        <input type="number" value={pct} step="0.1"
          onChange={e=>{onPctChange(e.target.value);onDollarChange(String(Math.round(baseAmount*(parseFloat(e.target.value)||0)/100)));}}
          style={{width:"100%",padding:"8px 28px 8px 10px",border:`1px solid ${C.bdr}`,borderRadius:"8px",fontSize:"14px",background:"#fff",color:C.text,boxSizing:"border-box",outline:"none"}}/>
        <span style={{position:"absolute",right:"10px",top:"50%",transform:"translateY(-50%)",color:C.lt,fontSize:"12px",pointerEvents:"none"}}>%</span>
      </div>
      <div style={{position:"relative",flex:1}}>
        <span style={{position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",color:C.lt,fontSize:"13px",pointerEvents:"none"}}>$</span>
        <input type="number" value={dollar}
          onChange={e=>{onDollarChange(e.target.value);if(baseAmount>0)onPctChange(String(Math.round((parseFloat(e.target.value)||0)/baseAmount*10000)/100));}}
          style={{width:"100%",padding:"8px 10px 8px 26px",border:`1px solid ${C.bdr}`,borderRadius:"8px",fontSize:"14px",
            background:"#fff",color:C.text,boxSizing:"border-box",outline:"none"}}/>
      </div>
    </div>
  </div>);
}

function Row({label,value,indent,sub}){
  return(<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:sub?"3px 0":"5px 0",marginLeft:indent?14:0}}>
    <span style={{fontSize:sub?"12px":"13px",color:sub?C.lt:C.mid}}>{label}</span>
    <span style={{fontSize:"13px",fontWeight:500,color:C.mid,fontFamily:"monospace"}}>{value}</span></div>);
}
function Collapse({title,amount,children,open:io=false}){
  const [o,setO]=useState(io);
  return(<div style={{borderBottom:`1px solid ${C.bdr}`}}>
    <button onClick={()=>setO(!o)} style={{width:"100%",padding:"12px 0",background:"none",border:"none",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
      <span style={{fontSize:"13px",fontWeight:600,color:C.text}}>{title}</span>
      <span style={{display:"flex",alignItems:"center",gap:"8px"}}>
        <span style={{fontSize:"13px",fontWeight:600,color:C.text,fontFamily:"monospace"}}>{fmt(amount)}</span>
        <span style={{fontSize:"10px",color:C.lt,transform:o?"rotate(180deg)":"rotate(0)",transition:"transform 0.2s"}}>▼</span>
      </span></button>{o&&<div style={{paddingBottom:"10px"}}>{children}</div>}</div>);
}

// ── Text Report Overlay ──────────────────────────────────────────
function TextOverlay({text,onClose}){
  const ref=useRef(null);
  const [copied,setCopied]=useState(false);
  const selectAll=()=>{if(ref.current){ref.current.select();ref.current.focus();}};
  const tryCopy=()=>{
    if(ref.current){ref.current.select();}
    try{navigator.clipboard.writeText(text).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});}
    catch(e){document.execCommand('copy');setCopied(true);setTimeout(()=>setCopied(false),2000);}
  };
  useEffect(()=>{if(ref.current)ref.current.select();},[]);
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
    <div style={{background:"#fff",borderRadius:"12px",width:"100%",maxWidth:"460px",maxHeight:"80vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontWeight:700,fontSize:"14px"}}>Text Report</span>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:"20px",cursor:"pointer",color:C.mid,padding:"0 4px"}}>×</button>
      </div>
      <textarea ref={ref} readOnly value={text} style={{flex:1,padding:"14px",fontSize:"12px",fontFamily:"monospace",border:"none",resize:"none",outline:"none",color:C.text,lineHeight:"1.5",minHeight:"300px"}}/>
      <div style={{padding:"12px 16px",borderTop:`1px solid ${C.bdr}`,display:"flex",gap:"8px"}}>
        <button onClick={selectAll} style={{flex:1,padding:"11px",background:"#f3f4f6",border:"none",borderRadius:"8px",fontSize:"13px",fontWeight:600,cursor:"pointer",color:C.text}}>Select All</button>
        <button onClick={tryCopy} style={{flex:1,padding:"11px",background:copied?C.grn:"#1a1d26",color:"#fff",border:"none",borderRadius:"8px",fontSize:"13px",fontWeight:600,cursor:"pointer",transition:"background 0.2s"}}>
          {copied?"✓ Copied":"Copy"}</button>
      </div>
    </div></div>);
}

// ── Full Report Overlay (renders HTML inline) ────────────────────
function ReportOverlay({html,onClose}){
  const ref=useRef(null);
  useEffect(()=>{
    if(ref.current){
      const shadow=ref.current.attachShadow?ref.current.attachShadow({mode:"open"}):null;
      if(shadow){shadow.innerHTML=html;}else{ref.current.innerHTML=html;}
    }
  },[html]);
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:"12px"}}>
    <div style={{background:"#fafafa",borderRadius:"12px",width:"100%",maxWidth:"620px",maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <span style={{fontWeight:700,fontSize:"14px"}}>Full Report Preview</span>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:"20px",cursor:"pointer",color:C.mid,padding:"0 4px"}}>×</button>
      </div>
      <div style={{flex:1,overflow:"auto",padding:"8px"}} ref={ref}/>
    </div></div>);
}

// ── SVG donut for HTML ───────────────────────────────────────────
function svgD(data,tot,lbl){
  const sz=180,cx=90,cy=90,r=65,sw=25,circ=2*Math.PI*r;let off=0;
  const arcs=data.filter(d=>d.v>0).map(d=>{const pct=d.v/(tot||1),dash=pct*circ,doff=-off*circ+circ*0.25;off+=pct;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${d.c}" stroke-width="${sw}" stroke-dasharray="${dash} ${circ-dash}" stroke-dashoffset="${doff}"/>`;}).join("");
  const leg=data.filter(d=>d.v>0).map(d=>`<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px;font-size:11px;color:#5a5f72"><span style="width:8px;height:8px;border-radius:50%;background:${d.c};display:inline-block"></span>${d.l}: ${fmt(d.v)}</span>`).join("");
  return `<div style="text-align:center"><svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e8eaef" stroke-width="${sw}"/>${arcs}<text x="${cx}" y="${cy-6}" text-anchor="middle" style="font-size:18px;font-weight:700;fill:#1a1d26;font-family:monospace">${fmtW(tot)}</text><text x="${cx}" y="${cy+14}" text-anchor="middle" style="font-size:10px;fill:#9096a6;text-transform:uppercase;letter-spacing:0.5px">${lbl}</text></svg><div style="margin-top:4px">${leg}</div></div>`;
}
const htr=(l,v)=>v!==0?`<tr><td style="padding:4px 0;font-size:13px;color:#5a5f72">${l}</td><td style="padding:4px 0;font-size:13px;color:#1a1d26;text-align:right;font-family:monospace">${fmt(v)}</td></tr>`:"";
const hsh=(t,v)=>`<tr><td colspan="2" style="padding:12px 0 4px;font-size:14px;font-weight:700;color:#1a1d26;border-bottom:1px solid #e2e4e9">${t}<span style="float:right;font-family:monospace">${fmt(v)}</span></td></tr>`;

// ══════════════════════════════════════════════════════════════════
// BUYER
// ══════════════════════════════════════════════════════════════════
function BuyerCalc(){
  const [homePrice,setHP]=useState("350000");
  const [loanType,setLT]=useState("Conventional");
  const [downPct,setDP]=useState("20");
  const [rate,setRate]=useState("6.75");
  const [term,setTerm]=useState("30");
  const [bbPct,setBB]=useState("0");
  const [conc,setConc]=useState("0");
  const [misc,setMisc]=useState("0");
  const [hoa,setHOA]=useState("0");
  const [cd,setCD]=useState(defDate);
  const [showText,setShowText]=useState(false);
  const [showReport,setShowReport]=useState(false);

  const hp=parseFloat(homePrice)||0;
  const isCash=loanType==="Cash";

  // Editable insurance & tax with auto-fill
  const [insPct,setInsPct]=useState("1.5");
  const [insDollar,setInsDollar]=useState(String(Math.round(hp*0.015)));
  const [taxPct,setTaxPct]=useState("1.0");
  const [taxDollar,setTaxDollar]=useState(String(Math.round(hp*0.01)));

  // Re-calc auto values when price changes
  useEffect(()=>{
    const autoIns=Math.round(hp*(parseFloat(insPct)||0)/100);
    const autoTax=Math.round(hp*(parseFloat(taxPct)||0)/100);
    setInsDollar(String(autoIns));
    setTaxDollar(String(autoTax));
  },[homePrice]);

  const hazIns=parseFloat(insDollar)||0;
  const reTax=parseFloat(taxDollar)||0;

  const calc=useMemo(()=>{
    const dp=hp*(parseFloat(downPct)||0)/100;
    const loan=hp-dp;const r=parseFloat(rate)||0;const t=parseInt(term)||30;
    const bbFee=hp*(parseFloat(bbPct)||0)/100;const concAmt=parseFloat(conc)||0;const miscAmt=parseFloat(misc)||0;const hoaMo=parseFloat(hoa)||0;
    const pi=isCash?0:moPI(loan,r,t);const moTax=reTax/12;const moIns=hazIns/12;const pmi=isCash?0:pmiCalc(loan,hp,loanType);
    const totalMo=pi+moTax+moIns+pmi+hoaMo;
    const dailyInt=isCash?0:(loan*(r/100)/365);const prepInt=isCash?0:dailyInt*15;
    const insMo=isCash?0:14;const taxMo=isCash?0:4;
    const prepIns=(hazIns/12)*insMo;const prepTax=(reTax/12)*taxMo;const totalPre=prepInt+prepIns+prepTax;
    const end9=isCash?0:182.50;const end92=isCash?0:182.50;const end81=isCash?0:45;const closeFee=595;const taxSvc=isCash?0:78;const flood=isCash?0:20;
    const totalTitle=end9+end92+end81+closeFee+taxSvc+flood;
    let orig=0,termite=0,uw=0,survey=0,appr=0,credit=0;
    if(!isCash){orig=loan*0.01;termite=125;uw=495;survey=425;appr=loanType==="VA"?700:loanType==="FHA"?600:550;credit=65;}
    const totalLend=orig+termite+uw+survey+appr+credit;
    const dStMtg=isCash?0:docStMtg(loan);const intTax=isCash?0:intangTax(loan);const daysIn=daysIntoYr(cd);
    const taxRebate=(reTax/365)*daysIn;const recDeed=40;const recMtg=isCash?0:85;const dStDeed=isCash?docStDeed(hp):0;
    const totalGov=dStMtg+intTax-taxRebate+recDeed+recMtg+dStDeed;
    let mip=0,vaFee=0;if(loanType==="FHA")mip=loan*0.0175;
    if(loanType==="VA"){const dpP=parseFloat(downPct)||0;vaFee=loan*(dpP>=10?0.0125:dpP>=5?0.015:0.0215);}
    const totalLS=mip+vaFee;const totalBM=bbFee+miscAmt;
    const totalCC=totalTitle+totalLend+totalGov+totalLS+totalBM;
    const cashClose=isCash?hp+totalCC-concAmt:dp+totalPre+totalCC-concAmt;
    return{hp,dp,loan,pi,moTax,moIns,pmi,hoaMo,totalMo,prepInt,prepIns,prepTax,totalPre,insMo,taxMo,
      end9,end92,end81,closeFee,taxSvc,flood,totalTitle,orig,termite,uw,survey,appr,credit,totalLend,
      dStMtg,dStDeed,intTax,taxRebate,recDeed,recMtg,totalGov,mip,vaFee,totalLS,bbFee,miscAmt,totalBM,totalCC,concAmt,cashClose};
  },[hp,loanType,downPct,rate,term,bbPct,conc,misc,hazIns,reTax,hoa,cd,isCash]);

  const textReport=useMemo(()=>{const c=calc;return[
    `BUYER CLOSING COST ESTIMATE`,`${new Date().toLocaleDateString()}`,``,
    `Home Price: ${fmt(c.hp)} | ${loanType}${!isCash?` | ${downPct}% Down`:" | Cash"}`,
    !isCash?`Rate: ${rate}% | ${term}yr | Loan: ${fmt(c.loan)}`:null,`Close: ${cd}`,
    `Insurance: ${fmt(hazIns)}/yr | Taxes: ${fmt(reTax)}/yr`,``,
    !isCash?`MONTHLY PAYMENT: ${fmt(c.totalMo)}`:null,
    !isCash?`  P&I: ${fmt(c.pi)} | Tax: ${fmt(c.moTax)} | Ins: ${fmt(c.moIns)}${c.pmi>0?` | PMI: ${fmt(c.pmi)}`:""}${c.hoaMo>0?` | HOA: ${fmt(c.hoaMo)}`:""}`:null,
    !isCash?``:null,`CASH TO CLOSE: ${fmt(c.cashClose)}`,
    !isCash?`  Down: ${fmt(c.dp)} | Prepaids: ${fmt(c.totalPre)} | Costs: ${fmt(c.totalCC)}${c.concAmt>0?` | -${fmt(c.concAmt)} concession`:""}`
      :`  Purchase: ${fmt(c.hp)} | Costs: ${fmt(c.totalCC)}${c.concAmt>0?` | -${fmt(c.concAmt)} concession`:""}`,``,
    !isCash?`PREPAIDS & ESCROW: ${fmt(c.totalPre)}`:null,
    !isCash?`  Prepaid Interest (15 days): ${fmt(c.prepInt)}`:null,
    c.insMo>0?`  Hazard Insurance (${c.insMo}mo): ${fmt(c.prepIns)}`:null,
    c.taxMo>0?`  Tax Escrow (${c.taxMo}mo): ${fmt(c.prepTax)}`:null,!isCash?``:null,
    `TITLE FEES: ${fmt(c.totalTitle)}`,
    c.end9>0?`  Title Endorsement (Form 9): ${fmt(c.end9)}`:null,
    c.end92>0?`  Title Endorsement (Form 9.2): ${fmt(c.end92)}`:null,
    c.end81>0?`  Title Endorsement (8.1): ${fmt(c.end81)}`:null,
    `  Closing Fee: ${fmt(c.closeFee)}`,c.taxSvc>0?`  Tax Service Fee: ${fmt(c.taxSvc)}`:null,
    c.flood>0?`  Flood Certification: ${fmt(c.flood)}`:null,``,
    !isCash?`LENDER FEES: ${fmt(c.totalLend)}`:null,
    !isCash?`  Origination (1%): ${fmt(c.orig)}`:null,!isCash?`  Termite Inspection: ${fmt(c.termite)}`:null,
    !isCash?`  Underwriting: ${fmt(c.uw)}`:null,!isCash?`  Survey: ${fmt(c.survey)}`:null,
    !isCash?`  Appraisal: ${fmt(c.appr)}`:null,!isCash?`  Credit Report: ${fmt(c.credit)}`:null,!isCash?``:null,
    `GOV & RECORDING: ${fmt(c.totalGov)}`,
    c.dStMtg>0?`  Doc Stamps (Mortgage): ${fmt(c.dStMtg)}`:null,
    c.dStDeed>0?`  Doc Stamps (Deed): ${fmt(c.dStDeed)}`:null,
    c.intTax>0?`  Intangible Tax: ${fmt(c.intTax)}`:null,
    `  Pro-Rated Tax Rebate: -${fmt(c.taxRebate)}`,`  Recording (Deed): ${fmt(c.recDeed)}`,
    c.recMtg>0?`  Recording (Mortgage): ${fmt(c.recMtg)}`:null,
    c.mip>0?`\nFHA UPFRONT MIP (1.75%): ${fmt(c.mip)}`:null,
    c.vaFee>0?`\nVA FUNDING FEE: ${fmt(c.vaFee)}`:null,
    c.bbFee>0?`\nBUYER BROKER FEE: ${fmt(c.bbFee)}`:null,
    c.miscAmt>0?`MISC: ${fmt(c.miscAmt)}`:null,
    ``,`*Estimates | FL promulgated rates | Actual may vary*`
  ].filter(l=>l!==null).join("\n");},[calc,loanType,downPct,rate,term,cd,isCash,hazIns,reTax]);

  const htmlReport=useMemo(()=>{const c=calc;
    const moData=[{l:"P&I",v:c.pi,c:C.c1},{l:"Tax",v:c.moTax,c:C.c2},{l:"Ins",v:c.moIns,c:C.c3},{l:"PMI",v:c.pmi,c:C.c4},{l:"HOA",v:c.hoaMo,c:C.c5}];
    const cashData=isCash?[{l:"Purchase",v:c.hp,c:C.c1},{l:"Costs",v:c.totalCC,c:C.c3}]
      :[{l:"Down",v:c.dp,c:C.c1},{l:"Prepaids",v:c.totalPre,c:C.c2},{l:"Costs",v:c.totalCC,c:C.c3}];
    return `<div style="max-width:600px;margin:0 auto;font-family:-apple-system,'Segoe UI',sans-serif;color:#1a1d26">
<div style="text-align:center;margin-bottom:20px"><div style="font-size:20px;font-weight:700">Buyer Closing Cost Estimate</div>
<div style="font-size:12px;color:#9096a6;margin-top:2px">${new Date().toLocaleDateString()}</div></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;font-size:12px;color:#5a5f72;background:#f8f9fb;padding:12px;border-radius:8px">
<div><b>Home Price:</b> ${fmt(c.hp)}</div><div><b>Loan Type:</b> ${loanType}</div>
${!isCash?`<div><b>Down:</b> ${downPct}% (${fmt(c.dp)})</div><div><b>Loan:</b> ${fmt(c.loan)}</div><div><b>Rate:</b> ${rate}% &middot; ${term}yr</div>`:`<div><b>Cash Purchase</b></div>`}
<div><b>Close:</b> ${cd}</div><div><b>Insurance:</b> ${fmt(hazIns)}/yr</div><div><b>Taxes:</b> ${fmt(reTax)}/yr</div></div>
<div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-bottom:20px">
${!isCash?svgD(moData,c.totalMo,"Monthly Payment"):""}${svgD(cashData,c.cashClose>0?c.cashClose:1,"Cash to Close")}</div>
${!isCash?`<div style="background:#ecfdf5;border-radius:8px;padding:12px;margin-bottom:8px;text-align:center"><div style="font-size:10px;font-weight:600;color:#0d9f6e;text-transform:uppercase">Monthly Payment (PITI${c.pmi>0?"+PMI":""})</div><div style="font-size:24px;font-weight:700;color:#065f46;font-family:monospace">${fmt(c.totalMo)}</div></div>`:""}
<div style="background:#eef2ff;border-radius:8px;padding:12px;margin-bottom:16px;text-align:center"><div style="font-size:10px;font-weight:600;color:#2d5bff;text-transform:uppercase">Cash to Close</div><div style="font-size:24px;font-weight:700;color:#1e3a8a;font-family:monospace">${fmt(c.cashClose)}</div>
${!isCash?`<div style="font-size:11px;color:#5a5f72;margin-top:2px">Down: ${fmt(c.dp)} &middot; Prepaids: ${fmt(c.totalPre)} &middot; Costs: ${fmt(c.totalCC)}${c.concAmt>0?` &middot; -${fmt(c.concAmt)}`:""}</div>`
:`<div style="font-size:11px;color:#5a5f72;margin-top:2px">Purchase: ${fmt(c.hp)} &middot; Costs: ${fmt(c.totalCC)}${c.concAmt>0?` &middot; -${fmt(c.concAmt)}`:""}</div>`}</div>
<table style="width:100%;border-collapse:collapse">
${!isCash?`${hsh("Prepaids & Escrow",c.totalPre)}${htr("Prepaid Interest (15 days)",c.prepInt)}${htr(`Hazard Insurance (${c.insMo}mo)`,c.prepIns)}${htr(`Property Tax Escrow (${c.taxMo}mo)`,c.prepTax)}`:""}
${hsh("Title Fees",c.totalTitle)}${htr("Title Endorsement (Form 9)",c.end9)}${htr("Title Endorsement (Form 9.2)",c.end92)}${htr("Title Endorsement (8.1)",c.end81)}${htr("Closing Fee",c.closeFee)}${htr("Tax Service Fee",c.taxSvc)}${htr("Flood Certification",c.flood)}
${!isCash?`${hsh("Lender Fees",c.totalLend)}${htr("Origination Fee (1%)",c.orig)}${htr("Termite Inspection",c.termite)}${htr("Underwriting",c.uw)}${htr("Survey",c.survey)}${htr("Appraisal",c.appr)}${htr("Credit Report",c.credit)}`:""}
${hsh("Government & Recording",c.totalGov)}${htr("Doc Stamps (Mortgage)",c.dStMtg)}${htr("Doc Stamps (Deed)",c.dStDeed)}${htr("Intangible Tax",c.intTax)}${htr("Pro-Rated Tax Rebate",-c.taxRebate)}${htr("Recording (Deed)",c.recDeed)}${htr("Recording (Mortgage)",c.recMtg)}
${c.totalLS>0?`${hsh("Loan-Specific Fees",c.totalLS)}${c.mip>0?htr("FHA Upfront MIP (1.75%)",c.mip):""}${c.vaFee>0?htr("VA Funding Fee",c.vaFee):""}`:""}
${c.totalBM>0?`${hsh("Other",c.totalBM)}${c.bbFee>0?htr("Buyer Broker Fee",c.bbFee):""}${c.miscAmt>0?htr("Misc",c.miscAmt):""}`:""}
</table><div style="margin-top:16px;padding-top:12px;border-top:1px solid #e2e4e9;font-size:10px;color:#9096a6;text-align:center">*Estimates based on FL promulgated rates &middot; Actual costs may vary &middot; Not a commitment to lend.*</div></div>`;
  },[calc,loanType,downPct,rate,term,cd,isCash,hazIns,reTax]);

  return(<div>
    {showText&&<TextOverlay text={textReport} onClose={()=>setShowText(false)}/>}
    {showReport&&<ReportOverlay html={htmlReport} onClose={()=>setShowReport(false)}/>}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 10px"}}>
      <F label="Home Price" value={homePrice} onChange={setHP} prefix="$" type="number" span2/>
      <F label="Loan Type" value={loanType} onChange={v=>{setLT(v);if(v==="Cash"){setDP("100");setRate("0");}else if(v==="VA")setDP("0");else if(v==="FHA")setDP("3.5");else setDP("20");}} options={["Conventional","FHA","VA","Cash"]}/>
      {!isCash&&<F label="Down Payment" value={downPct} onChange={setDP} suffix="%" type="number" step="0.5"/>}
      {!isCash&&<F label="Interest Rate" value={rate} onChange={setRate} suffix="%" type="number" step="0.125"/>}
      {!isCash&&<F label="Term" value={term} onChange={setTerm} options={[{value:"30",label:"30 yr"},{value:"25",label:"25 yr"},{value:"20",label:"20 yr"},{value:"15",label:"15 yr"}]}/>}
      <PctDollarField label="Hazard Insurance /yr" pct={insPct} onPctChange={setInsPct} dollar={insDollar} onDollarChange={setInsDollar} baseAmount={hp}/>
      <PctDollarField label="RE Taxes /yr" pct={taxPct} onPctChange={setTaxPct} dollar={taxDollar} onDollarChange={setTaxDollar} baseAmount={hp}/>
      <F label="Buyer Broker Fee" value={bbPct} onChange={setBB} suffix="%" type="number" step="0.25"/>
      <F label="Seller Concession" value={conc} onChange={setConc} prefix="$" type="number"/>
      <F label="HOA /mo" value={hoa} onChange={setHOA} prefix="$" type="number"/>
      <F label="Misc" value={misc} onChange={setMisc} prefix="$" type="number"/>
      <F label="Closing Date" value={cd} onChange={setCD} type="date" span2/>
    </div>

    <div style={{display:"flex",gap:"8px",justifyContent:"center",marginBottom:"8px"}}>
      {!isCash&&<Donut data={[{l:"P&I",v:calc.pi,c:C.c1},{l:"Tax",v:calc.moTax,c:C.c2},{l:"Ins",v:calc.moIns,c:C.c3},
        ...(calc.pmi>0?[{l:"PMI",v:calc.pmi,c:C.c4}]:[]),...(calc.hoaMo>0?[{l:"HOA",v:calc.hoaMo,c:C.c5}]:[])
      ]} total={calc.totalMo} label="Monthly" size={148}/>}
      <Donut data={isCash?[{l:"Purchase",v:calc.hp,c:C.c1},{l:"Costs",v:calc.totalCC,c:C.c3}]
        :[{l:"Down",v:calc.dp,c:C.c1},{l:"Prepaids",v:calc.totalPre,c:C.c2},{l:"Costs",v:calc.totalCC,c:C.c3}]
      } total={calc.cashClose>0?calc.cashClose:1} label="Cash to Close" size={148}/>
    </div>

    {!isCash&&<div style={{background:C.grnBg,borderRadius:"10px",padding:"14px",marginTop:"8px",textAlign:"center"}}>
      <div style={{fontSize:"10px",fontWeight:600,color:C.grn,textTransform:"uppercase",letterSpacing:"0.5px"}}>Monthly Payment (PITI{calc.pmi>0?"+PMI":""})</div>
      <div style={{fontSize:"26px",fontWeight:700,color:"#065f46",fontFamily:"monospace"}}>{fmt(calc.totalMo)}</div></div>}
    <div style={{background:C.accBg,borderRadius:"10px",padding:"14px",marginTop:"8px",textAlign:"center"}}>
      <div style={{fontSize:"10px",fontWeight:600,color:C.acc,textTransform:"uppercase",letterSpacing:"0.5px"}}>Cash to Close</div>
      <div style={{fontSize:"26px",fontWeight:700,color:"#1e3a8a",fontFamily:"monospace"}}>{fmt(calc.cashClose)}</div>
      {!isCash?<div style={{fontSize:"11px",color:C.mid,marginTop:"2px"}}>Down: {fmt(calc.dp)} · Prepaids: {fmt(calc.totalPre)} · Costs: {fmt(calc.totalCC)}</div>
      :<div style={{fontSize:"11px",color:C.mid,marginTop:"2px"}}>Purchase: {fmt(calc.hp)} · Costs: {fmt(calc.totalCC)}</div>}
    </div>

    <div style={{marginTop:"16px",background:"#fff",borderRadius:"10px",border:`1px solid ${C.bdr}`,padding:"0 14px"}}>
      {!isCash&&<Collapse title="Prepaids & Escrow" amount={calc.totalPre} open>
        <Row label="Prepaid Interest (15 days)" value={fmt(calc.prepInt)} indent/>
        <Row label={`Hazard Insurance (${calc.insMo}mo)`} value={fmt(calc.prepIns)} indent/>
        <Row label={`Property Tax Escrow (${calc.taxMo}mo)`} value={fmt(calc.prepTax)} indent/>
      </Collapse>}
      <Collapse title="Title Fees" amount={calc.totalTitle} open={isCash}>
        {calc.end9>0&&<Row label="Title Endorsement (Form 9)" value={fmt(calc.end9)} indent/>}
        {calc.end92>0&&<Row label="Title Endorsement (Form 9.2)" value={fmt(calc.end92)} indent/>}
        {calc.end81>0&&<Row label="Title Endorsement (8.1)" value={fmt(calc.end81)} indent/>}
        <Row label="Closing Fee" value={fmt(calc.closeFee)} indent/>
        {calc.taxSvc>0&&<Row label="Tax Service Fee" value={fmt(calc.taxSvc)} indent/>}
        {calc.flood>0&&<Row label="Flood Certification" value={fmt(calc.flood)} indent/>}
      </Collapse>
      {!isCash&&<Collapse title="Lender Fees" amount={calc.totalLend}>
        <Row label="Origination Fee (1%)" value={fmt(calc.orig)} indent/>
        <Row label="Termite Inspection" value={fmt(calc.termite)} indent/>
        <Row label="Underwriting" value={fmt(calc.uw)} indent/>
        <Row label="Survey" value={fmt(calc.survey)} indent/>
        <Row label="Appraisal" value={fmt(calc.appr)} indent/>
        <Row label="Credit Report" value={fmt(calc.credit)} indent/>
      </Collapse>}
      <Collapse title="Government & Recording" amount={calc.totalGov}>
        {calc.dStMtg>0&&<Row label="Doc Stamps (Mortgage)" value={fmt(calc.dStMtg)} indent/>}
        {calc.dStDeed>0&&<Row label="Doc Stamps (Deed)" value={fmt(calc.dStDeed)} indent/>}
        {calc.intTax>0&&<Row label="Intangible Tax" value={fmt(calc.intTax)} indent/>}
        <Row label="Pro-Rated Tax Rebate" value={`-${fmt(calc.taxRebate)}`} indent/>
        <Row label="Recording (Deed)" value={fmt(calc.recDeed)} indent/>
        {calc.recMtg>0&&<Row label="Recording (Mortgage)" value={fmt(calc.recMtg)} indent/>}
      </Collapse>
      {calc.totalLS>0&&<Collapse title="Loan-Specific Fees" amount={calc.totalLS}>
        {calc.mip>0&&<Row label="FHA Upfront MIP (1.75%)" value={fmt(calc.mip)} indent/>}
        {calc.vaFee>0&&<Row label="VA Funding Fee" value={fmt(calc.vaFee)} indent/>}
      </Collapse>}
      {calc.totalBM>0&&<Collapse title="Other" amount={calc.totalBM}>
        {calc.bbFee>0&&<Row label="Buyer Broker Fee" value={fmt(calc.bbFee)} indent/>}
        {calc.miscAmt>0&&<Row label="Misc" value={fmt(calc.miscAmt)} indent/>}
      </Collapse>}
    </div>

    <div style={{display:"flex",gap:"8px",marginTop:"16px"}}>
      <button onClick={()=>setShowText(true)} style={{flex:1,padding:"13px",background:"#1a1d26",color:"#fff",border:"none",borderRadius:"10px",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>
        Copy Text Report</button>
      <button onClick={()=>setShowReport(true)} style={{flex:1,padding:"13px",background:C.acc,color:"#fff",border:"none",borderRadius:"10px",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>
        Full Report</button>
    </div></div>);
}

// ══════════════════════════════════════════════════════════════════
// SELLER
// ══════════════════════════════════════════════════════════════════
function SellerCalc(){
  const [sp,setSP]=useState("350000");
  const [sbPct,setSB]=useState("3");
  const [bbPct,setBB]=useState("3");
  const [conc,setConc]=useState("0");
  const [misc,setMisc]=useState("0");
  const [bal,setBal]=useState("200000");
  const [hasHOA,setHOA]=useState("No");
  const [cd,setCD]=useState(defDate);
  const [showText,setShowText]=useState(false);
  const [showReport,setShowReport]=useState(false);

  const saleP=parseFloat(sp)||0;
  const [taxPct,setTaxPct]=useState("1.0");
  const [taxDollar,setTaxDollar]=useState(String(Math.round(saleP*0.01)));
  useEffect(()=>{setTaxDollar(String(Math.round(saleP*(parseFloat(taxPct)||0)/100)));},[sp]);
  const reTax=parseFloat(taxDollar)||0;

  const calc=useMemo(()=>{
    const balance=parseFloat(bal)||0;const concAmt=parseFloat(conc)||0;const miscAmt=parseFloat(misc)||0;
    const sbFee=saleP*(parseFloat(sbPct)||0)/100;const bbFee=saleP*(parseFloat(bbPct)||0)/100;
    const daysIn=daysIntoYr(cd);const dailyTax=reTax/365;const proTax=dailyTax*daysIn;
    const ownerTitle=calcFLTitle(saleP);const search=150;const closeFee=595;const lien=199;
    const estoppel=hasHOA==="Yes"?250:0;const totalTitle=ownerTitle+search+closeFee+lien+estoppel;
    const docSt=docStDeed(saleP);const totalGov=docSt;
    const totalComm=sbFee+bbFee;const totalOther=concAmt+miscAmt;
    const totalCC=totalTitle+totalGov+totalComm+totalOther;const net=saleP-balance-proTax-totalCC;
    return{saleP,balance,proTax,dailyTax,daysIn,ownerTitle,search,closeFee,lien,estoppel,totalTitle,
      docSt,totalGov,sbFee,bbFee,totalComm,concAmt,miscAmt,totalOther,totalCC,net};
  },[saleP,sbPct,bbPct,conc,misc,reTax,bal,hasHOA,cd]);

  const textReport=useMemo(()=>{const c=calc;return[
    `SELLER NET SHEET`,`${new Date().toLocaleDateString()}`,``,
    `Sale Price: ${fmt(c.saleP)} | Close: ${cd}`,`Taxes: ${fmt(reTax)}/yr`,``,
    `Sale Price:        ${fmt(c.saleP)}`,`Loan Balance:     -${fmt(c.balance)}`,
    `Pro-Rated Taxes:  -${fmt(c.proTax)}`,`Closing Costs:    -${fmt(c.totalCC)}`,
    `───────────────────────────`,`NET AT CLOSE:      ${fmt(c.net)}`,``,
    `TITLE FEES: ${fmt(c.totalTitle)}`,`  Owner's Title Insurance: ${fmt(c.ownerTitle)}`,
    `  Search Fee: ${fmt(c.search)}`,`  Closing Fee: ${fmt(c.closeFee)}`,`  Lien Search: ${fmt(c.lien)}`,
    c.estoppel>0?`  HOA Estoppel: ${fmt(c.estoppel)}`:null,``,
    `GOVERNMENT: ${fmt(c.totalGov)}`,`  Doc Stamps on Deed: ${fmt(c.docSt)}`,``,
    `BROKERAGE: ${fmt(c.totalComm)}`,`  Seller Broker: ${fmt(c.sbFee)}`,`  Buyer Broker: ${fmt(c.bbFee)}`,
    c.totalOther>0?`\nOTHER: ${fmt(c.totalOther)}`:null,
    c.concAmt>0?`  Concession: ${fmt(c.concAmt)}`:null,c.miscAmt>0?`  Misc: ${fmt(c.miscAmt)}`:null,``,
    `PRO-RATED TAXES: ${fmt(c.proTax)}`,`  ${c.daysIn} days @ ${fmt(c.dailyTax)}/day`,``,
    `*Estimates | FL promulgated rates*`
  ].filter(l=>l!==null).join("\n");},[calc,cd,reTax]);

  const htmlReport=useMemo(()=>{const c=calc;
    const data=[{l:"Net",v:Math.max(c.net,0),c:C.c2},{l:"Payoff",v:c.balance,c:C.c1},{l:"Costs",v:c.totalCC,c:C.c3},{l:"Taxes",v:c.proTax,c:C.c4}];
    return `<div style="max-width:600px;margin:0 auto;font-family:-apple-system,'Segoe UI',sans-serif;color:#1a1d26">
<div style="text-align:center;margin-bottom:20px"><div style="font-size:20px;font-weight:700">Seller Net Sheet</div>
<div style="font-size:12px;color:#9096a6;margin-top:2px">${new Date().toLocaleDateString()}</div></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;font-size:12px;color:#5a5f72;background:#f8f9fb;padding:12px;border-radius:8px">
<div><b>Sale Price:</b> ${fmt(c.saleP)}</div><div><b>Close:</b> ${cd}</div>
<div><b>Loan Balance:</b> ${fmt(c.balance)}</div><div><b>Taxes:</b> ${fmt(reTax)}/yr</div></div>
<div style="text-align:center;margin-bottom:20px">${svgD(data,c.saleP,"Sale Breakdown")}</div>
<div style="background:${c.net>=0?"#ecfdf5":"#fef2f2"};border-radius:8px;padding:14px;margin-bottom:16px">
<table style="width:100%;font-size:13px;color:#5a5f72"><tr><td>Sale Price</td><td style="text-align:right;font-family:monospace;color:#1a1d26">${fmt(c.saleP)}</td></tr>
<tr><td>Less: Loan Balance</td><td style="text-align:right;font-family:monospace">-${fmt(c.balance)}</td></tr>
<tr><td>Less: Pro-Rated Taxes</td><td style="text-align:right;font-family:monospace">-${fmt(c.proTax)}</td></tr>
<tr><td>Less: Closing Costs</td><td style="text-align:right;font-family:monospace">-${fmt(c.totalCC)}</td></tr>
<tr><td colspan="2" style="border-top:2px solid ${c.net>=0?"#065f46":"#dc2626"};padding-top:8px">
<b style="color:${c.net>=0?"#065f46":"#dc2626"};font-size:16px">NET AT CLOSE: <span style="float:right;font-family:monospace">${fmt(c.net)}</span></b></td></tr></table></div>
<table style="width:100%;border-collapse:collapse">
${hsh("Title Fees",c.totalTitle)}${htr("Owner's Title Insurance",c.ownerTitle)}${htr("Search Fee",c.search)}${htr("Closing Fee",c.closeFee)}${htr("Municipal Lien Search",c.lien)}${c.estoppel>0?htr("HOA Estoppel",c.estoppel):""}
${hsh("Government",c.totalGov)}${htr("Doc Stamps on Deed ($0.70/$100)",c.docSt)}
${hsh("Brokerage Fees",c.totalComm)}${htr("Seller Broker Fee",c.sbFee)}${htr("Buyer Broker Fee",c.bbFee)}
${c.totalOther>0?`${hsh("Other",c.totalOther)}${c.concAmt>0?htr("Seller Concession",c.concAmt):""}${c.miscAmt>0?htr("Misc",c.miscAmt):""}`:""}
${hsh("Pro-Rated Taxes",c.proTax)}${htr(`${c.daysIn} days @ ${fmt(c.dailyTax)}/day`,c.proTax)}
</table><div style="margin-top:16px;padding-top:12px;border-top:1px solid #e2e4e9;font-size:10px;color:#9096a6;text-align:center">*Estimates based on FL promulgated rates &middot; Actual costs may vary.*</div></div>`;
  },[calc,cd,reTax]);

  return(<div>
    {showText&&<TextOverlay text={textReport} onClose={()=>setShowText(false)}/>}
    {showReport&&<ReportOverlay html={htmlReport} onClose={()=>setShowReport(false)}/>}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 10px"}}>
      <F label="Sale Price" value={sp} onChange={setSP} prefix="$" type="number" span2/>
      <F label="Seller Broker Fee" value={sbPct} onChange={setSB} suffix="%" type="number" step="0.25"/>
      <F label="Buyer Broker Fee" value={bbPct} onChange={setBB} suffix="%" type="number" step="0.25"/>
      <PctDollarField label="RE Taxes /yr" pct={taxPct} onPctChange={setTaxPct} dollar={taxDollar} onDollarChange={setTaxDollar} baseAmount={saleP}/>
      <F label="Seller Concession" value={conc} onChange={setConc} prefix="$" type="number"/>
      <F label="Misc" value={misc} onChange={setMisc} prefix="$" type="number"/>
      <F label="Seller Loan Balance" value={bal} onChange={setBal} prefix="$" type="number"/>
      <F label="HOA?" value={hasHOA} onChange={setHOA} options={["No","Yes"]}/>
      <F label="Closing Date" value={cd} onChange={setCD} type="date" span2/>
    </div>

    <Donut data={[{l:"Net",v:Math.max(calc.net,0),c:C.c2},{l:"Payoff",v:calc.balance,c:C.c1},{l:"Costs",v:calc.totalCC,c:C.c3},{l:"Taxes",v:calc.proTax,c:C.c4}]} total={calc.saleP} label="Sale Breakdown" size={170}/>

    <div style={{background:calc.net>=0?C.grnBg:"#fef2f2",borderRadius:"10px",padding:"14px",marginTop:"12px"}}>
      <Row label="Sale Price" value={fmt(calc.saleP)}/><Row label="Less: Loan Balance" value={`-${fmt(calc.balance)}`}/>
      <Row label="Less: Pro-Rated Taxes" value={`-${fmt(calc.proTax)}`}/><Row label="Less: Closing Costs" value={`-${fmt(calc.totalCC)}`}/>
      <div style={{borderTop:`2px solid ${calc.net>=0?"#065f46":C.red}`,marginTop:"8px",paddingTop:"8px",display:"flex",justifyContent:"space-between"}}>
        <span style={{fontSize:"14px",fontWeight:700,color:calc.net>=0?"#065f46":C.red}}>NET AT CLOSE</span>
        <span style={{fontSize:"22px",fontWeight:700,color:calc.net>=0?"#065f46":C.red,fontFamily:"monospace"}}>{fmt(calc.net)}</span></div></div>

    <div style={{marginTop:"16px",background:"#fff",borderRadius:"10px",border:`1px solid ${C.bdr}`,padding:"0 14px"}}>
      <Collapse title="Title Fees" amount={calc.totalTitle} open>
        <Row label="Owner's Title Insurance" value={fmt(calc.ownerTitle)} indent/>
        <Row label="Search Fee" value={fmt(calc.search)} indent/>
        <Row label="Closing Fee" value={fmt(calc.closeFee)} indent/>
        <Row label="Municipal Lien Search" value={fmt(calc.lien)} indent/>
        {calc.estoppel>0&&<Row label="HOA Estoppel Letter" value={fmt(calc.estoppel)} indent/>}
      </Collapse>
      <Collapse title="Government" amount={calc.totalGov}>
        <Row label="Doc Stamps on Deed ($0.70/$100)" value={fmt(calc.docSt)} indent/>
      </Collapse>
      <Collapse title="Brokerage Fees" amount={calc.totalComm}>
        <Row label="Seller Broker Fee" value={fmt(calc.sbFee)} indent/>
        <Row label="Buyer Broker Fee" value={fmt(calc.bbFee)} indent/>
      </Collapse>
      {calc.totalOther>0&&<Collapse title="Other" amount={calc.totalOther}>
        {calc.concAmt>0&&<Row label="Seller Concession" value={fmt(calc.concAmt)} indent/>}
        {calc.miscAmt>0&&<Row label="Misc" value={fmt(calc.miscAmt)} indent/>}
      </Collapse>}
      <Collapse title="Pro-Rated Taxes" amount={calc.proTax}>
        <Row label={`${calc.daysIn} days into year`} value={fmt(calc.proTax)} indent/>
        <Row label="Daily rate" value={fmt(calc.dailyTax)} indent sub/>
      </Collapse>
    </div>

    <div style={{display:"flex",gap:"8px",marginTop:"16px"}}>
      <button onClick={()=>setShowText(true)} style={{flex:1,padding:"13px",background:"#1a1d26",color:"#fff",border:"none",borderRadius:"10px",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>
        Copy Text Report</button>
      <button onClick={()=>setShowReport(true)} style={{flex:1,padding:"13px",background:C.acc,color:"#fff",border:"none",borderRadius:"10px",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>
        Full Report</button>
    </div></div>);
}

// ── MAIN ─────────────────────────────────────────────────────────
export default function App(){
  const [tab,setTab]=useState("buyer");
  return(<div style={{maxWidth:"480px",margin:"0 auto",fontFamily:"'SF Pro Text',-apple-system,'Segoe UI',sans-serif",color:C.text,padding:"12px",minHeight:"100vh"}}>
    <div style={{textAlign:"center",marginBottom:"14px"}}>
      <div style={{fontSize:"18px",fontWeight:700}}>Closing Cost Calculator</div>
      <div style={{fontSize:"11px",color:C.lt,marginTop:"2px"}}>NE Florida</div></div>
    <div style={{display:"flex",background:"#f0f1f5",borderRadius:"10px",padding:"3px",marginBottom:"14px"}}>
      {[["buyer","Buyer"],["seller","Seller"]].map(([k,l])=>(
        <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"10px",border:"none",borderRadius:"8px",
          background:tab===k?"#fff":"transparent",boxShadow:tab===k?"0 1px 3px rgba(0,0,0,0.08)":"none",
          fontWeight:600,fontSize:"13px",cursor:"pointer",color:tab===k?C.text:C.lt,textTransform:"uppercase",letterSpacing:"0.5px"}}>{l}</button>))}
    </div>
    {tab==="buyer"?<BuyerCalc/>:<SellerCalc/>}
    <div style={{textAlign:"center",fontSize:"10px",color:"#d1d5db",marginTop:"20px",paddingBottom:"12px"}}>Estimates only · FL promulgated rates · Actual costs may vary</div>
  </div>);
}
