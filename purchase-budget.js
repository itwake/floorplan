(function() {
  'use strict';
  const catalog = window.PURCHASE_CATALOG, calc = window.PurchaseBudget;
  const $ = selector => document.querySelector(selector);
  if (!catalog || !calc) { $('#loadError').hidden = false; return; }
  const products = new Map(catalog.products.map(p => [p.id, p]));
  const categories = new Set(catalog.categories.map(c => c.id));
  const storageKey = 'warm-timber-purchase-budget-v1';
  const currency = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' });
  const format = cents => currency.format(cents / 100);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => globalThis.crypto?.randomUUID?.() || 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  let messageTimer, storageProblem = '';
  const row = (name, category, included = false) => ({ id:uid(), name, category, included, productId:'', quantity:'1', unitPrice:'', fee:'' });
  function newPlan(name) {
    return { id:uid(), name, limit:'', rows:[
      row('客厅空调','ac'), row('主卧空调','ac'), row('次卧空调','ac'), row('书房空调','ac'),
      row('厨房油烟机','hood'), row('厨房燃气灶','stove'), row('燃气热水器','heater'),
      row('蒸烤箱','oven'), row('厨房凉霸','cooler'), row('扫地机器人','robot')
    ] };
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
        return {id:uid(), name:string(r.name,80), category:r.category, included:r.included, productId:string(r.productId,60), quantity:string(r.quantity,10), unitPrice:string(r.unitPrice,30), fee:string(r.fee,30)};
      }) };
    });
    if (new Set(plans.map(p => p.id)).size !== plans.length) throw Error('备份中的方案编号重复。');
    return {version:1,activeId:plans.some(p => p.id === input.activeId) ? input.activeId : plans[0].id,plans};
  }
  let state;
  try { const raw = localStorage.getItem(storageKey); if (raw) state = cleanState(JSON.parse(raw)); }
  catch(e) { storageProblem = '已打开新方案；原保存数据未能读取。'; }
  if (!state) { const first = newPlan('我的购买预算'); state = {version:1, activeId:first.id, plans:[first]}; }
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
    const list = catalog.products.filter(p => p.category === r.category);
    return `<option value="">${r.category === 'furniture' ? '自定义家具，请填写单价' : '请选择型号 / 或直接自填单价'}</option>` + list.map(p => `<option value="${escape(p.id)}" ${p.id === r.productId ? 'selected' : ''}>${escape(p.name)}${p.price === null ? ' · 价格待核' : ' · 参考 ' + format(Math.round(p.price * 100))}</option>`).join('');
  }
  function safeLink(href, label) {
    return /^https?:\/\//i.test(href || '') ? `<a href="${escape(href)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>` : '';
  }
  function evidence(p) {
    if (!p) return '<div class="custom-note">自定义项目：填写你要购买的家具或设备名称及实际报价。</div>';
    return `<details class="evidence"><summary>查看参考价条件与来源${p.date ? ' · ' + escape(p.date) : ''}</summary><p>${escape(p.name)}</p><p>${escape(p.note || '原表未列明完整价格条件，需自行询价。')}</p><p>${escape(p.sourceFile)}<br>${escape(p.sourceSheet)} · ${escape(p.sourceCell)}${p.date ? ' · ' + escape(p.date) : ' · 日期以原文条件为准'}</p>${safeLink(p.url,'商品入口')}${safeLink(p.evidenceUrl,'价格原文')}</details>`;
  }
  function renderRows() {
    $('#items').innerHTML = active().rows.map(r => {
      const l = calc.line(r,products);
      const categoryOptions = catalog.categories.map(c => `<option value="${c.id}" ${r.category === c.id ? 'selected' : ''}>${c.name}</option>`).join('');
      return `<article class="item-card ${r.included ? 'included' : ''}" data-id="${escape(r.id)}">
        <div class="item-top"><label class="include-control"><input type="checkbox" data-field="included" aria-label="计入${escape(r.name)}" ${r.included ? 'checked' : ''}>计入</label><input class="item-name" data-field="name" value="${escape(r.name)}" maxlength="80" aria-label="项目名称"><button class="remove-item" data-action="remove" aria-label="移除${escape(r.name)}">移除</button></div>
        <div class="choice-grid"><label>分类<select data-field="category" aria-label="项目分类">${categoryOptions}</select></label><label>型号 / 版本<select data-field="productId" aria-label="选择型号">${productOptions(r)}</select></label></div>
        <div class="numbers-grid"><label>数量<input data-field="quantity" value="${escape(r.quantity)}" inputmode="numeric" aria-label="数量"></label><label>自填单价（元）<input data-field="unitPrice" value="${escape(r.unitPrice)}" inputmode="decimal" placeholder="${l.product?.price !== null && l.product?.price !== undefined ? l.product.price.toFixed(2) : '待询价'}" aria-label="自填单价"></label><label>安装 / 运费（本行）<input data-field="fee" value="${escape(r.fee)}" inputmode="decimal" placeholder="免收填 0" aria-label="安装运费"></label><div class="line-total" data-output="total"></div></div>
        <div class="price-basis" data-output="basis"></div>${evidence(l.product)}</article>`;
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
    $('#saveStatus').textContent = storageProblem || '保存在当前浏览器'; renderRows(); renderSummary();
  }
  function switchPlan(id) { state.activeId = id; save(); renderAll(); }
  function addItem(name, category) {
    if (active().rows.length >= 200) return message('每套方案最多支持 200 行。');
    const r = row(name,category,category === 'furniture'); active().rows.push(r); save(); renderAll();
    const card = $('#items').lastElementChild; card.scrollIntoView({behavior:'smooth',block:'center'}); card.querySelector('[data-field="name"]').focus({preventScroll:true});
  }
  $('#items').addEventListener('input',e=> {
    const field = e.target.dataset.field;
    if (!['name','quantity','unitPrice','fee'].includes(field)) return;
    const r = active().rows.find(r=>r.id===e.target.closest('[data-id]').dataset.id);
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
    const cells=[['方案','项目','分类','型号 / 版本','数量','采用单价（元）','单价口径','安装运费本行合计（元）','行已计价小计（元）','完整性','参考日期','参考价条件','源工作簿','源工作表','源单元格']];
    for(const l of s.rows)cells.push([active().name,l.row.name,catalog.categories.find(c=>c.id===l.row.category).name,l.product?.name||'自定义',l.quantity,amounts(l.unit),l.basis,amounts(l.fee),amounts(l.known),l.total===null?'未计全':'已计全',l.product?.date||'',l.product?.note||'',l.product?.sourceFile||'',l.product?.sourceSheet||'',l.product?.sourceCell||'']);
    cells.push([],['商品已计价金额（元）',amounts(s.goods)],['已填安装运费（元）',amounts(s.fees)],[s.complete?'组合估算总价（元）':'已计价小计（元，尚未计全）',amounts(s.known)],['缺商品单价项目数',s.missingPrices],['缺安装运费项目数',s.missingFees],['使用参考价项目数',s.referenceRows]);
    const csvCell=value=>{let v=String(value??'');if(/^[\s]*[=+\-@]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';};
    download(filename()+'.csv','\uFEFF'+cells.map(r=>r.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');
  };
  $('#importJson').onclick=()=>$('#backupInput').click();
  $('#backupInput').onchange=async e=> {
    const file=e.target.files[0];if(!file)return;
    try {
      if(file.size>2000000)throw Error('备份文件超过 2 MB，请选择本页面导出的预算备份。');
      const incoming=cleanState(JSON.parse(await file.text()));
      if(state.plans.length+incoming.plans.length>20)throw Error('导入后将超过 20 套方案，请先删除不需要的方案。');
      // Append imported plans so the current browser's work is never silently replaced.
      incoming.plans.forEach(p=>{p.id=uid();p.name=(p.name.slice(0,54)+' · 导入');});
      state.plans.push(...incoming.plans);switchPlan(incoming.plans[0].id);message('备份已作为新方案导入，原有方案保留。');
    } catch(error) { message('未导入：'+(error instanceof SyntaxError?'JSON 文件格式不正确。':error.message)); }
    e.target.value='';
  };
  const params=new URLSearchParams(location.search);if(params.has('scheme')) {
    const back='./index.html?scheme='+encodeURIComponent(params.get('scheme'));$('#backLink').href=$('#backToPlan').href=back;
  }
  $('#catalogCount').textContent=`${catalog.products.length} 个型号 / 版本可选 · ${catalog.products.filter(p=>p.price!==null).length} 个有参考价`;
  $('#workspace').hidden=false;renderAll();
  if(storageProblem)message(storageProblem+'如有备份，可从下方导入。');
})();
