// --- CONFIGURATION ---
const API_URL = '/api';

// ⚠️ PASTE YOUR SUPABASE KEYS HERE
const SUPABASE_URL = 'https://iszzxbakpuwjxhgjwrgi.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzenp4YmFrcHV3anhoZ2p3cmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDE4MDcsImV4cCI6MjA3OTgxNzgwN30.NwWX_PUzLKsfw2UjT0SK7wCZyZnd9jtvggf6bAlD3V0'; 

let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    if(document.getElementById('admin-portal')) checkAdminSession();
}

// --- NAVIGATION ---
function goHome() {
    if(document.getElementById('landing-page')) {
        hideAll();
        document.getElementById('landing-page').classList.remove('hidden');
    } else {
        window.location.href = 'index.html';
    }
}
function goToCustomerLogin() { window.location.href = 'customer.html'; }
function goToAdminLogin() {
    hideAll();
    document.getElementById('admin-portal').classList.remove('hidden');
    checkAdminSession();
}
function hideAll() {
    const pages = ['landing-page', 'admin-portal'];
    pages.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });
}
function showSection(id) {
    // Hide all auth sections
    ['admin-login-sec', 'admin-register-sec', 'admin-forgot-sec'].forEach(sec => {
        document.getElementById(sec).classList.add('hidden');
    });
    // Show target
    document.getElementById(id).classList.remove('hidden');
}

// ==========================================
// ⚔️ CUSTOMER PORTAL LOGIC
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
        } else alert("ID not found in the archives.");
    } catch (e) { alert("Server connection failed."); }
}

function calculateRank(total) {
    if (total > 30) return { name: "TITAN", color: "#e6e6fa", fill: "linear-gradient(90deg, #e6e6fa, #fff)", pct: 100, next: "Max" };
    if (total > 25) return { name: "CHAMPION", color: "#ff4500", fill: "linear-gradient(90deg, #ff4500, #ff8c00)", pct: (total/30)*100, next: "Titan" };
    if (total > 20) return { name: "MASTER", color: "#dc143c", fill: "linear-gradient(90deg, #dc143c, #ff0000)", pct: (total/25)*100, next: "Champion" };
    if (total > 15) return { name: "CRYSTAL", color: "#00ffff", fill: "linear-gradient(90deg, #00ced1, #00ffff)", pct: (total/20)*100, next: "Master" };
    if (total > 10) return { name: "GOLD", color: "#ffd700", fill: "linear-gradient(90deg, #daa520, #ffd700)", pct: (total/15)*100, next: "Crystal" };
    if (total > 5)  return { name: "SILVER", color: "#c0c0c0", fill: "linear-gradient(90deg, #808080, #c0c0c0)", pct: (total/10)*100, next: "Gold" };
    return { name: "BRONZE", color: "#cd7f32", fill: "linear-gradient(90deg, #8b4513, #cd7f32)", pct: (total/5)*100, next: "Silver" };
}

function renderCustomerStats(c) {
    document.getElementById('display-cust-name').innerText = c.name;
    document.getElementById('lifetime-count').innerText = c.lifetime_stamps || 0;
    
    const rankData = calculateRank(c.lifetime_stamps || 0);
    const rankEl = document.getElementById('rpg-rank');
    rankEl.innerText = rankData.name;
    rankEl.style.color = rankData.color;
    
    const nextEl = document.getElementById('next-rank-name');
    if(nextEl) nextEl.innerText = rankData.next;

    const barEl = document.getElementById('xp-bar');
    barEl.style.width = Math.min(rankData.pct, 100) + "%";
    barEl.style.background = rankData.fill;
    barEl.style.boxShadow = `0 0 10px ${rankData.color}`;

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
// 🛡️ ADMIN LOGIC
// ==========================================

async function checkAdminSession() {
    if(!supabaseClient) return;
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        // Hide all auth forms, show dashboard
        ['admin-login-sec', 'admin-register-sec', 'admin-forgot-sec'].forEach(sec => {
            document.getElementById(sec).classList.add('hidden');
        });
        document.getElementById('admin-dashboard').classList.remove('hidden');
        loadCustomers();
    } else {
        // Default show login
        document.getElementById('admin-login-sec').classList.remove('hidden');
        document.getElementById('admin-dashboard').classList.add('hidden');
    }
}

// --- NEW REGISTER LOGIC ---
async function adminSignUp() {
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-pass').value;
    const username = document.getElementById('reg-username').value;

    if (!email || !password || !username) return alert("All fields are required.");
    if (password.length < 6) return alert("Password must be at least 6 characters.");

    // 1. Check if username exists in public table
    const { data: existingUser } = await supabaseClient
        .from('admin_profiles')
        .select('username')
        .eq('username', username)
        .single();

    if(existingUser) return alert("Username already taken! Choose another.");

    // 2. Register with Supabase Auth
    const { data, error } = await supabaseClient.auth.signUp({ email, password });

    if (error) {
        alert("Registration Error: " + error.message);
    } else {
        // 3. Save mapping to public table
        await supabaseClient.from('admin_profiles').insert([{ username: username, email: email }]);
        
        alert("Registration Successful! Please Login.");
        showSection('admin-login-sec');
    }
}

// --- NEW LOGIN LOGIC (Username -> Email) ---
async function adminSignIn() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-pass').value;

    if (!username || !password) return alert("Enter Username and Password");

    // 1. Find Email using Username
    const { data, error: tableError } = await supabaseClient
        .from('admin_profiles')
        .select('email')
        .eq('username', username)
        .single();

    if (tableError || !data) {
        return alert("Username not found!");
    }

    // 2. Log in with the found Email
    const { error: authError } = await supabaseClient.auth.signInWithPassword({ 
        email: data.email, 
        password: password 
    });
    
    if (authError) alert("Login Failed: Incorrect Password");
    else checkAdminSession();
}

async function adminSignOut() {
    await supabaseClient.auth.signOut();
    checkAdminSession();
}

async function resetAdminPassword() {
    const email = document.getElementById('forgot-email').value;
    if(!email) return alert("Enter your email address");
    const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email);
    if(error) alert(error.message);
    else alert("Password reset link sent to " + email);
}

// --- ADMIN LIST ---
async function loadCustomers() {
    const el = document.getElementById('customer-list');
    if(!el) return;
    el.innerHTML = '<div style="color:#888; margin-top:20px;">Summoning data...</div>';
    const res = await fetch(`${API_URL}/customer?action=list`);
    customersList = await res.json();
    renderAdminList(customersList);
}

function renderAdminList(data) {
    const el = document.getElementById('customer-list');
    if(!el) return;
    el.innerHTML = "";
    
    data.forEach(c => {
        const rank = calculateRank(c.lifetime_stamps || 0);
        let btns = '';

        // 6th Stamp Logic: Show Redeem AND Remove
        if(c.stamps >= 6) {
            btns = `
            <div class="stamp-control">
                <button onclick="updateStamp('${c.customer_id}', 'reset')" style="background:linear-gradient(45deg, gold, orange); color:black; font-weight:bold; flex:3;">🎁 REDEEM</button>
                <button onclick="updateStamp('${c.customer_id}', 'remove')" class="secondary" style="flex:1;">Undo (-)</button>
            </div>`;
        } else {
            btns = `
            <div class="stamp-control">
                <button onclick="updateStamp('${c.customer_id}', 'add')" style="flex:3;">Stamp +1</button>
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
                <div class="cust-rank" style="color:${rank.color}; border-color:${rank.color}">${rank.name}</div>
            </div>
            <div style="font-size:0.8em; color:#888; margin-bottom:10px;">Mobile: ${c.mobile} | Lifetime: ${c.lifetime_stamps||0}</div>
            
            <div class="stamp-container" style="justify-content:flex-start; margin: 10px 0;">
                ${getOrbHTML(c.stamps)}
            </div>
            
            ${btns}

            <div class="action-row">
                <button class="secondary small-btn" onclick="generateIDCard('${c.name}', '${c.customer_id}')">ID Card</button>
                <button class="secondary small-btn danger" style="border-color:#500;" onclick="deleteCustomer('${c.customer_id}')">Delete</button>
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
    if(res.ok) {
        generateIDCard(name, data.customerId); 
        alert("Created: " + data.customerId);
        loadCustomers();
    } else alert(data.error);
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
    if(!confirm("Permanently Delete?")) return;
    await fetch(`${API_URL}/customer`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'delete', id})
    });
    loadCustomers();
}

// --- PREMIUM ID CARD ---
function generateIDCard(name, id) {
    document.getElementById('id-modal').classList.remove('hidden');
    const ctx = document.getElementById('cardCanvas').getContext('2d');
    
    // Background
    const grd = ctx.createLinearGradient(0,0,450,270);
    grd.addColorStop(0,"#2a0000"); grd.addColorStop(1,"#000");
    ctx.fillStyle = grd; ctx.fillRect(0,0,450,270);
    
    // Borders
    ctx.strokeStyle = "#ffd700"; ctx.lineWidth = 8; ctx.strokeRect(4,4,442,262);
    ctx.strokeStyle = "#ff4500"; ctx.lineWidth = 2; ctx.strokeRect(15,15,420,240);

    // Text
    ctx.textAlign = "center";
    ctx.shadowColor = "red"; ctx.shadowBlur = 15;
    ctx.fillStyle = "#ffd700"; ctx.font = "bold 32px serif"; 
    ctx.fillText("RK DRAGON", 225, 60);
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = "white"; ctx.font = "bold 48px sans-serif"; 
    ctx.fillText(id, 225, 140);
    
    ctx.fillStyle = "#ffcc00"; ctx.font = "italic 24px serif"; 
    ctx.fillText(name.toUpperCase(), 225, 190);
    
    ctx.fillStyle = "#aaa"; ctx.font = "14px sans-serif"; 
    ctx.fillText("LOYALTY MEMBER", 225, 230);
}

function downloadID() {
    const link = document.createElement('a');
    link.download = 'RK_Card.jpg';
    link.href = document.getElementById('cardCanvas').toDataURL();
    link.click();
}

function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
// Tabs
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
function exportCSV() { 
    if(customersList.length === 0) return alert("No data");
    let csv = "data:text/csv;charset=utf-8,Name,Mobile,ID,Stamps,Lifetime\n" + 
    customersList.map(r => `${r.name},${r.mobile},${r.customer_id},${r.stamps},${r.lifetime_stamps}`).join("\n");
    const link = document.createElement("a"); link.href = encodeURI(csv); link.download = "data.csv"; link.click();
}
function importCSV() { document.getElementById('csv-input').files[0] && alert("Import Logic Ready"); }
