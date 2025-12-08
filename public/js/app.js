// --- CONFIGURATION ---
const API_URL = '/api';
const SUPABASE_URL = 'https://iszzxbakpuwjxhgjwrgi.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzenp4YmFrcHV3anhoZ2p3cmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDE4MDcsImV4cCI6MjA3OTgxNzgwN30.NwWX_PUzLKsfw2UjT0SK7wCZyZnd9jtvggf6bAlD3V0'; 

let supabaseClient = null;
let currentUserEmail = null;
let customersList = [];
let html5QrCode = null; // Scanner Instance

if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            currentUserEmail = session.user.email;
            if (document.getElementById('admin-dashboard')) {
                showSection('admin-dashboard');
                loadCustomers();
            }
        }
        if (event === 'PASSWORD_RECOVERY') showSection('admin-update-pass-sec');
    });
}

function showSection(id) {
    document.querySelectorAll('.app-section').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(id);
    if(target) target.classList.remove('hidden');
}

function getRankInfo(redeems) {
    const r = parseInt(redeems) || 0;
    if (r >= 30) return { name: "TITAN", img: "shield_titan.png", color: "#e6e6fa", next: 1000, pct: 100 };
    if (r >= 26) return { name: "CHAMPION", img: "shield_champion.png", color: "#ff4500", next: 30, pct: (r/30)*100 };
    if (r >= 21) return { name: "MASTER", img: "shield_master.png", color: "#dc143c", next: 26, pct: (r/26)*100 };
    if (r >= 16) return { name: "CRYSTAL", img: "shield_crystal.png", color: "#00ffff", next: 21, pct: (r/21)*100 };
    if (r >= 11) return { name: "GOLD", img: "shield_gold.png", color: "#ffd700", next: 16, pct: (r/16)*100 };
    if (r >= 6)  return { name: "SILVER", img: "shield_silver.png", color: "#c0c0c0", next: 11, pct: (r/11)*100 };
    return { name: "BRONZE", img: "shield_bronze.png", color: "#cd7f32", next: 6, pct: (r/6)*100 };
}

// ==========================================
// 📷 SCANNER LOGIC
// ==========================================
function startScanner() {
    document.getElementById('scanner-modal').classList.remove('hidden');
    
    // Initialize Scanner
    html5QrCode = new Html5Qrcode("reader");
    
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
    .catch(err => {
        alert("Camera Error: " + err);
        stopScanner();
    });
}

function onScanSuccess(decodedText, decodedResult) {
    // 1. Stop Scanning
    stopScanner();
    
    // 2. Play Sound (Optional Beep)
    // const audio = new Audio('beep.mp3'); audio.play();

    // 3. Populate Search
    const searchInput = document.getElementById('search-input');
    searchInput.value = decodedText;
    
    // 4. Trigger Search Logic
    searchCustomers();
    
    // 5. Visual Feedback
    alert("🔍 Found ID: " + decodedText);
}

function stopScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            document.getElementById('scanner-modal').classList.add('hidden');
        }).catch(err => console.log("Stop failed", err));
    } else {
        document.getElementById('scanner-modal').classList.add('hidden');
    }
}

// ==========================================
// 🎨 ID CARD (With Real QR Code)
// ==========================================
async function generateIDCard(name, id, redeems = 0) {
    document.getElementById('id-modal').classList.remove('hidden');
    const canvas = document.getElementById('cardCanvas');
    const ctx = canvas.getContext('2d');
    const rank = getRankInfo(redeems);

    const loadImage = (src) => new Promise((resolve) => {
        const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = src;
    });

    // 1. Generate QR Code Image Data URL
    let qrDataUrl = await QRCode.toDataURL(id, {
        width: 100,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" }
    });
    const qrImg = await loadImage(qrDataUrl);
    const logoImg = await loadImage('assets/logo.png');
    const shieldImg = await loadImage(`assets/${rank.img}`);

    // BG
    const grd = ctx.createLinearGradient(0, 0, 450, 270);
    grd.addColorStop(0, "#0a0a0a"); grd.addColorStop(1, "#1a1a1a");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 450, 270);

    // Hex Pattern
    ctx.save(); ctx.strokeStyle = "rgba(255, 255, 255, 0.03)"; ctx.lineWidth = 1;
    for (let y = 0; y < 270; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(450, y); ctx.stroke(); }
    ctx.restore();

    // Borders
    ctx.strokeStyle = rank.color; ctx.lineWidth = 3; ctx.strokeRect(10, 10, 430, 250);

    // Logo
    if (logoImg) {
        ctx.save(); ctx.shadowColor = "black"; ctx.shadowBlur = 10;
        ctx.drawImage(logoImg, 25, 25, 60, 60); ctx.restore();
    }

    // Header
    ctx.textAlign = "left"; ctx.fillStyle = rank.color;
    ctx.font = "bold 28px 'Cinzel'"; ctx.fillText("RK DRAGON", 95, 55);
    ctx.font = "10px sans-serif"; ctx.fillStyle = "#aaa"; ctx.letterSpacing = "2px";
    ctx.fillText("OFFICIAL MEMBER", 95, 72);

    // Shield (Top Right)
    if (shieldImg) ctx.drawImage(shieldImg, 360, 20, 60, 70);

    // ID Text & Label
    ctx.fillStyle = "#fff"; ctx.font = "bold 32px monospace"; ctx.fillText(id, 25, 145);
    ctx.font = "10px sans-serif"; ctx.fillStyle = "#666"; ctx.fillText("RUNE ID", 25, 115);

    // DRAW QR CODE (Bottom Center/Right)
    if(qrImg) {
        // Draw White Background Box for QR
        ctx.fillStyle = "#fff";
        ctx.fillRect(350, 150, 70, 70);
        // Draw QR
        ctx.drawImage(qrImg, 355, 155, 60, 60);
    }

    // Name & Rank
    ctx.fillStyle = rank.color; ctx.font = "italic 22px serif";
    let dName = name.toUpperCase(); if(dName.length > 20) dName = dName.substring(0, 18) + "..";
    ctx.fillText(dName, 25, 230);
    ctx.fillStyle = "#fff"; ctx.font = "12px sans-serif"; ctx.fillText(rank.name + " TIER", 25, 250);
}

function downloadID() {
    const link = document.createElement('a'); link.download = 'RK_Card.jpg';
    link.href = document.getElementById('cardCanvas').toDataURL(); link.click();
}

// ==========================================
// ⚡ CORE ACTIONS & AUTH (Standard)
// ==========================================
// ... (Paste all standard functions here: createCustomer, updateStamp, deleteCustomer, Auth, CSV) ...
// The above are the only modified functions. Below is standard for completeness.

async function createCustomer() {
    const name = document.getElementById('new-name').value;
    const mobile = document.getElementById('new-mobile').value;
    if(!name || !mobile) return alert("Fill all fields");
    const res = await fetch(`${API_URL}/customer`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'add', name, mobile}) });
    const data = await res.json();
    if(res.ok) { generateIDCard(name, data.customerId, 0); loadCustomers(); } else alert(data.error);
}

async function updateStamp(id, type) {
    const cust = customersList.find(c => c.customer_id === id);
    if(!cust) return;
    if(type === 'add') { cust.stamps = (cust.stamps||0)+1; }
    else if(type === 'remove') { cust.stamps = Math.max(0, (cust.stamps||0)-1); }
    else if(type === 'reset') { cust.stamps = 0; cust.redeems = (cust.redeems||0)+1; }
    renderAdminList(customersList);
    await fetch(`${API_URL}/customer`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'stamp', id, type}) });
}

async function deleteCustomer(id) {
    if(!confirm("Delete?")) return;
    const password = prompt("Enter Admin Password:");
    if(!password) return;
    const { error } = await supabaseClient.auth.signInWithPassword({ email: currentUserEmail, password: password });
    if (error) return alert("Wrong Password!");
    await fetch(`${API_URL}/customer`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'delete', id}) });
    loadCustomers();
}

// ADMIN LIST & SEARCH
async function loadCustomers() {
    const el = document.getElementById('customer-list');
    if(el.innerHTML.trim() === "") el.innerHTML = '<div style="color:#888;">Summoning...</div>';
    try {
        const res = await fetch(`${API_URL}/customer?action=list`);
        customersList = await res.json();
        renderAdminList(customersList);
    } catch(e) { console.error(e); }
}

function renderAdminList(data) {
    const el = document.getElementById('customer-list');
    el.innerHTML = "";
    data.forEach(c => {
        const rank = getRankInfo(c.redeems || 0);
        let btns = (c.stamps >= 6) ? 
            `<div class="stamp-control"><button onclick="updateStamp('${c.customer_id}', 'reset')" class="primary-btn" style="flex:2;">🎁 REDEEM</button><button onclick="updateStamp('${c.customer_id}', 'remove')" class="secondary-btn" style="flex:1;">Undo</button></div>` :
            `<div class="stamp-control"><button onclick="updateStamp('${c.customer_id}', 'add')" class="primary-btn" style="flex:2;">+ Stamp</button><button onclick="updateStamp('${c.customer_id}', 'remove')" class="secondary-btn" style="flex:1;">-</button></div>`;

        el.innerHTML += `
            <div class="cust-item">
                <img src="assets/${rank.img}" class="rank-mini-icon" onerror="this.style.display='none'">
                <div class="cust-header"><div><div style="font-weight:bold; font-size:1.1em; color:white;">${c.name}</div><div style="color:${rank.color}; font-size:0.9em;">${c.customer_id}</div></div></div>
                <div class="stamp-container">${getDragonBalls(c.stamps||0)}</div>
                ${btns}
                <div style="margin-top:10px; border-top:1px solid #333; padding-top:10px; display:flex; gap:10px;">
                    <button onclick="generateIDCard('${c.name}', '${c.customer_id}', ${c.redeems||0})" class="secondary-btn" style="font-size:0.8em; padding:8px;">View ID</button>
                    <button onclick="deleteCustomer('${c.customer_id}')" class="secondary-btn" style="font-size:0.8em; padding:8px; border-color:red; color:red;">Delete</button>
                </div>
            </div>`;
    });
}

function getDragonBalls(count) {
    let html = ''; for(let i=0; i<6; i++) html += `<div class="dragon-ball ${i < count ? 'filled' : ''}"></div>`; return html;
}

function searchCustomers() {
    const q = document.getElementById('search-input').value.toLowerCase();
    renderAdminList(customersList.filter(c => (c.name && c.name.toLowerCase().includes(q)) || (c.customer_id && c.customer_id.toLowerCase().includes(q)) || (c.mobile && String(c.mobile).includes(q))));
}

// ADMIN AUTH
async function adminSignIn() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-pass').value;
    const { data } = await supabaseClient.from('admin_profiles').select('email').eq('username', username).single();
    if (!data) return alert("User not found");
    const { error } = await supabaseClient.auth.signInWithPassword({ email: data.email, password });
    if (error) alert("Wrong Password");
}
async function adminSignUp() {
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-pass').value;
    const username = document.getElementById('reg-username').value;
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) return alert(error.message);
    await supabaseClient.from('admin_profiles').insert([{ username, email }]);
    alert("Registered! Login now."); showSection('admin-login-sec');
}
async function resetAdminPassword() {
    const email = document.getElementById('forgot-email').value;
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.href });
    if(error) alert(error.message); else alert("Reset link sent!");
}
async function updateAdminPassword() {
    const newPass = document.getElementById('new-password').value;
    const { error } = await supabaseClient.auth.updateUser({ password: newPass });
    if (error) alert(error.message); else { alert("Updated! Login."); adminSignOut(); }
}
async function adminSignOut() { await supabaseClient.auth.signOut(); window.location.reload(); }

// Customer Portal
async function customerLogin() {
    const id = document.getElementById('cust-login-id').value.trim();
    if(!id) return alert("Enter ID");
    try {
        const res = await fetch(`${API_URL}/customer?action=login&id=${id}`);
        const data = await res.json();
        if(res.ok && data.customer_id) { showSection('cust-dashboard'); renderCustomerStats(data); } else alert("ID not found");
    } catch (e) { alert("Connection Error"); }
}
function renderCustomerStats(c) {
    const rank = getRankInfo(c.redeems || 0);
    document.getElementById('display-cust-name').innerText = c.name;
    document.getElementById('display-rank-name').innerText = rank.name;
    document.getElementById('display-rank-name').style.color = rank.color;
    document.getElementById('display-redeems').innerText = c.redeems || 0;
    document.getElementById('rank-shield-img').src = `assets/${rank.img}`;
    const nextGoal = rank.next;
    const progress = Math.min(((c.redeems || 0) / nextGoal) * 100, 100);
    document.getElementById('xp-bar').style.width = `${progress}%`;
    document.getElementById('cust-stamps-display').innerHTML = getDragonBalls(c.stamps||0);
    document.getElementById('view-my-id-btn').onclick = () => generateIDCard(c.name, c.customer_id, c.redeems);
}

function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function showAdminTab(tab) {
    document.getElementById('adm-add-sec').classList.add('hidden'); document.getElementById('adm-list-sec').classList.add('hidden');
    if(tab === 'add') document.getElementById('adm-add-sec').classList.remove('hidden');
    if(tab === 'list') { document.getElementById('adm-list-sec').classList.remove('hidden'); loadCustomers(); }
}
function exportCSV() { /* same as before */ }
function importCSV() { document.getElementById('csv-input').files[0] && alert("Import Logic"); }
