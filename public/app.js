// --- CONFIGURATION ---
const API_URL = '/api';

// ==========================================
// ⚠️ PASTE YOUR SUPABASE KEYS HERE ⚠️
// ==========================================
const SUPABASE_URL = 'https://iszzxbakpuwjxhgjwrgi.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzenp4YmFrcHV3anhoZ2p3cmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDE4MDcsImV4cCI6MjA3OTgxNzgwN30.NwWX_PUzLKsfw2UjT0SK7wCZyZnd9jtvggf6bAlD3V0'; 

// --- FIX: Correctly Initialize Supabase Client ---
// The library loads as a global variable named 'supabase'
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// --- NAVIGATION ---
function goHome() {
    hideAll();
    document.getElementById('landing-page').classList.remove('hidden');
}
function goToCustomerLogin() {
    hideAll();
    document.getElementById('customer-portal').classList.remove('hidden');
    document.getElementById('cust-login-sec').classList.remove('hidden');
    document.getElementById('cust-dashboard').classList.add('hidden');
}
function goToAdminLogin() {
    hideAll();
    document.getElementById('admin-portal').classList.remove('hidden');
    checkAdminSession();
}
function hideAll() {
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('customer-portal').classList.add('hidden');
    document.getElementById('admin-portal').classList.add('hidden');
}

// ==========================================
// ⚔️ CUSTOMER PORTAL
// ==========================================

async function customerLogin() {
    const id = document.getElementById('cust-login-id').value.trim();
    if(!id) return alert("Enter your Rune ID");

    try {
        const res = await fetch(`${API_URL}/customer?action=login&id=${id}`);
        const data = await res.json();

        if(res.ok && data.customer_id) {
            document.getElementById('cust-login-sec').classList.add('hidden');
            document.getElementById('cust-dashboard').classList.remove('hidden');
            renderCustomerStats(data);
        } else {
            alert("ID not found in the archives.");
        }
    } catch (e) { alert("Connection failed."); }
}

function calculateRank(total) {
    if (total > 30) return { name: "TITAN 🔱", color: "#e6e6fa", fill: "linear-gradient(90deg, #e6e6fa, #fff)", pct: 100 };
    if (total > 25) return { name: "CHAMPION 🏆", color: "#ff4500", fill: "linear-gradient(90deg, #ff4500, #ff8c00)", pct: (total/30)*100 };
    if (total > 20) return { name: "MASTER ⚔️", color: "#dc143c", fill: "linear-gradient(90deg, #dc143c, #ff0000)", pct: (total/25)*100 };
    if (total > 15) return { name: "CRYSTAL 💎", color: "#00ffff", fill: "linear-gradient(90deg, #00ced1, #00ffff)", pct: (total/20)*100 };
    if (total > 10) return { name: "GOLD 🥇", color: "#ffd700", fill: "linear-gradient(90deg, #daa520, #ffd700)", pct: (total/15)*100 };
    if (total > 5)  return { name: "SILVER 🥈", color: "#c0c0c0", fill: "linear-gradient(90deg, #808080, #c0c0c0)", pct: (total/10)*100 };
    return { name: "BRONZE 🥉", color: "#cd7f32", fill: "linear-gradient(90deg, #8b4513, #cd7f32)", pct: (total/5)*100 };
}

function renderCustomerStats(c) {
    document.getElementById('display-cust-name').innerText = c.name;
    document.getElementById('lifetime-count').innerText = c.lifetime_stamps || 0;
    
    const rankData = calculateRank(c.lifetime_stamps || 0);

    const rankEl = document.getElementById('rpg-rank');
    rankEl.innerText = rankData.name;
    rankEl.style.color = rankData.color;
    rankEl.style.textShadow = `0 0 10px ${rankData.color}`;

    const barEl = document.getElementById('xp-bar');
    barEl.style.width = Math.min(rankData.pct, 100) + "%";
    barEl.style.background = rankData.fill;
    barEl.style.boxShadow = `0 0 10px ${rankData.color}`;

    let html = '<div class="stamp-container">';
    for(let i=0; i<6; i++) {
        html += `<div class="orb ${i < c.stamps ? 'filled' : ''}"></div>`;
    }
    html += '</div>';
    document.getElementById('cust-stamps-display').innerHTML = html;
    
    const msg = c.stamps >= 6 
        ? "🎉 FREE SNACK UNLOCKED! Claim it now!" 
        : `Collect ${6 - c.stamps} more orbs for a reward.`;
    
    document.getElementById('cust-status-msg').innerText = msg;
    document.getElementById('cust-status-msg').style.color = c.stamps >= 6 ? "#0f0" : "#aaa";
}

// ==========================================
// 🛡️ ADMIN PORTAL (Auth Logic Fixed)
// ==========================================

async function checkAdminSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        document.getElementById('admin-auth-sec').classList.add('hidden');
        document.getElementById('admin-dashboard').classList.remove('hidden');
        loadCustomers();
    } else {
        document.getElementById('admin-auth-sec').classList.remove('hidden');
        document.getElementById('admin-dashboard').classList.add('hidden');
    }
}

async function adminSignUp() {
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-pass').value;

    if (!email || !password) return alert("Please enter Email and Password");
    if (password.length < 6) return alert("Password must be at least 6 characters");

    // Attempt Registration
    const { data, error } = await supabaseClient.auth.signUp({ 
        email: email, 
        password: password 
    });

    if (error) {
        alert("Registration Failed: " + error.message);
    } else {
        alert("Success! If you disabled 'Confirm Email' in Supabase, login now.");
        // Try auto-login
        adminSignIn();
    }
}

async function adminSignIn() {
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-pass').value;

    if (!email || !password) return alert("Enter email and password");

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    
    if (error) {
        alert("Login Failed: " + error.message);
    } else {
        checkAdminSession();
    }
}

async function adminSignOut() {
    await supabaseClient.auth.signOut();
    checkAdminSession();
}

async function resetAdminPassword() {
    const email = document.getElementById('admin-email').value;
    if(!email) return alert("Enter email first");
    const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email);
    if(error) alert(error.message);
    else alert("Password reset link sent to your email.");
}

// --- ADMIN DASHBOARD ---
function showAdminTab(tab) {
    document.getElementById('adm-add-sec').classList.add('hidden');
    document.getElementById('adm-list-sec').classList.add('hidden');
    if(tab === 'add') document.getElementById('adm-add-sec').classList.remove('hidden');
    if(tab === 'list') {
        document.getElementById('adm-list-sec').classList.remove('hidden');
        loadCustomers();
    }
}

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
        alert("Customer Created! ID: " + data.customerId);
    } else alert(data.error);
}

let customersList = [];
async function loadCustomers() {
    const el = document.getElementById('customer-list');
    el.innerHTML = "Fetching scrolls...";
    const res = await fetch(`${API_URL}/customer?action=list`);
    customersList = await res.json();
    renderAdminList(customersList);
}

function searchCustomers() {
    const q = document.getElementById('search-input').value.toLowerCase();
    const filtered = customersList.filter(c => 
        c.name.toLowerCase().includes(q) || c.mobile.includes(q) || c.customer_id.toLowerCase().includes(q)
    );
    renderAdminList(filtered);
}

function renderAdminList(data) {
    const el = document.getElementById('customer-list');
    el.innerHTML = "";
    data.forEach(c => {
        const rank = calculateRank(c.lifetime_stamps || 0);
        
        let btns = '';
        if(c.stamps >= 6) {
            btns = `<button onclick="updateStamp('${c.customer_id}', 'reset')" style="background:gold; color:black;">🎁 Redeem</button>`;
        } else {
            btns = `
                <div style="display:flex; gap:5px;">
                    <button onclick="updateStamp('${c.customer_id}', 'add')">Stamp +1</button>
                    <button onclick="updateStamp('${c.customer_id}', 'remove')" class="secondary" style="width:auto;">-</button>
                </div>`;
        }
        
        const div = document.createElement('div');
        div.className = 'cust-item';
        div.innerHTML = `
            <div class="cust-header">
                <span>${c.name} <span style="font-size:0.8em; color:gold;">(${c.customer_id})</span></span> 
                <span style="color:${rank.color}; font-size:0.8em; border:1px solid ${rank.color}; padding:2px 5px; border-radius:4px;">${rank.name.split(" ")[0]}</span>
            </div>
            <div style="font-size:0.9em; color:#aaa;">Mobile: ${c.mobile} | Life: ${c.lifetime_stamps||0}</div>
            
            <div class="stamp-container" style="justify-content:flex-start;">
                ${getOrbHTML(c.stamps)}
            </div>
            ${btns}
            <div style="margin-top:5px; border-top:1px solid #333; padding-top:5px;">
                <button class="secondary small-btn" onclick="generateIDCard('${c.name}', '${c.customer_id}')">ID Card</button>
                <button class="secondary small-btn" style="border-color:red; color:red;" onclick="deleteCustomer('${c.customer_id}')">Delete</button>
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

async function updateStamp(id, type) {
    const c = customersList.find(x => x.customer_id === id);
    if(type === 'add') { c.stamps++; if(!c.lifetime_stamps) c.lifetime_stamps=0; c.lifetime_stamps++; }
    if(type === 'remove' && c.stamps > 0) { c.stamps--; c.lifetime_stamps--; }
    if(type === 'reset') c.stamps = 0;
    renderAdminList(customersList);

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

function generateIDCard(name, id) {
    document.getElementById('id-modal').classList.remove('hidden');
    const ctx = document.getElementById('cardCanvas').getContext('2d');
    
    const grd = ctx.createLinearGradient(0,0,450,270);
    grd.addColorStop(0,"#500"); grd.addColorStop(1,"#000");
    ctx.fillStyle = grd; ctx.fillRect(0,0,450,270);
    
    ctx.strokeStyle = "gold"; ctx.lineWidth = 10; ctx.strokeRect(0,0,450,270);
    
    ctx.textAlign = "center";
    ctx.fillStyle = "gold"; ctx.font = "bold 30px serif"; ctx.fillText("RK DRAGON", 225, 50);
    ctx.fillStyle = "white"; ctx.font = "40px sans-serif"; ctx.fillText(id, 225, 130);
    ctx.font = "20px sans-serif"; ctx.fillText(name, 225, 170);
}

function downloadID() {
    const link = document.createElement('a');
    link.download = 'RK_Card.jpg';
    link.href = document.getElementById('cardCanvas').toDataURL();
    link.click();
}

function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
// Helper for Import/Export
function exportCSV() { 
    if(customersList.length === 0) return alert("No data");
    let csv = "data:text/csv;charset=utf-8,Name,Mobile,ID,Stamps,Lifetime\n" + 
    customersList.map(r => `${r.name},${r.mobile},${r.customer_id},${r.stamps},${r.lifetime_stamps}`).join("\n");
    const link = document.createElement("a"); link.href = encodeURI(csv); link.download = "data.csv"; link.click();
}
function importCSV() { document.getElementById('csv-input').files[0] && alert("Import Logic Ready"); }
