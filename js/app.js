const state = {
  db: null,
  category: "medical",
  q: "",
  company: "all",
  selected: [],
  verifiedOnly: false
};

const $ = (id) => document.getElementById(id);

function companyById(id) {
  return state.db.companies.find((c) => c.id === id);
}

function filteredProducts() {
  const { db, category, q, company } = state;
  const needle = q.trim().toLowerCase();
  return db.products.filter((p) => {
    if (p.category !== category) return false;
    if (company !== "all" && p.companyId !== company) return false;
    if (state.verifiedOnly && p.status !== "verified") return false;
    if (!needle) return true;
    const co = companyById(p.companyId);
    const blob = [p.nameZh, p.nameEn, p.fields?.highlight, co?.zh, co?.en].join(" ").toLowerCase();
    return blob.includes(needle);
  });
}

function renderFilters() {
  const cats = $("cats");
  cats.innerHTML = "";
  state.db.categories.forEach((c) => {
    const b = document.createElement("button");
    b.textContent = c.zh;
    b.className = c.id === state.category ? "active" : "";
    b.onclick = () => {
      state.category = c.id;
      state.selected = state.selected.filter((id) => {
        const p = state.db.products.find((x) => x.id === id);
        return p && p.category === c.id;
      });
      render();
    };
    cats.appendChild(b);
  });
  const sel = $("company");
  const keep = state.company;
  sel.innerHTML = `<option value="all">全部公司</option>`;
  state.db.companies.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.zh} · ${c.en}`;
    sel.appendChild(opt);
  });
  sel.value = keep;
}

function renderCards() {
  const list = filteredProducts();
  $("count").textContent = `${list.length} 隻產品`;
  const grid = $("grid");
  if (!list.length) {
    grid.innerHTML = `<div class="empty">呢個篩選暫時冇產品。可以轉類型或公司。</div>`;
    return;
  }
  grid.innerHTML = list.map((p) => {
    const co = companyById(p.companyId);
    const on = state.selected.includes(p.id);
    const fields = state.db.compareFields[p.category] || [];
    const preview = fields.slice(0, 3).map((k) => {
      const label = state.db.fieldLabels[k] || k;
      return `<div class="kv">${label}：<b>${p.fields?.[k] || "—"}</b></div>`;
    }).join("");
    return `<article class="card">
      <div class="co">${co.zh} <span style="color:#8a93a0;font-weight:500">${co.en}</span></div>
      <h3>${p.nameZh}</h3>
      <div><span class="badge ${p.status}">${p.status === "verified" ? "已核對" : "待核對"}</span></div>
      ${preview}
      <div class="actions">
        <button data-id="${p.id}" class="${on ? "on" : ""}">${on ? "已選比較" : "加入比較"}</button>
        <a href="${p.officialUrl}" target="_blank" rel="noopener">官方</a>
      </div>
    </article>`;
  }).join("");
  grid.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.onclick = () => toggle(btn.dataset.id);
  });
}

function toggle(id) {
  const i = state.selected.indexOf(id);
  if (i >= 0) state.selected.splice(i, 1);
  else {
    if (state.selected.length >= 3) state.selected.shift();
    state.selected.push(id);
  }
  renderCompare();
  renderCards();
  renderDock();
}

function renderDock() {
  const box = $("dock");
  if (!box) return;
  const n = state.selected.length;
  box.innerHTML = `<div><b>${n} / 3 已選比較</b><br><span>${n ? "向下拉可以睇並排表" : "揁同一類型產品加入比較"}</span></div>
    <button type="button" class="ghost" id="clearSel" ${n ? "" : "disabled"}>清空</button>`;
  const btn = $("clearSel");
  if (btn) btn.onclick = () => {
    state.selected = [];
    renderCards();
    renderCompare();
    renderDock();
  };
}

function renderCompare() {
  const box = $("compare");
  const ids = state.selected;
  if (!ids.length) {
    box.innerHTML = `<p class="hint">最多選 3 隻同一類型產品並排。而家未選。</p>`;
    return;
  }
  const products = ids.map((id) => state.db.products.find((p) => p.id === id)).filter(Boolean);
  const fields = ["name", ...(state.db.compareFields[state.category] || []), "status"];
  const head = ["項目"].concat(products.map((p) => {
    const co = companyById(p.companyId);
    return `${co.zh}<br><span style="font-weight:500">${p.nameZh}</span>`;
  })).map((h) => `<th>${h}</th>`).join("");
  const rows = fields.map((k) => {
    const label = k === "name" ? "產品" : k === "status" ? "資料狀態" : state.db.fieldLabels[k] || k;
    const cells = products.map((p) => {
      if (k === "name") return p.nameEn || p.nameZh;
      if (k === "status") return p.status === "verified" ? "已核對" : "待核對種子";
      return p.fields?.[k] || "—";
    }).map((v) => `<td>${v}</td>`).join("");
    return `<tr><th>${label}</th>${cells}</tr>`;
  }).join("");
  box.innerHTML = `<div class="compare"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>
    <p class="hint" style="margin-top:10px">比較只反映本站已入庫欄位，唔等於保單全文。</p>`;
}

function renderStats() {
  const nCo = state.db.companies.length;
  const nPr = state.db.products.length;
  $("stats").innerHTML = `
    <span class="pill">${nCo} 間公司</span>
    <span class="pill">${nPr} 隻種子產品</span>
    <span class="pill">更新 ${state.db.meta.updatedAt}</span>
    <span class="pill">不含儲蓄／銀行系列</span>`;
}

function render() {
  renderFilters();
  renderCards();
  renderCompare();
  renderDock();
}

async function boot() {
  const [meta, medical, ci, life, accident] = await Promise.all(
    ["meta", "products-medical", "products-ci", "products-life", "products-accident"].map((name) =>
      fetch(`./data/${name}.json`).then((r) => {
        if (!r.ok) throw new Error(`${name} ${r.status}`);
        return r.json();
      })
    )
  );
  state.db = { ...meta, products: [...medical, ...ci, ...life, ...accident] };
  $("disclaimer").textContent = state.db.meta.disclaimer;
  renderStats();
  $("q").oninput = (e) => { state.q = e.target.value; renderCards(); };
  $("company").onchange = (e) => { state.company = e.target.value; renderCards(); };
  const vo = $("verifiedOnly");
  if (vo) {
    vo.onclick = () => {
      state.verifiedOnly = !state.verifiedOnly;
      vo.classList.toggle("on", state.verifiedOnly);
      renderCards();
    };
  }
  render();
}

boot().catch((err) => {
  $("grid").innerHTML = `<div class="empty">載入資料失敗：${err.message}</div>`;
});
