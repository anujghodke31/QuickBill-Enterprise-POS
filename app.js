// ═══════════════════════════════════════════════════════════════
// QuickBill POS — Main Application
// ═══════════════════════════════════════════════════════════════

// --- Configuration ---
const API_BASE = 'http://localhost:3000';

// --- State & DOM Elements ---
const views = {
  dashboard: document.getElementById('view-dashboard'),
  pos: document.getElementById('view-pos'),
  inventory: document.getElementById('view-inventory'),
  customers: document.getElementById('view-customers'),
  reports: document.getElementById('view-reports'),
};

const navBtns = document.querySelectorAll('.nav-btn');
const dateDisplay = document.getElementById('current-date');

// POS Elements
const posSearch = document.getElementById('pos-search');
const posProductList = document.getElementById('pos-product-list');
const posCartItems = document.getElementById('pos-cart-items');
const posTotal = document.getElementById('pos-total');
const checkoutBtn = document.getElementById('checkout-btn');
const posCustomerSelect = document.getElementById('pos-customer');

// Checkout Modal Elements
const modalCheckout = document.getElementById('modal-checkout');
const modalTotal = document.getElementById('modal-total');
const modalCashGiven = document.getElementById('modal-cash-given');
const modalChange = document.getElementById('modal-change');
const changeDisplay = document.getElementById('change-display');
const btnConfirmPay = document.getElementById('modal-confirm-pay');
const payMethods = document.querySelectorAll('.pay-method');

// Mobile sidebar elements
const sidebar = document.getElementById('sidebar');
const mobileMenuBtn = document.getElementById('mobile-menu-toggle');

// App Data
let products = [];
let cart = [];
let customers = [];
let currentPaymentMethod = 'Cash';

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════
init();

function init() {
  updateDate();
  setupNavigation();
  setupMobileMenu();
  setupPOS();
  setupModals();
  setupAuth();

  // Initial Data Fetch
  fetchProducts();
  fetchCustomers();
  loadDashboard();

  // Global Shortcuts
  document.addEventListener('keydown', handleGlobalShortcuts);
}

function updateDate() {
  const now = new Date();
  dateDisplay.innerText = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ═══════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════
function setupNavigation() {
  navBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      // UI Update
      navBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      // View Update
      const viewName = btn.dataset.view;
      Object.values(views).forEach((v) => {
        v.classList.add('hidden');
        v.classList.remove('active');
      });

      views[viewName].classList.remove('hidden');
      views[viewName].classList.add('active');

      // Refresh specific views
      if (viewName === 'inventory') fetchProducts(true);
      if (viewName === 'reports') fetchReports();
      if (viewName === 'customers') fetchCustomers(true);
      if (viewName === 'dashboard') loadDashboard();

      // Close mobile sidebar
      if (sidebar) sidebar.classList.remove('open');
    });
  });
}

function setupMobileMenu() {
  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
      if (
        sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        !mobileMenuBtn.contains(e.target)
      ) {
        sidebar.classList.remove('open');
      }
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
async function loadDashboard() {
  try {
    const res = await fetch(`${API_BASE}/api/invoices`);
    const invoices = await res.json();

    // Calculate Today's Sales
    const today = new Date().toDateString();
    const todayInvoices = invoices.filter(
      (inv) => new Date(inv.timestamp).toDateString() === today
    );
    const todaySales = todayInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    document.getElementById('stat-today-sales').innerText = formatCurrency(todaySales);
    document.getElementById('stat-transactions').innerText = todayInvoices.length;

    // Calculate Low Stock
    const lowStockCount = products.filter((p) => p.stock < p.lowStockThreshold).length;
    document.getElementById('stat-low-stock').innerText = lowStockCount;

    // Chart.js
    renderChart(invoices);
  } catch (err) {
    console.error('Dashboard error', err);
  }
}

let salesChart = null;
function renderChart(invoices) {
  const ctx = document.getElementById('salesChart').getContext('2d');

  // Group sales by last 7 days
  const last7Days = [...Array(7)]
    .map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toLocaleDateString();
    })
    .reverse();

  const data = last7Days.map((date) => {
    return invoices
      .filter((inv) => new Date(inv.timestamp).toLocaleDateString() === date)
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
  });

  if (salesChart) salesChart.destroy();

  salesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: last7Days,
      datasets: [
        {
          label: 'Sales (₹)',
          data: data,
          borderColor: '#6366f1',
          tension: 0.4,
          fill: true,
          backgroundColor: 'rgba(99, 102, 241, 0.08)',
          pointBackgroundColor: '#6366f1',
          pointBorderColor: '#6366f1',
          pointHoverRadius: 6,
          pointRadius: 4,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#94a3b8',
            font: { family: 'Inter' },
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(148, 163, 184, 0.06)' },
          ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
        },
        y: {
          grid: { color: 'rgba(148, 163, 184, 0.06)' },
          ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
        },
      },
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// POS LOGIC
// ═══════════════════════════════════════════════════════════════
function setupPOS() {
  // Search / Barcode Listener
  posSearch.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();

    // Exact Barcode Match?
    const exactMatch = products.find((p) => p.barcode === term);
    if (exactMatch) {
      addToCart(exactMatch);
      posSearch.value = '';
      return;
    }

    const filtered = getFilteredProducts().filter(
      (p) => p.name.toLowerCase().includes(term) || (p.barcode && p.barcode.includes(term))
    );
    renderPOSProducts(filtered);
  });

  checkoutBtn.addEventListener('click', openCheckout);

  // Category Tab Filtering
  const catBtns = document.querySelectorAll('.cat-btn');
  catBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      catBtns.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      posSearch.value = '';
      renderPOSProducts(getFilteredProducts());
    });
  });
}

function getFilteredProducts() {
  const activeTab = document.querySelector('.cat-btn.active');
  const category = activeTab ? activeTab.textContent.trim() : 'All';
  if (category === 'All') return products;
  return products.filter((p) => p.category === category);
}

function addToCart(product) {
  if (product.stock <= 0) {
    showToast('Out of stock!', 'error');
    return;
  }

  const existing = cart.find((item) => item.productId === product._id);
  if (existing) {
    if (existing.quantity >= product.stock) {
      showToast('Stock limit reached!', 'error');
      return;
    }
    existing.quantity++;
  } else {
    cart.push({
      productId: product._id,
      name: product.name,
      price: product.price,
      quantity: 1,
    });
  }
  playSound('beep');
  renderCart();
}

function renderPOSProducts(list) {
  posProductList.innerHTML = '';
  list.forEach((p) => {
    const el = document.createElement('div');
    el.className = 'product-card';
    el.setAttribute('role', 'listitem');

    const isLowStock = p.stock < 5;
    el.innerHTML = `
            <div class="product-name">${p.name}</div>
            <div class="product-price">₹${p.price}</div>
            <span class="product-stock ${isLowStock ? 'low-stock' : 'in-stock'}">${p.stock} in stock</span>
        `;
    el.onclick = () => addToCart(p);
    posProductList.appendChild(el);
  });
}

function renderCart() {
  posCartItems.innerHTML = '';
  let total = 0;

  cart.forEach((item, idx) => {
    total += item.price * item.quantity;
    const el = document.createElement('div');
    el.className = 'cart-item';

    el.innerHTML = `
            <div class="cart-item-info">
                <span class="cart-item-name">${item.name}</span>
                <span class="cart-item-meta">₹${item.price} × ${item.quantity}</span>
            </div>
            <span class="cart-item-total">₹${item.price * item.quantity}</span>
        `;
    el.onclick = () => {
      cart.splice(idx, 1);
      renderCart();
    };
    posCartItems.appendChild(el);
  });

  posTotal.innerText = formatCurrency(total);
  if (cart.length === 0) {
    posCartItems.innerHTML =
      '<div class="empty-state">Cart Empty<br><small>Scan items to begin</small></div>';
  }
}

// ═══════════════════════════════════════════════════════════════
// CHECKOUT & PAYMENT
// ═══════════════════════════════════════════════════════════════
function openCheckout() {
  if (cart.length === 0) return;
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  modalTotal.innerText = formatCurrency(total);
  modalCheckout.classList.remove('hidden');
  modalCashGiven.focus();
}

async function processPayment() {
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  let cashGiven = 0;

  if (currentPaymentMethod === 'Cash') {
    cashGiven = Number(modalCashGiven.value);
    if (cashGiven < total) {
      showToast('Insufficient Cash', 'error');
      return;
    }
  } else {
    cashGiven = total;
  }

  const payload = {
    cartItems: cart,
    cashGiven: cashGiven,
    paymentMethod: currentPaymentMethod,
    customerId: posCustomerSelect.value || null,
  };

  try {
    const res = await fetch(`${API_BASE}/api/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok) {
      showToast(`Payment Successful! Invoice #${data.invoice.invoiceNumber}`, 'success');
      printReceipt(data.invoice, cart, data.notesReturned);

      cart = [];
      renderCart();
      modalCheckout.classList.add('hidden');
      fetchProducts(); // Update stock
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Transaction Failed', 'error');
  }
}

// ═══════════════════════════════════════════════════════════════
// UTILITIES & API FETCHERS
// ═══════════════════════════════════════════════════════════════
const formatCurrency = (amt) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amt);

async function fetchProducts(renderTable = false) {
  try {
    const res = await fetch(`${API_BASE}/api/products`);
    products = await res.json();
    renderPOSProducts(products);

    if (renderTable) {
      const tbody = document.getElementById('inventory-body');
      tbody.innerHTML = products
        .map(
          (p) => `
                <tr>
                    <td>${p.name}</td>
                    <td>${p.barcode || '—'}</td>
                    <td>₹${p.price}</td>
                    <td><span class="${p.stock < p.lowStockThreshold ? 'warning' : ''}">${p.stock}</span></td>
                    <td><button class="action-btn" onclick="editProduct('${p._id}')">Edit</button></td>
                </tr>
            `
        )
        .join('');
    }
  } catch (err) {
    console.error('Fetch products error:', err);
  }
}

async function fetchCustomers(renderTable = false) {
  customers = [];
  posCustomerSelect.innerHTML = '<option value="">Guest Customer</option>';
}

async function fetchReports() {
  try {
    const res = await fetch(`${API_BASE}/api/invoices`);
    const invoices = await res.json();
    const tbody = document.getElementById('reports-body');
    tbody.innerHTML = invoices
      .map(
        (inv) => `
            <tr>
                <td>${inv.invoiceNumber || inv._id.substr(-6)}</td>
                <td>₹${inv.totalAmount}</td>
                <td>${inv.paymentMethod}</td>
                <td>${new Date(inv.timestamp).toLocaleString()}</td>
            </tr>
        `
      )
      .join('');
  } catch (err) {
    console.error('Fetch reports error:', err);
  }
}

// ═══════════════════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════════════════
function setupModals() {
  document.querySelectorAll('.close-modal-btn').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.modal').forEach((m) => m.classList.add('hidden'));
    });
  });

  payMethods.forEach((btn) => {
    btn.addEventListener('click', () => {
      payMethods.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      currentPaymentMethod = btn.dataset.method;

      if (currentPaymentMethod === 'Cash') {
        document.getElementById('cash-input-group').classList.remove('hidden');
      } else {
        document.getElementById('cash-input-group').classList.add('hidden');
      }
    });
  });

  modalCashGiven.addEventListener('input', () => {
    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const given = Number(modalCashGiven.value);
    if (given >= total) {
      changeDisplay.classList.remove('hidden');
      document.getElementById('modal-change').innerText = formatCurrency(given - total);
    } else {
      changeDisplay.classList.add('hidden');
    }
  });

  btnConfirmPay.addEventListener('click', processPayment);

  // Product Management
  const modalProduct = document.getElementById('modal-product');
  const formProduct = document.getElementById('form-product');
  const btnAddProduct = document.getElementById('inv-add-btn');

  btnAddProduct.addEventListener('click', () => {
    formProduct.reset();
    document.getElementById('prod-barcode').value = '';
    formProduct.dataset.mode = 'add';
    delete formProduct.dataset.id;
    modalProduct.classList.remove('hidden');
  });

  formProduct.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('prod-name').value;
    const barcode = document.getElementById('prod-barcode').value;
    const price = Number(document.getElementById('prod-price').value);
    const stock = Number(document.getElementById('prod-stock').value);

    const payload = { name, barcode, price, stock };
    const mode = formProduct.dataset.mode;
    const id = formProduct.dataset.id;

    try {
      const url = mode === 'edit' ? `${API_BASE}/api/products/${id}` : `${API_BASE}/api/products`;
      const method = mode === 'edit' ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast('Product Saved!', 'success');
        modalProduct.classList.add('hidden');
        fetchProducts(true); // Refresh both POS grid and table
      } else {
        const err = await res.json();
        showToast(err.message || 'Error saving product', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Server Error', 'error');
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATION
// ═══════════════════════════════════════════════════════════════
function setupAuth() {
  const modalLogin = document.getElementById('modal-login');
  const formLogin = document.getElementById('form-login');
  const loginTitle = modalLogin.querySelector('h2');
  const loginBtn = formLogin.querySelector('button');
  let isRegistering = false;

  // Create Toggle Link
  let toggleLink = document.getElementById('auth-toggle-p');
  if (!toggleLink) {
    toggleLink = document.createElement('p');
    toggleLink.id = 'auth-toggle-p';
    toggleLink.className = 'auth-toggle-text';
    toggleLink.innerHTML = 'No account? <a href="#" id="auth-toggle">Register here</a>';
    formLogin.appendChild(toggleLink);
  }

  formLogin.addEventListener('click', (e) => {
    if (e.target.id === 'auth-toggle') {
      e.preventDefault();
      isRegistering = !isRegistering;
      if (isRegistering) {
        loginTitle.innerText = 'Register New User';
        loginBtn.innerText = 'Register';
        toggleLink.innerHTML = 'Have an account? <a href="#" id="auth-toggle">Login here</a>';
      } else {
        loginTitle.innerText = 'QuickBill Login';
        loginBtn.innerText = 'Login';
        toggleLink.innerHTML = 'No account? <a href="#" id="auth-toggle">Register here</a>';
      }
    }
  });

  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    const endpoint = isRegistering ? `${API_BASE}/api/auth/register` : `${API_BASE}/api/auth/login`;
    const payload = isRegistering
      ? { username, password, name: username, role: 'admin' }
      : { username, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        if (isRegistering) {
          showToast('Registration Successful! Please Login.', 'success');
          isRegistering = false;
          loginTitle.innerText = 'QuickBill Login';
          loginBtn.innerText = 'Login';
          toggleLink.innerHTML = 'No account? <a href="#" id="auth-toggle">Register here</a>';
        } else {
          localStorage.setItem('user', JSON.stringify(data));
          modalLogin.classList.add('hidden');
          document.querySelector('.server-status').innerHTML += ` | ${data.name}`;
        }
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(`Authentication Error: ${err.message}`, 'error');
    }
  });

  // Check Auth on Load
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    modalLogin.classList.remove('hidden');
  } else {
    modalLogin.classList.add('hidden');
    document.querySelector('.server-status').innerHTML += ` | ${user.name}`;
  }
}

// ═══════════════════════════════════════════════════════════════
// RECEIPT PRINTING
// ═══════════════════════════════════════════════════════════════
function printReceipt(invoice, items, notes) {
  const receiptHTML = `
        <div style="font-family: 'Courier New', monospace; padding: 16px; width: 300px; margin: 0 auto; color: #000;">
            <h3 style="text-align: center; margin: 0; font-size: 16px;">QuickBill Supermarket</h3>
            <p style="text-align: center; margin: 4px 0; font-size: 12px;">Address Line 1, City</p>
            <p style="text-align: center; margin: 8px 0;">────────────────────</p>
            <p style="font-size: 12px;">Invoice: ${invoice.invoiceNumber || invoice._id.substr(-6)}</p>
            <p style="font-size: 12px;">Date: ${new Date().toLocaleString()}</p>
            <p style="font-size: 12px;">Customer: ${document.getElementById('pos-customer').options[document.getElementById('pos-customer').selectedIndex].text}</p>
            <p style="margin: 8px 0;">────────────────────</p>
            <table style="width: 100%; text-align: left; font-size: 12px;">
                ${items
                  .map(
                    (i) => `
                    <tr>
                        <td>${i.name}</td>
                        <td style="text-align: right;">${i.quantity} × ${i.price}</td>
                        <td style="text-align: right;">₹${i.price * i.quantity}</td>
                    </tr>
                `
                  )
                  .join('')}
            </table>
            <p style="margin: 8px 0;">────────────────────</p>
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
                <span>TOTAL</span>
                <span>₹${invoice.totalAmount}</span>
            </div>
            <p style="margin: 8px 0;">────────────────────</p>
            <p style="font-size: 12px;">Payment: ${invoice.paymentMethod}</p>
            ${invoice.paymentDetails ? `<p style="font-size: 12px;">Cash: ₹${invoice.paymentDetails.cashGiven}</p><p style="font-size: 12px;">Change: ₹${invoice.paymentDetails.changeReturned}</p>` : ''}
            <p style="text-align: center; margin-top: 16px; font-size: 12px;">Thank you for shopping!</p>
        </div>
    `;

  const area = document.getElementById('receipt-area');
  area.innerHTML = receiptHTML;
  window.print();
}

// ═══════════════════════════════════════════════════════════════
// PRODUCT EDIT (global for inline onclick)
// ═══════════════════════════════════════════════════════════════
window.editProduct = (id) => {
  const p = products.find((prod) => prod._id === id);
  if (!p) return;

  document.getElementById('prod-name').value = p.name;
  document.getElementById('prod-barcode').value = p.barcode || '';
  document.getElementById('prod-price').value = p.price;
  document.getElementById('prod-stock').value = p.stock;

  const form = document.getElementById('form-product');
  form.dataset.mode = 'edit';
  form.dataset.id = id;

  document.getElementById('modal-product').classList.remove('hidden');
};

// ═══════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════════
function handleGlobalShortcuts(e) {
  if (e.key === 'F2') {
    e.preventDefault();
    navBtns[1].click();
    setTimeout(() => posSearch.focus(), 100);
  }
  if (e.key === 'F9') {
    e.preventDefault();
    if (!modalCheckout.classList.contains('hidden')) {
      processPayment();
    } else {
      if (cart.length > 0) openCheckout();
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// AUDIO SYSTEM (Web Audio API)
// ═══════════════════════════════════════════════════════════════
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  if (type === 'success') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  } else if (type === 'error') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.3);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } else if (type === 'beep') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  }
}

// ═══════════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';

  toast.innerHTML = `<span>${icon} ${message}</span>`;
  container.appendChild(toast);

  // Sound Feedback
  if (type === 'success') playSound('success');
  if (type === 'error') playSound('error');
  if (type === 'info') playSound('beep');

  // Remove after 3s
  setTimeout(() => {
    toast.classList.add('hide');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
}

// Replace global alerts with Toast
window.alert = (msg) => showToast(msg, 'info');
