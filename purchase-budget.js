(function() {
  'use strict';
  const catalog = window.PURCHASE_CATALOG, calc = window.PurchaseBudget, bridge=window.PurchasePlan, library=window.HOUSE_PLANS;
  const $ = selector => document.querySelector(selector);
  if (!catalog || !calc || !bridge || !library) { $('#loadError').hidden = false; return; }
  const products = new Map(catalog.products.map(p => [p.id, p]));
  const categories = new Set(catalog.categories.map(c => c.id));
  const storageKey = 'warm-timber-purchase-budget-v1';
  const currency = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' });
  const format = cents => currency.format(cents / 100);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => globalThis.crypto?.randomUUID?.() || 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  let messageTimer, storageProblem = '', roomFilter='living';
  const params=new URLSearchParams(location.search),requestedScheme=library.schemes[params.get('scheme')]?params.get('scheme'):library.defaultScheme;
  const row = (name, category, included = false) => ({ id:uid(), name, category, included, productId:'', customModel:'', quantity:'1', unitPrice:'', fee:'' });
  function layout(id=requestedScheme){
    try{const snap=JSON.parse(localStorage.getItem(bridge.KEY+id));if(snap?.version===1&&snap.schemeId===id&&Array.isArray(snap.groups)&&Array.isArray(snap.rooms))return snap;}catch{}
    return bridge.fromLibrary(library,id,localStorage);
  }
  function newPlan(name) {
    const snap=layout();const p={id:uid(),name:name||snap.schemeName+' · 购买预算',limit:'',rows:[],sourceSchemeId:requestedScheme};bridge.sync(p,snap,row,products);return p;
  }
  function cleanState(input) {
    if (!input || input.version !== 1 || !Array.isArray(input.plans) || !input.plans.length || input.plans.length > 20) throw Error('备份格式不正确，或方案超过 20 套。');
    const string = (v, max) => { if (typeof v !== 'string' || v.length > max) throw Error('备份中的文字或数字格式不正确。'); return v; };
    const plans = input.plans.map(p => {
      if (!p || typeof p !== 'object') throw Error('备份中的方案格式不正确。');
      if (!Array.isArray(p.rows) || p.rows.length > 200) throw Error('每个方案最多支持 200 行。');
      return { id:string(p.id,100), name:string(p.name,60), limit:string(p.limit,30), rows:p.rows.map(r => {
        if (!r || typeof r !== 'object') throw Error('备份中的清单项目格式不正确。');
        if (!categories.has(r.category) || (r.productId && !products.has(r.productId)) || typeof r.included !== 'boolean') throw Error('备份中有无法识别的分类或型号。');
        if (r.productId && products.get(r.productId).category !== r.category) throw Error('备份中的分类与型号不一致。');
        const cleaned={id:uid(), name:string(r.name,160), category:r.category, included:r.included, productId:string(r.productId,60),customModel:string(r.customModel||'',160), quantity:string(r.quantity,10), unitPrice:string(r.unitPrice,30), fee:string(r.fee,30)};
        if(r.sourceKey){Object.assign(cleaned,{sourceKey:string(r.sourceKey,1500),sourceIds:(r.sourceIds||[]).map(id=>string(id,160)),sourceType:string(r.sourceType||'',80),roomId:string(r.roomId||'',100),roomName:string(r.roomName||'',160),roomArea:Number.isFinite(r.roomArea)?r.roomArea:null,size:{width:Number(r.size?.width)||0,depth:Number(r.size?.depth)||0,height:Number(r.size?.height)||0},owned:r.owned===true,color:String(r.color||'#d8c8b3'),mattress:Array.isArray(r.mattress)?r.mattress.slice(0,3).map(Number):null});}
        return cleaned;
      }) };
    });
    input.plans.forEach((p,i)=>{if(library.schemes[p.sourceSchemeId])Object.assign(plans[i],{sourceSchemeId:p.sourceSchemeId,sourceSchemeName:String(p.sourceSchemeName||''),sourceSignature:String(p.sourceSignature||''),sourceArchive:Array.isArray(p.sourceArchive)?p.sourceArchive.slice(-500).map(r=>({name:String(r.name||'').slice(0,160),unitPrice:String(r.unitPrice||'').slice(0,30),fee:String(r.fee||'').slice(0,30),quantity:String(r.quantity||'').slice(0,10),customModel:String(r.customModel||'').slice(0,160),productId:products.has(r.productId)?r.productId:'',archivedReason:String(r.archivedReason||'').slice(0,160)})):[]});});
    if (new Set(plans.map(p => p.id)).size !== plans.length) throw Error('备份中的方案编号重复。');
    return {version:1,activeId:plans.some(p => p.id === input.activeId) ? input.activeId : plans[0].id,plans};
  }
  let state;
  try { const raw = localStorage.getItem(storageKey); if (raw) state = cleanState(JSON.parse(raw)); }
  catch(e) { storageProblem = '已打开新方案；原保存数据未能读取。'; }
  if (!state) { const first = newPlan(); state = {version:1, activeId:first.id, plans:[first]}; }
  const previousActive=state.plans.find(p=>p.id===state.activeId);
  if(previousActive?.sourceSchemeId!==requestedScheme){let bound=state.plans.find(p=>p.sourceSchemeId===requestedScheme);if(!bound&&state.plans.length<20){bound=newPlan();state.plans.push(bound);}if(bound)state.activeId=bound.id;}
  for(const p of state.plans)if(p.sourceSchemeId)bridge.sync(p,layout(p.sourceSchemeId),row,products);
  const active = () => state.plans.find(p => p.id === state.activeId);
  function message(text) {
    $('#message').textContent = text; $('#message').hidden = false;
    clearTimeout(messageTimer); messageTimer = setTimeout(() => $('#message').hidden = true, 4000);
  }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); storageProblem = ''; $('#saveStatus').textContent = '已保存在当前浏览器'; }
    catch(e) { storageProblem = '保存失败，请下载备份留存。'; $('#saveStatus').textContent = storageProblem; }
  }
  function productOptions(r) {
    const list = catalog.products.filter(p => bridge.eligible(p,r));
    return `<option value="">${r.category === 'furniture' ? '型号库未收录，可在下方自填' : !list.length ? '当前面积没有匹配候选，可自填型号询价' : '请选择型号 / 或直接自填型号'}</option>` + list.map(p => `<option value="${escape(p.id)}" ${p.id === r.productId ? 'selected' : ''}>${escape(p.name)}${p.price === null ? ' · 价格待核' : ' · 参考 ' + format(Math.round(p.price * 100))}</option>`).join('');
  }
  function filterNote(r){
    if(r.category!=='ac')return '';
    const n=catalog.products.filter(p=>bridge.eligible(p,r)).length;
    const kind=bridge.acKind(r),label=kind==='floor'?'仅显示立式柜机':kind==='wall'?'仅显示壁挂式':'手动添加 · 全部机型';
    return `<p class="ac-filter-note ${n?'':'no-match'}">${label}${Number.isFinite(r.roomArea)?' · 当前模型面积 '+r.roomArea.toFixed(2)+'㎡':r.sourceKey?' · 所属房间面积未取得':''} · ${n} 个候选${!n?'。现有候选没有已核实的面积匹配项，请核对房间或自填适配型号询价。':kind==='floor'?'。适用面积未核的柜机需商家确认。':kind==='wall'&&Number.isFinite(r.roomArea)?'。适用面积未核实的挂机不列入匹配结果。':'。请按实际房间确认机型与适用面积。'}</p>`;
  }
  function itemDetails(r,p){
    const size=r.size,ds=p?.dimensions;
    const sourceSize=size?`宽 ${size.width} × 深 ${size.depth}${size.height?' × 高 '+size.height:''} mm`:'';
    const over=ds&&size?['width','depth','height'].filter(k=>size[k]>0&&ds[k]>size[k]):[];
    const photo=p?.photoUrl&&/^(https:\/\/|data\/purchase-images\/|data:image\/(png|jpeg|webp);base64,)/.test(p.photoUrl)?`<figure class="product-photo"><img loading="lazy" src="${escape(p.photoUrl)}" alt="${escape(p.name)}官方产品图" onerror="this.hidden=true;this.nextElementSibling.textContent='官方图暂无法加载，请查看参数来源。'"><figcaption>${safeLink(p.photoSource,'官方产品图来源')}</figcaption></figure>`:'';
    const specs=p?.specs||[],highlights=specs.filter(s=>/机型|匹数|适用|APF|能效|尺寸|产水|开孔|面板/.test(s.label)).slice(0,8),mainSpecs=highlights.length?highlights:specs.slice(0,6),moreSpecs=specs.filter(s=>!mainSpecs.includes(s));
    const specTable=list=>`<dl class="product-specs">${list.map(s=>`<div><dt>${escape(s.label)}</dt><dd>${escape(s.value)}</dd></div>`).join('')}</dl>`;
    return `<details class="item-details" ${p?'open':''}><summary>尺寸、参数与预览</summary><div class="detail-content">${size?`<div class="layout-preview">${bridge.preview(size,r.sourceType,r.color)}<div><b>户型当前物件</b><p>${escape(sourceSize)}</p>${r.mattress?`<p>床垫 ${r.mattress.map(escape).join(' × ')} mm；上方尺寸为模型床架外包。</p>`:''}<small>平面尺寸示意，非实物外观或安装净空。</small></div></div>`:''}${photo}${ds?`<p class="product-size">所选型号机身：宽 ${ds.width} × 深 ${ds.depth} × 高 ${ds.height} mm</p>`:''}${over.length?`<p class="fit-warning">所选机身超出当前模型外包（${over.map(k=>({width:'宽',depth:'深',height:'高'}[k])).join('、')}），请在户型中核验机位。</p>`:''}${specs.length?`${specTable(mainSpecs)}${moreSpecs.length?`<details class="more-specs"><summary>更多参数与安装条件（${moreSpecs.length}项）</summary>${specTable(moreSpecs)}</details>`:''}<p class="spec-source">${safeLink(p.specUrl,'参数原始来源')}原表：${escape(p.specSheet)}</p>`:!p?'<p class="custom-note">可按当前尺寸向商家询价，在上方填写品牌、型号及成交单价。</p>':''}</div></details>`;
  }
  function safeLink(href, label) {
    return /^https?:\/\//i.test(href || '') ? `<a href="${escape(href)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>` : '';
  }
  function evidence(p) {
    if (!p) return '<div class="custom-note">自定义项目：填写你要购买的家具或设备名称及实际报价。</div>';
    return `<details class="evidence"><summary>查看参考价条件与来源${p.date ? ' · ' + escape(p.date) : ''}</summary><p>${escape(p.name)}</p><p>${escape(p.note || '原表未列明完整价格条件，需自行询价。')}</p><p>${escape(p.sourceFile)}<br>${escape(p.sourceSheet)} · ${escape(p.sourceCell)}${p.date ? ' · ' + escape(p.date) : ' · 日期以原文条件为准'}</p>${safeLink(p.url,'商品入口')}${safeLink(p.evidenceUrl,'价格原文')}</details>`;
  }
  function renderRows() {
    const rooms=[...new Map(active().rows.map(r=>[r.roomId||'manual',r.roomName||'手动添加'])).entries()];
    if(roomFilter!=='all'&&!rooms.some(([id])=>id===roomFilter))roomFilter='all';
    $('#roomFilter').innerHTML='<option value="all">全部房间</option>'+rooms.map(([id,name])=>`<option value="${escape(id)}" ${id===roomFilter?'selected':''}>${escape(name)}（${active().rows.filter(r=>(r.roomId||'manual')===id).length}项）</option>`).join('');$('#roomFilter').value=roomFilter;
    $('#filterHint').textContent='当前显示 '+(roomFilter==='all'?'全部项目':rooms.find(([id])=>id===roomFilter)?.[1])+'；预算汇总包含全部房间。';
    $('#items').innerHTML = active().rows.filter(r=>roomFilter==='all'||(r.roomId||'manual')===roomFilter).sort((a,b)=>Number(b.category!=='furniture')-Number(a.category!=='furniture')).map(r => {
      const l = calc.line(r,products);
      const categoryOptions = catalog.categories.map(c => `<option value="${c.id}" ${r.category === c.id ? 'selected' : ''}>${c.name}</option>`).join('');
      return `<article class="item-card ${r.included ? 'included' : ''}" data-id="${escape(r.id)}" data-room="${escape(r.roomId||'manual')}" data-type="${escape(r.sourceType||'manual')}" data-source-ids="${escape((r.sourceIds||[]).join(','))}">
        <div class="item-top"><label class="include-control"><input type="checkbox" data-field="included" aria-label="计入${escape(r.name)}" ${r.included ? 'checked' : ''}>计入</label><input class="item-name" data-field="name" value="${escape(r.name)}" maxlength="160" aria-label="项目名称" ${r.sourceKey?'readonly':''}>${r.owned?'<span class="owned-tag">已购</span>':''}${r.sourceKey?'<span class="linked-tag">随户型</span>':`<button class="remove-item" data-action="remove" aria-label="移除${escape(r.name)}">移除</button>`}</div>
        ${r.sourceKey?`<p class="source-room">${escape(r.roomName)}${Number.isFinite(r.roomArea)?' · '+r.roomArea.toFixed(2)+'㎡':''} · ${r.quantity} 件${r.owned?' · 默认不计新增购买支出':''}</p>`:''}
        <div class="choice-grid"><label>分类<select data-field="category" aria-label="项目分类" ${r.sourceKey?'disabled':''}>${categoryOptions}</select></label><label>型号 / 版本<select data-field="productId" aria-label="选择型号">${productOptions(r)}</select></label></div>
        ${filterNote(r)}${!r.productId?`<label class="custom-model">自填品牌 / 型号<input data-field="customModel" value="${escape(r.customModel||'')}" maxlength="160" placeholder="未收录的家具或设备，可直接填型号报价" aria-label="自填型号"></label>`:''}
        <div class="numbers-grid"><label>数量${r.sourceKey?'（联动）':''}<input data-field="quantity" value="${escape(r.quantity)}" inputmode="numeric" aria-label="数量" ${r.sourceKey?'readonly':''}></label><label>自填单价（元）<input data-field="unitPrice" value="${escape(r.unitPrice)}" inputmode="decimal" placeholder="${l.product?.price !== null && l.product?.price !== undefined ? l.product.price.toFixed(2) : '待询价'}" aria-label="自填单价"></label><label>安装 / 运费（本行）<input data-field="fee" value="${escape(r.fee)}" inputmode="decimal" placeholder="免收填 0" aria-label="安装运费"></label><div class="line-total" data-output="total"></div></div>
        <div class="price-basis" data-output="basis"></div>${itemDetails(r,l.product)}${evidence(l.product)}</article>`;
    }).join('');
    updateRows();
  }
  function updateRows() {
    for (const card of $('#items').children) {
      const r = active().rows.find(r => r.id === card.dataset.id), l = calc.line(r,products);
      const hint = l.invalid ? '输入格式有误' : l.total !== null ? '行合计' : '已计价小计';
      card.querySelector('[data-output="total"]').innerHTML = `<small>${hint}</small>${l.invalid ? '—' : l.goods === null && l.fee === null ? '—' : format(l.known)}`;
      card.querySelector('[data-output="basis"]').innerHTML = `单价口径：<b>${l.basis}</b>${l.product?.price !== null && l.product?.price !== undefined ? ' · 原参考 ' + format(Math.round(l.product.price * 100)) : ''}${l.missingFee ? ' · 安装运费未计全' : ''}`;
      card.querySelector('[data-field="unitPrice"]').setAttribute('aria-invalid',String(calc.money(r.unitPrice).invalid));
      card.querySelector('[data-field="fee"]').setAttribute('aria-invalid',String(calc.money(r.fee).invalid));
      card.querySelector('[data-field="quantity"]').setAttribute('aria-invalid',String(l.quantity === null));
    }
  }
  function renderSelector() {
    $('#planSelect').innerHTML = state.plans.map(p => `<option value="${escape(p.id)}" ${p.id === state.activeId ? 'selected' : ''}>${escape(p.name || '未命名方案')}</option>`).join('');
    $('#deletePlan').disabled = state.plans.length < 2;
    $('#newPlan').disabled = $('#duplicatePlan').disabled = state.plans.length >= 20;
  }
  function renderSummary() {
    const s = calc.summary(active(),products), has = s.rows.length > 0;
    $('#total').textContent = !has || s.invalid ? '—' : format(s.known);
    $('#mobileTotal').innerHTML = `<span>${s.complete ? '组合估算总价' : '已计价小计'}<small>${s.rows.length} 项${s.missingPrices || s.missingFees ? ' · 待补齐' : ''}</small></span><b>${!has || s.invalid ? '—' : format(s.known)} ↑</b>`;
    $('#totalLabel').textContent = s.complete ? '组合估算总价' : '已计价小计';
    $('#totalBadge').textContent = s.invalid ? '请修正输入' : !has ? '尚未选择' : s.complete ? '已计全' : '待补齐';
    $('#totalBadge').classList.toggle('complete',s.complete);
    $('#totalHint').textContent = !has ? '选择型号，或填写自定义家具的单价。' : s.invalid ? '金额须为非负数，最多两位小数；数量填 1–999 的整数。' : s.referenceRows ? `${s.referenceRows} 项使用历史或公开参考价，最终支出以实际报价为准。` : '按你填写的单价汇总，附加费每行仅计一次。';
    $('#goodsTotal').textContent = has ? format(s.goods) : '—'; $('#feesTotal').textContent = has ? format(s.fees) : '—';
    $('#pieceCount').textContent = `${s.pieces} 件 / ${s.rows.length} 项`;
    $('#includedCount').textContent = `已计入 ${s.rows.length} 项`;
    const issues = [];
    if (s.invalid) issues.push(`${s.invalid} 项输入格式有误，暂不显示组合总价。`);
    if (s.missingPrices) issues.push(`${s.missingPrices} 项缺单价，商品金额尚未计全。`);
    if (s.missingFees) issues.push(`${s.missingFees} 项安装 / 运费未填，小计未包含这些费用。`);
    $('#completeness').innerHTML = issues.map(t=>`<div>${t}</div>`).join('') || (has ? '商品价格与安装运费均已纳入计算。' : '先从下方清单开始选择。');
    $('#completeness').classList.toggle('good',s.complete);
    $('#budgetLimit').setAttribute('aria-invalid',String(s.invalidLimit));
    $('#remaining').classList.toggle('over',s.remaining < 0 || s.invalidLimit);
    $('#remaining').textContent = s.invalidLimit ? '请输入有效预算上限。' : !has || s.remaining === null || s.invalid ? '' : `${s.complete ? '' : '按已计价部分，'}${s.remaining >= 0 ? '距上限尚余 ' : '超过上限 '}${format(Math.abs(s.remaining))}`;
    $('#zeroFees').disabled = !s.missingFees;
    $('#planComparison').innerHTML = state.plans.map(p=> {
      const t = calc.summary(p,products);
      return `<button class="compare-plan ${p.id === state.activeId ? 'on' : ''}" data-plan="${escape(p.id)}"><span>${escape(p.name || '未命名方案')}<small>${t.rows.length} 项 · ${t.invalid ? '输入有误' : t.complete ? '已计全' : '待补齐'}</small></span><b>${t.rows.length && !t.invalid ? format(t.known) : '—'}</b></button>`;
    }).join('');
  }
  function renderAll() {
    renderSelector(); $('#planName').value = active().name; $('#budgetLimit').value = active().limit;
    $('#saveStatus').textContent = storageProblem || '保存在当前浏览器'; renderRows(); renderSummary();renderLink();
  }
  function renderLink(){const p=active(),snap=p.sourceSchemeId?layout(p.sourceSchemeId):null;$('#layoutTitle').textContent=snap?'联动户型：'+snap.schemeName:'手动购买预算';$('#layoutInfo').textContent=snap?`${snap.groups.reduce((n,g)=>n+g.quantity,0)} 件家具设备，合并为 ${snap.groups.length} 项。电位、地漏和结构示意不计入家具家电；同款同尺寸合并数量。`:'此方案保留原手工清单；可切换到当前户型的联动预算。';$('#syncLayout').textContent=snap?'同步当前户型':'打开当前户型预算';const history=p.sourceArchive||[];$('#sourceHistory').hidden=!history.length;$('#sourceHistory>div').innerHTML=history.map(r=>`<p>${escape(r.name)} · ${escape(r.quantity)} 件 · 原单价 ${escape(r.unitPrice||products.get(r.productId)?.price||'未填')} · ${escape(r.archivedReason)}</p>`).join('');const bp=new URLSearchParams({scheme:p.sourceSchemeId||requestedScheme,v:'linked-budget-20261103'});if(params.get('view')==='3d'){bp.set('view','3d');if(params.get('look'))bp.set('look',params.get('look'));}const back='./index.html?'+bp;$('#backLink').href=$('#backToPlan').href=back;}
  function synchronize(show=false){const p=active();if(!p.sourceSchemeId)return;const snap=layout(p.sourceSchemeId);if(p.sourceSignature===snap.signature){if(show)message('已是当前户型的最新清单。');return;}const changes=bridge.sync(p,snap,row,products);save();renderAll();if(show||changes.added||changes.removed||changes.invalidated)message(`户型已同步：新增 ${changes.added} 项，移出 ${changes.removed} 项${changes.invalidated?'，'+changes.invalidated+' 项空调选择不再匹配，原报价已留存':''}。`);}
  function switchPlan(id) { state.activeId = id; synchronize();save(); renderAll(); }
  function addItem(name, category) {
    if (active().rows.length >= 200) return message('每套方案最多支持 200 行。');
    const r = row(name,category,category === 'furniture'); active().rows.push(r);roomFilter='manual'; save(); renderAll();
    const card = $('#items').lastElementChild; card.scrollIntoView({behavior:'smooth',block:'center'}); card.querySelector('[data-field="name"]').focus({preventScroll:true});
  }
  $('#items').addEventListener('input',e=> {
    const field = e.target.dataset.field;
    if (!['name','customModel','quantity','unitPrice','fee'].includes(field)) return;
    const r = active().rows.find(r=>r.id===e.target.closest('[data-id]').dataset.id);
    if(r.sourceKey&&['name','quantity'].includes(field))return;
    r[field] = e.target.value;
    if (field === 'unitPrice' && r.unitPrice.trim()) { r.included=true; const card = e.target.closest('[data-id]'); card.querySelector('[data-field="included"]').checked=true; card.classList.add('included'); }
    save(); updateRows(); renderSummary();
  });
  $('#items').addEventListener('change',e=> {
    const field=e.target.dataset.field;
    if (!['category','productId','included'].includes(field)) return;
    const r=active().rows.find(r=>r.id===e.target.closest('[data-id]').dataset.id);
    if (field==='included') r.included=e.target.checked;
    else {
      const hadQuote=Boolean(r.unitPrice || r.fee);
      if(field==='category'&&r.sourceKey)return;
      if(field==='productId'&&e.target.value&&!bridge.eligible(products.get(e.target.value),r))return;
      r[field]=e.target.value; if(field==='category')r.productId='';
      r.unitPrice=''; r.fee=''; if(field==='productId' && r.productId)r.included=true;
      if(hadQuote)message('切换型号或分类后，原自填单价和安装运费已清除。');
    }
    save(); renderAll();
  });
  $('#items').addEventListener('click',e=> {
    if (!e.target.closest('[data-action="remove"]')) return;
    const id=e.target.closest('[data-id]').dataset.id; active().rows=active().rows.filter(r=>r.id!==id); save();renderAll();
  });
  $('#planSelect').onchange=e=>switchPlan(e.target.value);
  $('#roomFilter').onchange=e=>{roomFilter=e.target.value;renderRows();};
  $('#syncLayout').onclick=()=>{if(active().sourceSchemeId)synchronize(true);else{let p=state.plans.find(p=>p.sourceSchemeId===requestedScheme);if(!p){if(state.plans.length>=20)return message('请先导出备份并整理方案，最多支持20套。');p=newPlan();state.plans.push(p);}switchPlan(p.id);}};
  addEventListener('storage',e=>{if(e.key===bridge.KEY+active().sourceSchemeId)synchronize();});
  addEventListener('focus',()=>synchronize());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)synchronize();});
  $('#planComparison').onclick=e=>{const b=e.target.closest('[data-plan]');if(b)switchPlan(b.dataset.plan);};
  $('#planName').oninput=e=>{active().name=e.target.value;save();renderSelector();renderSummary();};
  $('#budgetLimit').oninput=e=>{active().limit=e.target.value;save();renderSummary();};
  $('#duplicatePlan').onclick=()=> {
    if(state.plans.length>=20)return;
    const copy=JSON.parse(JSON.stringify(active()));copy.id=uid();copy.name=(copy.name.slice(0,54)+' · 对比');copy.rows.forEach(r=>r.id=uid());
    state.plans.push(copy);switchPlan(copy.id);$('#planName').focus();$('#planName').select();
  };
  $('#newPlan').onclick=()=>{if(state.plans.length>=20)return;const p=newPlan('新预算方案');state.plans.push(p);switchPlan(p.id);};
  $('#deletePlan').onclick=()=>$('#deleteDialog').showModal();
  $('#cancelDelete').onclick=()=>$('#deleteDialog').close();
  $('#confirmDelete').onclick=()=>{if(state.plans.length>1){state.plans=state.plans.filter(p=>p.id!==state.activeId);switchPlan(state.plans[0].id);}$('#deleteDialog').close();};
  $('#addItem').onclick=()=>addItem('自定义家具','furniture');
  $('#addAppliance').onclick=()=>addItem('新增家电','ac');
  document.querySelectorAll('[data-furniture]').forEach(b=>b.onclick=()=>addItem(b.dataset.furniture,'furniture'));
  $('#zeroFees').onclick=()=>{active().rows.filter(r=>r.included && !r.fee.trim()).forEach(r=>r.fee='0');save();renderAll();};
  function download(name, content, type) {
    const u=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);
  }
  const filename = () => (active().name || '家具家电预算').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,60);
  $('#exportJson').onclick=()=>download(filename()+'-全部方案备份.json',JSON.stringify(state,null,2),'application/json');
  $('#exportCsv').onclick=()=> {
    const s=calc.summary(active(),products);
    if(s.invalid)return message('请先修正清单中无效的金额或数量。');
    if(!s.rows.length)return message('请先勾选需要计入的项目。');
    const amounts=c=>c===null?'':(c/100).toFixed(2);
    const cells=[['方案','项目','分类','型号 / 版本','数量','采用单价（元）','单价口径','安装运费本行合计（元）','行已计价小计（元）','完整性','参考日期','参考价条件','源工作簿','源工作表','源单元格','所属房间','房间模型面积（㎡）','当前模型宽×深×高（mm）','已购']];
    for(const l of s.rows)cells.push([active().name,l.row.name,catalog.categories.find(c=>c.id===l.row.category).name,l.product?.name||l.row.customModel||'自定义',l.quantity,amounts(l.unit),l.basis,amounts(l.fee),amounts(l.known),l.total===null?'未计全':'已计全',l.product?.date||'',l.product?.note||'',l.product?.sourceFile||'',l.product?.sourceSheet||'',l.product?.sourceCell||'',l.row.roomName||'',l.row.roomArea??'',l.row.size?[l.row.size.width||'未标注',l.row.size.depth||'未标注',l.row.size.height||'未标注'].join('×'):'',l.row.owned?'已购':'']);
    cells.push([],['商品已计价金额（元）',amounts(s.goods)],['已填安装运费（元）',amounts(s.fees)],[s.complete?'组合估算总价（元）':'已计价小计（元，尚未计全）',amounts(s.known)],['缺商品单价项目数',s.missingPrices],['缺安装运费项目数',s.missingFees],['使用参考价项目数',s.referenceRows]);
    const csvCell=value=>{let v=String(value??'');if(/^[\s]*[=+\-@]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';};
    download(filename()+'.csv','\uFEFF'+cells.map(r=>r.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');
  };
  $('#importJson').onclick=()=>$('#backupInput').click();
  $('#backupInput').onchange=async e=> {
    const file=e.target.files[0];if(!file)return;
    try {
      if(file.size>10000000)throw Error('备份文件超过 10 MB，请选择本页面导出的预算备份。');
      const incoming=cleanState(JSON.parse(await file.text()));
      if(state.plans.length+incoming.plans.length>20)throw Error('导入后将超过 20 套方案，请先删除不需要的方案。');
      // Append imported plans so the current browser's work is never silently replaced.
      incoming.plans.forEach(p=>{p.id=uid();p.name=(p.name.slice(0,54)+' · 导入');});
      state.plans.push(...incoming.plans);switchPlan(incoming.plans[0].id);message('备份已作为新方案导入，原有方案保留。');
    } catch(error) { message('未导入：'+(error instanceof SyntaxError?'JSON 文件格式不正确。':error.message)); }
    e.target.value='';
  };
  $('#catalogCount').textContent=`${catalog.products.length} 个型号 / 版本可选 · ${catalog.products.filter(p=>p.price!==null).length} 个有参考价`;
  $('#workspace').hidden=false;renderAll();
  save();
  if(storageProblem)message(storageProblem+'如有备份，可从下方导入。');
})();
