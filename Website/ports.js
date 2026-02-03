(async function () {
  // ------------ STATIC STATES + CITIES -------------
  const IN_STATE_CITIES = {
    "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Tirupati", "Kakinada"],
    "Arunachal Pradesh": ["Itanagar", "Tawang"],
    "Assam": ["Guwahati", "Dibrugarh", "Silchar"],
    "Bihar": ["Patna", "Gaya", "Bhagalpur"],
    "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur"],
    "Goa": ["Panaji", "Mormugao", "Margao"],
    "Gujarat": ["Ahmedabad", "Surat", "Mundra", "Kandla", "Bhavnagar", "Porbandar", "Pipavav"],
    "Haryana": ["Gurugram", "Faridabad", "Panipat"],
    "Himachal Pradesh": ["Shimla", "Solan"],
    "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad"],
    "Karnataka": ["Bengaluru", "Mangaluru", "Karwar"],
    "Kerala": ["Kochi", "Kollam", "Kozhikode", "Thiruvananthapuram"],
    "Madhya Pradesh": ["Indore", "Bhopal", "Gwalior"],
    "Maharashtra": ["Mumbai", "Nhava Sheva", "Navi Mumbai", "Pune", "Nagpur", "Ratnagiri"],
    "Manipur": ["Imphal"],
    "Meghalaya": ["Shillong"],
    "Mizoram": ["Aizawl"],
    "Nagaland": ["Kohima", "Dimapur"],
    "Odisha": ["Paradip", "Bhubaneswar", "Dhamra", "Gopalpur"],
    "Punjab": ["Amritsar", "Ludhiana", "Jalandhar", "Ferozepur"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Bhiwadi"],
    "Sikkim": ["Gangtok"],
    "Tamil Nadu": ["Chennai", "Tuticorin", "Ennore", "Cuddalore"],
    "Telangana": ["Hyderabad", "Warangal"],
    "Tripura": ["Agartala"],
    "Uttar Pradesh": ["Noida", "Agra", "Meerut", "Kanpur", "Varanasi"],
    "Uttarakhand": ["Dehradun", "Haridwar"],
    "West Bengal": ["Kolkata", "Haldia", "Durgapur"],

    // Union Territories
    "Andaman and Nicobar Islands": ["Port Blair"],
    "Chandigarh": ["Chandigarh"],
    "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Silvassa"],
    "Delhi": ["New Delhi", "Dwarka"],
    "Jammu and Kashmir": ["Jammu", "Srinagar"],
    "Ladakh": ["Leh"],
    "Lakshadweep": ["Kavaratti"],
    "Puducherry": ["Puducherry", "Karaikal"]
  };

  // ---------------------------------- CONFIG / ELEMENTS ----------------------------------
  function waitForConfig(timeoutMs = 1200) {
    return new Promise((resolve, reject) => {
      const t0 = Date.now();
      (function check() {
        if (window.APP_CONFIG && window.APP_CONFIG.apiBaseUrl) return resolve(window.APP_CONFIG);
        if (Date.now() - t0 > timeoutMs) return reject(new Error("APP_CONFIG not available"));
        setTimeout(check, 25);
      })();
    });
  }

  const container      = document.getElementById('portsContainer');
  const paginationEl   = document.getElementById('portsPagination');
  const btn            = document.getElementById('searchBtn');
  const resetBtn       = document.getElementById('resetBtn');

  const stateSel       = document.getElementById('stateSel');
  const citySel        = document.getElementById('citySel');
  const portSel        = document.getElementById('portSel');
  const pinSel         = document.getElementById('pinSel');
  const typeSel        = document.getElementById('typeSel');
  const nameQ          = document.getElementById('nameQ');

  const drawer         = document.getElementById('drawer');
  const backdrop       = document.getElementById('backdrop');
  const drawerBody     = document.getElementById('drawerBody');
  const drawerTitle    = document.getElementById('drawerTitle');
  const drawerClose    = document.getElementById('drawerClose');

  let base, endpoint;

  const PAGE_SIZE = 50;
  let ALL_PORTS = [];
  let CURRENT_FILTERED = [];
  let currentPage = 1;

  // ---------------------------------- HELPERS ----------------------------------
  async function api(path, params) {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    const res = await fetch(`${base}${path}${qs}`, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`API ${path} failed (${res.status})`);
    return res.json();
  }

  function fillSelect(sel, values, placeholder) {
    if (!sel) return;
    sel.innerHTML = `<option value="">${placeholder}</option>` + (values || [])
      .map(v => `<option value="${v}">${v}</option>`).join("");
    sel.disabled = !(values && values.length);
  }

  function openDrawer(html, title = "Port details") {
    drawerTitle.textContent = title;
    drawerBody.innerHTML = html;
    drawer.classList.add('open');
    backdrop.classList.add('show');
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    backdrop.classList.remove('show');
  }
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  // ---------------------------------- DROPDOWN LOGIC ----------------------------------
  function loadStates() {
    const states = Object.keys(IN_STATE_CITIES).sort((a, b) => a.localeCompare(b));
    fillSelect(stateSel, states, "State");

    if (citySel) {
      citySel.innerHTML = '<option value="">City</option>';
      citySel.disabled = true;
    }
    if (portSel) {
      portSel.innerHTML = '<option value="">Port</option>';
      portSel.disabled = true;
    }
    if (pinSel) {
      pinSel.innerHTML  = '<option value="">Pincode</option>';
      pinSel.disabled = true;
    }

    const portTypes = ["major", "minor"];
    fillSelect(typeSel, portTypes, "Port type");
  }

  function onStateChange() {
    const state = stateSel.value;
    const cities = IN_STATE_CITIES[state] || [];
    fillSelect(citySel, cities, "City");

    if (portSel) {
      portSel.innerHTML = '<option value="">Port</option>';
      portSel.disabled = true;
    }
    if (pinSel) {
      pinSel.innerHTML  = '<option value="">Pincode</option>';
      pinSel.disabled = true;
    }

    currentPage = 1;
    runSearch();
  }

  function onCityChange() {
    const state = stateSel.value;
    const city  = citySel.value;

    if (!state || !city) {
      if (portSel) {
        portSel.innerHTML = '<option value="">Port</option>';
        portSel.disabled = true;
      }
      if (pinSel) {
        pinSel.innerHTML  = '<option value="">Pincode</option>';
        pinSel.disabled = true;
      }
      currentPage = 1;
      runSearch();
      return;
    }

    const subset = ALL_PORTS.filter(p =>
      (p.state || "").toLowerCase() === state.toLowerCase() &&
      (p.city || "").toLowerCase() === city.toLowerCase()
    );

    const names = [...new Set(subset.map(p => p.name).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
    if (names.length) {
      fillSelect(portSel, names, "Port");
    } else if (portSel) {
      portSel.innerHTML = '<option value="">No port available</option>';
      portSel.disabled = true;
    }

    const pins = [...new Set(subset.map(p => p.pincode).filter(Boolean))];
    if (pins.length) {
      fillSelect(pinSel, pins.sort(), "Pincode");
    } else if (pinSel) {
      pinSel.innerHTML = '<option value="">Pincode</option>';
      pinSel.disabled = true;
    }

    currentPage = 1;
    runSearch();
  }

  // ---------------------------------- FILTERING + RENDER ----------------------------------
  function applyFilters() {
    let items = [...ALL_PORTS];

    const state   = stateSel.value.trim();
    const city    = citySel.value.trim();
    const port    = portSel ? portSel.value.trim() : "";
    const pin     = pinSel ? pinSel.value.trim() : "";
    const type    = typeSel ? typeSel.value.trim() : "";
    const nameTxt = nameQ.value.trim();

    if (state) {
      items = items.filter(p => (p.state || "").toLowerCase() === state.toLowerCase());
    }
    if (city) {
      items = items.filter(p => (p.city || "").toLowerCase() === city.toLowerCase());
    }

    const effectiveName = nameTxt || port;
    if (effectiveName) {
      items = items.filter(p => (p.name || "").toLowerCase() === effectiveName.toLowerCase());
    }

    if (pin) {
      items = items.filter(p => (p.pincode || "").toString() === pin);
    }

    if (type) {
      items = items.filter(p => (p.port_type || "").toLowerCase() === type.toLowerCase());
    }

    return items;
  }

  function renderPagination(totalItems) {
    if (!paginationEl) return;

    const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    if (totalPages <= 1) {
      paginationEl.innerHTML = "";
      return;
    }

    let html = `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      <button class="secondary" data-page="prev"${currentPage === 1 ? ' disabled' : ''}>Prev</button>
      <span class="muted">Page ${currentPage} of ${totalPages}</span>
      <button class="secondary" data-page="next"${currentPage === totalPages ? ' disabled' : ''}>Next</button>
    </div>`;

    paginationEl.innerHTML = html;

    paginationEl.querySelectorAll('button[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-page');
        if (action === 'prev' && currentPage > 1) currentPage--;
        if (action === 'next' && currentPage < totalPages) currentPage++;
        renderList();
      });
    });
  }

  function renderList() {
    if (!Array.isArray(CURRENT_FILTERED) || CURRENT_FILTERED.length === 0) {
      container.innerHTML = "<p>No ports found.</p>";
      renderPagination(0);
      return;
    }

    renderPagination(CURRENT_FILTERED.length);

    const start = (currentPage - 1) * PAGE_SIZE;
    const end   = start + PAGE_SIZE;
    const items = CURRENT_FILTERED.slice(start, end);

    container.innerHTML = items.map(p => {
      const img = p.image_url && p.image_url.trim()
        ? p.image_url
        : "/assets/placeholder-port.jpg";

      const title = p.name || "Unnamed Port";
      const where = [p.city, p.state, p.country].filter(Boolean).join(", ");
      const pin = p.pincode ? ` - ${p.pincode}` : "";

      return `
        <article class="port-card" data-id="${p.id || ""}">
          <img class="port-img" src="${img}" alt="${title}" />
          <h3>${title}</h3>
          <p class="muted">${where}${pin}</p>
        </article>
      `;
    }).join("");

    // 🔍 Click → fetch full details from /ports/:id
    [...container.querySelectorAll('.port-card')].forEach(card => {
      card.addEventListener('click', async () => {
        const id = card.getAttribute('data-id');
        if (!id) return;

        try {
          const detail = await api(`${endpoint}/${encodeURIComponent(id)}`);

          const img = detail.image_url && detail.image_url.trim()
            ? detail.image_url
            : "/assets/placeholder-port.jpg";

          const portName = detail.name || "Unnamed Port";
          const state    = detail.state || "";
          const city     = detail.city || "";
          const pin      = detail.pincode || "";
          const country  = detail.country || "";

          const description = detail.description || "";
          const portType    = (detail.port_type || "").toLowerCase();
          const portTypeLabel = portType
            ? portType.charAt(0).toUpperCase() + portType.slice(1)
            : "";

          // facilities – support array or Dynamo-style {L:[{S:""}]}
          let facilities = [];
          if (Array.isArray(detail.facilities)) {
            facilities = detail.facilities;
          } else if (detail.facilities && Array.isArray(detail.facilities.L)) {
            facilities = detail.facilities.L.map(x => x.S).filter(Boolean);
          }

          const facilitiesHtml = facilities.length
            ? `<ul>${facilities.map(f => `<li>${f}</li>`).join("")}</ul>`
            : "";

          const mapLine = [city, state, country].filter(Boolean).join(", ");
          const mapText = mapLine || "";

          const html = `
            <article class="port-card" style="box-shadow:none;border:0;margin:0">
              <img class="port-img" src="${img}" alt="${portName}" />
              <h2 style="margin:8px 0 8px">${portName}</h2>

              <p style="margin:4px 0;"><strong>Port Name:</strong> ${portName}</p>
              ${state ? `<p style="margin:4px 0;"><strong>State:</strong> ${state}</p>` : ""}
              ${city ? `<p style="margin:4px 0;"><strong>City:</strong> ${city}</p>` : ""}
              ${pin ? `<p style="margin:4px 0;"><strong>Pincode:</strong> ${pin}</p>` : ""}
              ${country ? `<p style="margin:4px 0;"><strong>Country:</strong> ${country}</p>` : ""}

              ${description
                ? `<p style="margin:12px 0 4px;"><strong>Detail:</strong> ${description}</p>`
                : ""}

              ${portTypeLabel
                ? `<p style="margin:4px 0;"><strong>Port Type:</strong> ${portTypeLabel}</p>`
                : ""}

              ${facilities.length
                ? `<p style="margin:12px 0 4px;"><strong>Facilities:</strong></p>${facilitiesHtml}`
                : ""}

              ${mapText
                ? `<p class="muted" style="margin-top:12px;">${mapText}${pin ? " - " + pin : ""}</p>`
                : ""}
            </article>
          `;

          openDrawer(html, portName);
        } catch (err) {
          console.error(err);
          openDrawer(`<p class="error">${err.message}</p>`, "Port details");
        }
      });
    });
  }

  function runSearch() {
    CURRENT_FILTERED = applyFilters();
    currentPage = 1;
    renderList();
  }

  function resetAll() {
    loadStates();
    if (nameQ) nameQ.value = "";
    if (typeSel) typeSel.value = "";
    if (citySel) citySel.value = "";
    if (portSel) portSel.value = "";
    if (pinSel) pinSel.value  = "";
    currentPage = 1;
    CURRENT_FILTERED = [...ALL_PORTS];
    renderList();
    closeDrawer();
  }

  // ---------------------------------- INITIAL LOAD ----------------------------------
  async function loadAllPorts() {
    container.innerHTML = "<p>Loading ports…</p>";
    try {
      const items = await api(endpoint);
      if (!Array.isArray(items)) {
        throw new Error("Ports API did not return an array");
      }
      ALL_PORTS = items;
      CURRENT_FILTERED = [...ALL_PORTS];
      currentPage = 1;
      renderList();
    } catch (err) {
      console.error(err);
      container.innerHTML = `<p class="error">${err.message}</p>`;
    }
  }

  // ---------------------------------- EVENTS ----------------------------------
  if (stateSel) stateSel.addEventListener('change', onStateChange);
  if (citySel)  citySel.addEventListener('change', onCityChange);

  if (portSel)  portSel.addEventListener('change', () => { currentPage = 1; runSearch(); });
  if (pinSel)   pinSel.addEventListener('change', () => { currentPage = 1; runSearch(); });
  if (typeSel)  typeSel.addEventListener('change', () => { currentPage = 1; runSearch(); });
  if (nameQ)    nameQ.addEventListener('input', () => { currentPage = 1; runSearch(); });

  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      currentPage = 1;
      runSearch();
    });
  }

  if (resetBtn) resetBtn.addEventListener('click', resetAll);

  // ---------------------------------- BOOT ----------------------------------
  try {
    const cfg = await waitForConfig();
    base = (cfg.apiBaseUrl || "").replace(/\/$/, "");
    endpoint = cfg.portsEndpoint || "/ports";

    loadStates();
    await loadAllPorts();
  } catch (err) {
    container.innerHTML = `<p class="error">${err.message}</p>`;
    console.error(err);
  }
})();
