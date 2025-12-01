// --- CONFIGURATION ---
const API_URL = '/api';

// ⚠️ PASTE YOUR KEYS HERE
const SUPABASE_URL = 'https://iszzxbakpuwjxhgjwrgi.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzenp4YmFrcHV3anhoZ2p3cmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDE4MDcsImV4cCI6MjA3OTgxNzgwN30.NwWX_PUzLKsfw2UjT0SK7wCZyZnd9jtvggf6bAlD3V0'; 

let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// --- UTILS ---
function showSection(id) {
    ['admin-login-sec', 'admin-register-sec', 'admin-forgot-sec'].forEach(sid => {
        const el = document.getElementById(sid);
        if(el) el.classList.add('hidden');
    });
    document.getElementById(id).classList.remove('hidden');
}

// ==========================================
// ⚔️ CUSTOMER PORTAL
// ==========================================
async function customerLogin() {
    const idInput = document.getElementById('cust-login-id');
    if(!idInput) return;
    const id = idInput.value.trim();
    if(!id) return alert("Enter Rune ID");

    try {
        const res = await fetch(`${API_URL}/customer?action=login&id=${id}`);
        const data = await res.json();
        if(res.ok && data.customer_id) {
            document.getElementById('cust-login-sec').classList.add('hidden');
            document.getElementById('cust-dashboard').classList.remove('hidden');
            renderCustomerStats(data);
        } else alert("ID not found.");
    } catch (e) { alert("Server connection failed."); }
}

function calculateRank(total) {
    if (total > 30) return { name: "TITAN", color: "#e6e6fa", fill: "#e6e6fa", pct: 100, next: "Max" };
    if (total > 25) return { name: "CHAMPION", color: "#ff4500", fill: "#ff4500", pct: (total/30)*100, next: "Titan" };
    if (total > 20) return { name: "MASTER", color: "#dc143c", fill: "#dc143c", pct: (total/25)*100, next: "Champion" };
    if (total > 15) return { name: "CRYSTAL", color: "#00ffff", fill: "#00ffff", pct: (total/20)*100, next: "Master" };
    if (total > 10) return { name: "GOLD", color: "#ffd700", fill: "#ffd700", pct: (total/15)*100, next: "Crystal" };
    if (total > 5)  return { name: "SILVER", color: "#c0c0c0", fill: "#c0c0c0", pct: (total/10)*100, next: "Gold" };
    return { name: "BRONZE", color: "#cd7f32", fill: "#cd7f32", pct: (total/5)*100, next: "Silver" };
}

function renderCustomerStats(c) {
    document.getElementById('display-cust-name').innerText = c.name;
    const rankData = calculateRank(c.lifetime_stamps || 0);
    
    const rankEl = document.getElementById('rpg-rank');
    rankEl.innerText = rankData.name;
    rankEl.style.color = rankData.color;
    
    document.getElementById('next-rank-name').innerText = rankData.next;

    const barEl = document.getElementById('xp-bar');
    barEl.style.width = Math.min(rankData.pct, 100) + "%";
    barEl.style.background = rankData.fill;

    let html = '<div class="stamp-container">';
    for(let i=0; i<6; i++) html += `<div class="orb ${i < c.stamps ? 'filled' : ''}"></div>`;
    html += '</div>';
    document.getElementById('cust-stamps-display').innerHTML = html;
    
    const msg = c.stamps >= 6 ? "🎉 REWARD UNLOCKED!" : `Collect ${6 - c.stamps} more.`;
    const msgEl = document.getElementById('cust-status-msg');
    msgEl.innerText = msg;
    msgEl.style.color = c.stamps >= 6 ? "#0f0" : "#aaa";
}

// ==========================================
// 🛡️ ADMIN AUTH
// ==========================================
async function checkAdminSession() {
    if(!supabaseClient) return;
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        showSection('admin-dashboard'); // Actually shows dashboard, hides login forms
        document.getElementById('admin-dashboard').classList.remove('hidden');
        loadCustomers();
    } else {
        showSection('admin-login-sec');
        document.getElementById('admin-dashboard').classList.add('hidden');
    }
}

async function adminSignUp() {
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-pass').value;
    const username = document.getElementById('reg-username').value;
    if (!email || !password || !username) return alert("All fields required");
    
    // 1. Check Username
    const { data: existing } = await supabaseClient.from('admin_profiles').select('username').eq('username', username).single();
    if(existing) return alert("Username taken");

    // 2. Register
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) return alert("Error: " + error.message);

    // 3. Map Username
    await supabaseClient.from('admin_profiles').insert([{ username, email }]);
    alert("Success! Login now.");
    showSection('admin-login-sec');
}

async function adminSignIn() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-pass').value;
    if (!username || !password) return alert("Enter credentials");

    // 1. Get Email
    const { data } = await supabaseClient.from('admin_profiles').select('email').eq('username', username).single();
    if (!data) return alert("Username not found");

    // 2. Login
    const { error } = await supabaseClient.auth.signInWithPassword({ email: data.email, password });
    if (error) alert("Incorrect Password");
    else checkAdminSession();
}

async function adminSignOut() {
    await supabaseClient.auth.signOut();
    checkAdminSession();
}

async function resetAdminPassword() {
    const email = document.getElementById('forgot-email').value;
    if(!email) return alert("Enter email");
    
    // SEND LINK pointing to the secure dashboard
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/dashboard_secure.html',
    });
    
    if(error) alert(error.message);
    else alert("Reset link sent to " + email);
}

// --- ADMIN LIST ---
let customersList = [];
async function loadCustomers() {
    const el = document.getElementById('customer-list');
    el.innerHTML = '<div style="color:#888;">Summoning...</div>';
    const res = await fetch(`${API_URL}/customer?action=list`);
    customersList = await res.json();
    renderAdminList(customersList);
}

function renderAdminList(data) {
    const el = document.getElementById('customer-list');
    el.innerHTML = "";
    data.forEach(c => {
        const rank = calculateRank(c.lifetime_stamps || 0);
        let btns = '';

        // 6th Stamp: Show REDEEM + REMOVE (Undo)
        if(c.stamps >= 6) {
            btns = `
            <div class="stamp-control">
                <button onclick="updateStamp('${c.customer_id}', 'reset')" style="background:linear-gradient(45deg, gold, orange); color:black; font-weight:bold; flex:3;">🎁 REDEEM</button>
                <button onclick="updateStamp('${c.customer_id}', 'remove')" class="secondary" style="flex:1;">Undo</button>
            </div>`;
        } else {
            btns = `
            <div class="stamp-control">
                <button onclick="updateStamp('${c.customer_id}', 'add')" style="flex:3;">+ Stamp</button>
                <button onclick="updateStamp('${c.customer_id}', 'remove')" class="secondary" style="flex:1;">-</button>
            </div>`;
        }

        const div = document.createElement('div');
        div.className = 'cust-item';
        div.innerHTML = `
            <div class="cust-header">
                <div>
                    <div class="cust-name">${c.name}</div>
                    <div class="cust-id">${c.customer_id}</div>
                </div>
                <div style="font-size:0.8em; color:${rank.color}; border:1px solid ${rank.color}; padding:2px 5px; border-radius:4px;">${rank.name}</div>
            </div>
            
            <div class="stamp-container" style="justify-content:flex-start; margin: 10px 0;">
                ${getOrbHTML(c.stamps)}
            </div>
            ${btns}
            <div class="action-row" style="margin-top:10px;">
                <button class="secondary small-btn" onclick="generateIDCard('${c.name}', '${c.customer_id}')">ID Card</button>
                <button class="secondary small-btn danger" onclick="deleteCustomer('${c.customer_id}')">Delete</button>
            </div>
        `;
        el.appendChild(div);
    });
}

function getOrbHTML(count) {
    let html = '';
    for(let i=0; i<6; i++) html += `<div class="orb ${i < count ? 'filled' : ''}"></div>`;
    return html;
}

// --- ACTIONS ---
async function createCustomer() {
    const name = document.getElementById('new-name').value;
    const mobile = document.getElementById('new-mobile').value;
    const res = await fetch(`${API_URL}/customer`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'add', name, mobile})
    });
    const data = await res.json();
    if(res.ok) { generateIDCard(name, data.customerId); loadCustomers(); }
    else alert(data.error);
}

async function updateStamp(id, type) {
    const c = customersList.find(x => x.customer_id === id);
    if(c) {
        if(type === 'add') { c.stamps++; if(!c.lifetime_stamps) c.lifetime_stamps=0; c.lifetime_stamps++; }
        if(type === 'remove' && c.stamps > 0) { c.stamps--; c.lifetime_stamps--; }
        if(type === 'reset') c.stamps = 0;
        renderAdminList(customersList);
    }
    await fetch(`${API_URL}/customer`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'stamp', id, type})
    });
}

async function deleteCustomer(id) {
    if(!confirm("Delete?")) return;
    await fetch(`${API_URL}/customer`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'delete', id})
    });
    loadCustomers();
}

// --- ID CARD ---
function generateIDCard(name, id) {
    document.getElementById('id-modal').classList.remove('hidden');
    const ctx = document.getElementById('cardCanvas').getContext('2d');
    // Card drawing logic same as before...
    const grd = ctx.createLinearGradient(0,0,450,270);
    grd.addColorStop(0,"#300"); grd.addColorStop(1,"#000");
    ctx.fillStyle = grd; ctx.fillRect(0,0,450,270);
    ctx.strokeStyle = "gold"; ctx.lineWidth = 6; ctx.strokeRect(5,5,440,260);
    
    ctx.textAlign = "center";
    ctx.fillStyle = "gold"; ctx.font = "bold 30px serif"; ctx.fillText("RK DRAGON", 225, 50);
    ctx.fillStyle = "white"; ctx.font = "bold 45px sans-serif"; ctx.fillText(id, 225, 130);
    ctx.fillStyle = "#fa0"; ctx.font = "italic 24px serif"; ctx.fillText(name, 225, 180);
}

function downloadID() {
    const link = document.createElement('a');
    link.download = 'RK_Card.jpg';
    link.href = document.getElementById('cardCanvas').toDataURL();
    link.click();
}

function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function showAdminTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('adm-add-sec').classList.add('hidden');
    document.getElementById('adm-list-sec').classList.add('hidden');
    if(tab === 'add') document.getElementById('adm-add-sec').classList.remove('hidden');
    if(tab === 'list') { document.getElementById('adm-list-sec').classList.remove('hidden'); loadCustomers(); }
}
function searchCustomers() {
    const q = document.getElementById('search-input').value.toLowerCase();
    const filtered = customersList.filter(c => c.name.toLowerCase().includes(q) || c.customer_id.toLowerCase().includes(q));
    renderAdminList(filtered);
}
function exportCSV() { /* CSV code */ }
function importCSV() { /* CSV code */ }
