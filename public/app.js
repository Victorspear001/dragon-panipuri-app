// --- CONFIGURATION ---
const API_URL = '/api';

// ⚠️ PASTE YOUR SUPABASE KEYS HERE ⚠️
const SUPABASE_URL = 'https://iszzxbakpuwjxhgjwrgi.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzenp4YmFrcHV3anhoZ2p3cmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDE4MDcsImV4cCI6MjA3OTgxNzgwN30.NwWX_PUzLKsfw2UjT0SK7wCZyZnd9jtvggf6bAlD3V0'; 

let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Listen for Auth Changes (Login/Logout)
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            console.log("User signed in:", session.user.email);
            if(document.getElementById('admin-portal')) {
                showSection('admin-dashboard');
                loadCustomers();
            }
        }
        if (event === 'SIGNED_OUT') {
            console.log("User signed out");
            if(document.getElementById('admin-portal')) showSection('admin-login-sec');
        }
    });
}

// --- UTILS ---
function showSection(id) {
    const ids = ['admin-login-sec', 'admin-register-sec', 'admin-forgot-sec', 'admin-update-pass-sec', 'admin-dashboard'];
    ids.forEach(sid => {
        const el = document.getElementById(sid);
        if(el) el.classList.add('hidden');
    });
    document.getElementById(id).classList.remove('hidden');
}

// ==========================================
// 🛡️ ADMIN AUTH LOGIC (DEBUGGED)
// ==========================================

async function checkAdminSession() {
    if(!supabaseClient) return;
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        showSection('admin-dashboard');
        loadCustomers();
    } else {
        showSection('admin-login-sec');
    }
}

async function adminSignUp() {
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-pass').value;
    const username = document.getElementById('reg-username').value;

    if (!email || !password || !username) return alert("Please fill all fields");
    if (password.length < 6) return alert("Password must be at least 6 characters");

    // 1. Check if Username Exists
    const { data: existing, error: dbError } = await supabaseClient
        .from('admin_profiles')
        .select('username')
        .eq('username', username)
        .single();

    if (existing) return alert("Username already taken! Try another.");

    // 2. Register Authentication
    const { data, error } = await supabaseClient.auth.signUp({ email, password });

    if (error) {
        alert("Supabase Auth Error: " + error.message);
    } else {
        // 3. Save Username Mapping
        const { error: insertError } = await supabaseClient
            .from('admin_profiles')
            .insert([{ username: username, email: email }]);
        
        if (insertError) {
            alert("Warning: Auth worked, but Username save failed: " + insertError.message);
        } else {
            alert("Registration Successful! Logging you in...");
            adminSignIn(true); // Auto login
        }
    }
}

async function adminSignIn(isAutoLogin = false) {
    let username, password;

    if (isAutoLogin) {
        // Use values from registration form if auto-logging in
        username = document.getElementById('reg-username').value;
        password = document.getElementById('reg-pass').value;
    } else {
        username = document.getElementById('login-username').value;
        password = document.getElementById('login-pass').value;
    }

    if (!username || !password) return alert("Enter Username and Password");

    console.log("Attempting login for:", username);

    // 1. Find Email using Username
    const { data, error: tableError } = await supabaseClient
        .from('admin_profiles')
        .select('email')
        .eq('username', username)
        .single();

    if (tableError || !data) {
        console.error("DB Error:", tableError);
        return alert("Username not found! (Did you register?)");
    }

    console.log("Found email:", data.email);

    // 2. Log in with the found Email
    const { error: authError } = await supabaseClient.auth.signInWithPassword({ 
        email: data.email, 
        password: password 
    });
    
    if (authError) {
        alert("Incorrect Password");
    } else {
        console.log("Login Success!");
        // The onAuthStateChange listener will handle the UI switch
    }
}

async function adminSignOut() {
    await supabaseClient.auth.signOut();
    window.location.reload();
}

async function resetAdminPassword() {
    const email = document.getElementById('forgot-email').value;
    if(!email) return alert("Enter email address");
    
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.href, // Redirect back to this page
    });
    
    if(error) alert(error.message);
    else alert("Check your email for the reset link!");
}

async function updateAdminPassword() {
    const newPass = document.getElementById('new-password').value;
    if(newPass.length < 6) return alert("Password too short");

    const { error } = await supabaseClient.auth.updateUser({ password: newPass });
    if (error) alert("Error: " + error.message);
    else {
        alert("Password Updated! Please login.");
        showSection('admin-login-sec');
    }
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
        } else alert("ID not found in archives.");
    } catch (e) { alert("Server connection failed."); }
}

function renderCustomerStats(c) {
    document.getElementById('display-cust-name').innerText = c.name;
    const rankData = calculateRank(c.lifetime_stamps || 0);
    
    document.getElementById('rpg-rank').innerText = rankData.name;
    document.getElementById('rpg-rank').style.color = rankData.color;
    
    // Inject SVG Badge
    const badgeContainer = document.getElementById('rank-badge-display');
    if(badgeContainer) badgeContainer.innerHTML = getRankSVG(rankData.name);

    document.getElementById('next-rank-name').innerText = rankData.next;
    const barEl = document.getElementById('xp-bar');
    barEl.style.width = Math.min(rankData.pct, 100) + "%";
    barEl.style.background = rankData.color;
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

function calculateRank(total) {
    if (total > 30) return { name: "TITAN", color: "#e6e6fa", pct: 100, next: "Max" };
    if (total > 25) return { name: "CHAMPION", color: "#ff4500", pct: (total/30)*100, next: "Titan" };
    if (total > 20) return { name: "MASTER", color: "#dc143c", pct: (total/25)*100, next: "Champion" };
    if (total > 15) return { name: "CRYSTAL", color: "#00ffff", pct: (total/20)*100, next: "Master" };
    if (total > 10) return { name: "GOLD", color: "#ffd700", pct: (total/15)*100, next: "Crystal" };
    if (total > 5)  return { name: "SILVER", color: "#c0c0c0", pct: (total/10)*100, next: "Gold" };
    return { name: "BRONZE", color: "#cd7f32", pct: (total/5)*100, next: "Silver" };
}

function getRankSVG(rankName) {
    const c = {
        "BRONZE": "#cd7f32", "SILVER": "#c0c0c0", "GOLD": "#ffd700",
        "CRYSTAL": "#00ffff", "MASTER": "#dc143c", "CHAMPION": "#ff4500", "TITAN": "#e6e6fa"
    }[rankName.split(' ')[0]] || "#fff";
    
    return `<svg viewBox="0 0 100 100" fill="none" style="filter:drop-shadow(0 0 5px ${c})">
        <path d="M50 5 L90 20 V50 Q90 80 50 95 Q10 80 10 50 V20 Z" fill="${c}" fill-opacity="0.2" stroke="${c}" stroke-width="2"/>
        <path d="M50 20 V80 M20 50 H80" stroke="${c}" stroke-width="1" stroke-opacity="0.5"/>
        <circle cx="50" cy="50" r="15" fill="${c}"/>
    </svg>`;
}

// --- ADMIN LIST & ACTIONS ---
let customersList = [];
async function loadCustomers() {
    const el = document.getElementById('customer-list');
    if(!el) return;
    el.innerHTML = '<div style="color:#888;">Summoning data...</div>';
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
            <div style="position:absolute; top:10px; right:10px; width:30px;">${getRankSVG(rank.name)}</div>
            <div class="cust-header">
                <div>
                    <div class="cust-name">${c.name}</div>
                    <div class="cust-id">${c.customer_id}</div>
                </div>
            </div>
            <div style="font-size:0.8em; color:#888; margin-bottom:10px;">
                Mobile: ${c.mobile} | Lvl: <span style="color:${rank.color}">${rank.name}</span>
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

// --- DB ACTIONS ---
async function createCustomer() {
    const name = document.getElementById('new-name').value;
    const mobile = document.getElementById('new-mobile').value;
    const res = await fetch(`${API_URL}/customer`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'add', name, mobile}) });
    const data = await res.json();
    if(res.ok) { generateIDCard(name, data.customerId); loadCustomers(); } else alert(data.error);
}
async function updateStamp(id, type) {
    const c = customersList.find(x => x.customer_id === id);
    if(c) {
        if(type === 'add') { c.stamps++; if(!c.lifetime_stamps) c.lifetime_stamps=0; c.lifetime_stamps++; }
        if(type === 'remove' && c.stamps > 0) { c.stamps--; c.lifetime_stamps--; }
        if(type === 'reset') c.stamps = 0;
        renderAdminList(customersList);
    }
    await fetch(`${API_URL}/customer`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'stamp', id, type}) });
}
async function deleteCustomer(id) {
    if(!confirm("Permanently Delete?")) return;
    await fetch(`${API_URL}/customer`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'delete', id}) });
    loadCustomers();
}

// --- ID CARD ---
function generateIDCard(name, id) {
    document.getElementById('id-modal').classList.remove('hidden');
    const ctx = document.getElementById('cardCanvas').getContext('2d');
    const grd = ctx.createLinearGradient(0,0,450,270);
    grd.addColorStop(0,"#2a0000"); grd.addColorStop(1,"#000");
    ctx.fillStyle = grd; ctx.fillRect(0,0,450,270);
    ctx.strokeStyle = "gold"; ctx.lineWidth = 6; ctx.strokeRect(5,5,440,260);
    ctx.textAlign = "center";
    ctx.fillStyle = "gold"; ctx.font = "bold 30px serif"; ctx.fillText("RK DRAGON", 225, 50);
    ctx.fillStyle = "white"; ctx.font = "bold 45px sans-serif"; ctx.fillText(id, 225, 130);
    ctx.fillStyle = "#fa0"; ctx.font = "italic 24px serif"; ctx.fillText(name, 225, 180);
}
function downloadID() {
    const link = document.createElement('a'); link.download = 'RK_Card.jpg';
    link.href = document.getElementById('cardCanvas').toDataURL(); link.click();
}
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function showAdminTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); event.target.classList.add('active');
    document.getElementById('adm-add-sec').classList.add('hidden'); document.getElementById('adm-list-sec').classList.add('hidden');
    if(tab === 'add') document.getElementById('adm-add-sec').classList.remove('hidden');
    if(tab === 'list') { document.getElementById('adm-list-sec').classList.remove('hidden'); loadCustomers(); }
}
function searchCustomers() {
    const q = document.getElementById('search-input').value.toLowerCase();
    renderAdminList(customersList.filter(c => c.name.toLowerCase().includes(q) || c.customer_id.toLowerCase().includes(q)));
}
function exportCSV() { 
    if(customersList.length === 0) return alert("No data");
    let csv = "data:text/csv;charset=utf-8,Name,Mobile,ID,Stamps,Lifetime\n" + 
    customersList.map(r => `${r.name},${r.mobile},${r.customer_id},${r.stamps},${r.lifetime_stamps}`).join("\n");
    const link = document.createElement("a"); link.href = encodeURI(csv); link.download = "data.csv"; link.click();
}
function importCSV() { document.getElementById('csv-input').files[0] && alert("Import Logic Ready"); }
