// --- CONFIGURATION ---
const API_URL = '/api';
// ⚠️ PASTE YOUR SUPABASE KEYS HERE
const SUPABASE_URL = 'https://iszzxbakpuwjxhgjwrgi.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzenp4YmFrcHV3anhoZ2p3cmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDE4MDcsImV4cCI6MjA3OTgxNzgwN30.NwWX_PUzLKsfw2UjT0SK7wCZyZnd9jtvggf6bAlD3V0'; 

let supabaseClient = null;
let currentUserEmail = null;
let customersList = []; // Global Store

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

// ==========================================
// 🛡️ RANK LOGIC
// ==========================================
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
// ⚡ STAMP LOGIC (FIXED: INSTANT UPDATE)
// ==========================================
async function updateStamp(btn, id, type) {
    // 1. Find Customer in Memory
    const cust = customersList.find(c => c.customer_id === id);
    if(!cust) return;

    // 2. Update Memory Instantly
    if(type === 'add') { 
        cust.stamps = (cust.stamps || 0) + 1; 
        cust.lifetime_stamps = (cust.lifetime_stamps || 0) + 1;
    }
    else if (type === 'remove') { 
        cust.stamps = Math.max(0, (cust.stamps || 0) - 1); 
        cust.lifetime_stamps = Math.max(0, (cust.lifetime_stamps || 0) - 1);
    }
    else if (type === 'reset') { 
        cust.stamps = 0; 
        cust.redeems = (cust.redeems || 0) + 1; 
    }
    
    // 3. Re-draw the list IMMEDIATELY (No Loading Screen)
    renderAdminList(customersList);

    // 4. Send to Server in Background (Silent Sync)
    try {
        await fetch(`${API_URL}/customer`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: 'stamp', id, type})
        });
    } catch (e) {
        console.error("Sync Error:", e);
        // Optional: Revert UI if internet fails, but keeping it simple for smooth UX
    }
}

// ==========================================
// 📋 ADMIN LIST
// ==========================================
async function loadCustomers() {
    const el = document.getElementById('customer-list');
    if(!el) return;
    
    // Only show loading text if the list is completely empty
    if(customersList.length === 0) el.innerHTML = '<div style="color:#888; margin-top:20px;">Summoning data...</div>';
    
    try {
        const res = await fetch(`${API_URL}/customer?action=list`);
        if (!res.ok) throw new Error("API Connection Failed");
        
        customersList = await res.json();
        renderAdminList(customersList);
    } catch(e) { 
        console.error(e);
        el.innerHTML = `<div style="color:red; margin-top:20px;">Connection Failed. <button onclick="loadCustomers()">Retry</button></div>`;
    }
}

function renderAdminList(data) {
    const el = document.getElementById('customer-list');
    if(!el) return;
    el.innerHTML = "";
    
    if (data.length === 0) {
        el.innerHTML = '<div style="color:#666; margin-top:20px;">No customers found.</div>';
        return;
    }

    data.forEach(c => {
        // Ensure numbers are Integers
        const safeRedeems = parseInt(c.redeems) || 0;
        const safeStamps = parseInt(c.stamps) || 0;
        const rank = getRankInfo(safeRedeems);
        
        let btns = '';

        if(safeStamps >= 6) {
            btns = `
            <div class="stamp-control">
                <button onclick="updateStamp(this, '${c.customer_id}', 'reset')" class="primary-btn" style="flex:2;">🎁 REDEEM</button>
                <button onclick="updateStamp(this, '${c.customer_id}', 'remove')" class="secondary-btn" style="flex:1;">Undo</button>
            </div>`;
        } else {
            btns = `
            <div class="stamp-control">
                <button onclick="updateStamp(this, '${c.customer_id}', 'add')" class="primary-btn" style="flex:2;">+ Stamp</button>
                <button onclick="updateStamp(this, '${c.customer_id}', 'remove')" class="secondary-btn" style="flex:1;">-</button>
            </div>`;
        }

        const div = document.createElement('div');
        div.className = 'cust-item';
        div.innerHTML = `
            <img src="assets/${rank.img}" class="rank-mini-icon" onerror="this.style.display='none'">
            <div class="cust-header">
                <div>
                    <div style="font-weight:bold; font-size:1.1em; color:white;">${c.name}</div>
                    <div style="color:${rank.color}; font-size:0.9em;">${c.customer_id}</div>
                </div>
            </div>
            <div style="font-size:0.8em; color:#888; margin-bottom:10px;">
                Mobile: ${c.mobile} | Lvl: <span style="color:${rank.color}">${rank.name}</span>
            </div>
            
            <div class="stamp-container">
                ${getDragonBalls(safeStamps)}
            </div>
            
            ${btns}

            <div class="action-row" style="margin-top:10px; display:flex; gap:10px;">
                <button class="secondary-btn" style="font-size:0.8em; padding:8px;" onclick="generateIDCard('${c.name}', '${c.customer_id}', ${safeRedeems})">View ID</button>
                <button class="secondary-btn" style="font-size:0.8em; padding:8px; border-color:red; color:red;" onclick="deleteCustomer('${c.customer_id}')">Delete</button>
            </div>
        `;
        el.appendChild(div);
    });
}

function getDragonBalls(count) {
    let html = '';
    for(let i=0; i<6; i++) {
        // Strict number comparison
        const filled = i < count ? 'filled' : '';
        html += `<div class="dragon-ball ${filled}"></div>`;
    }
    return html;
}

// ==========================================
// 🔍 SEARCH LOGIC
// ==========================================
function searchCustomers() {
    const q = document.getElementById('search-input').value.toLowerCase();
    
    const filtered = customersList.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) || 
        (c.customer_id && c.customer_id.toLowerCase().includes(q)) ||
        (c.mobile && String(c.mobile).includes(q))
    );
    
    renderAdminList(filtered);
}

// ==========================================
// ⚡ CORE ACTIONS
// ==========================================
async function createCustomer() {
    const name = document.getElementById('new-name').value;
    const mobile = document.getElementById('new-mobile').value;
    
    if(!name || !mobile) return alert("Fill Name and Mobile");

    const btn = document.querySelector('#adm-add-sec button');
    btn.innerText = "Creating..."; btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/customer`, { 
            method: 'POST', headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({action: 'add', name, mobile}) 
        });
        const data = await res.json();
        
        if(res.ok) { 
            alert("Added!");
            document.getElementById('new-name').value = "";
            document.getElementById('new-mobile').value = "";
            generateIDCard(name, data.customerId, 0); 
            
            // Fetch list fresh
            const listRes = await fetch(`${API_URL}/customer?action=list`);
            customersList = await listRes.json();
            renderAdminList(customersList);
        } else { alert("Error: " + data.error); }
    } catch (e) { alert("Network Error"); } 
    finally { btn.innerText = "Generate ID"; btn.disabled = false; }
}

async function deleteCustomer(id) {
    if(!confirm("Permanently Delete?")) return;
    
    const password = prompt("🔒 SECURITY CHECK\nEnter Admin Password:");
    if(!password) return;

    if (!currentUserEmail) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if(session) currentUserEmail = session.user.email;
    }

    const { error } = await supabaseClient.auth.signInWithPassword({ email: currentUserEmail, password: password });
    if (error) return alert("Wrong Password!");

    // Optimistic Delete (Remove from screen instantly)
    customersList = customersList.filter(c => c.customer_id !== id);
    renderAdminList(customersList);

    await fetch(`${API_URL}/customer`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'delete', id}) });
}

// ==========================================
// 🎨 ID CARD
// ==========================================
async function generateIDCard(name, id, redeems = 0) {
    document.getElementById('id-modal').classList.remove('hidden');
    const canvas = document.getElementById('cardCanvas');
    const ctx = canvas.getContext('2d');
    const rank = getRankInfo(redeems);

    const loadImage = (src) => new Promise((resolve) => {
        const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = src;
    });

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

    // Shield
    if (shieldImg) ctx.drawImage(shieldImg, 360, 20, 60, 70);

    // ID Box
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)"; ctx.roundRect(25, 110, 280, 60, 10); ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = "bold 36px monospace"; ctx.fillText(id, 45, 152);
    ctx.font = "10px sans-serif"; ctx.fillStyle = "#666"; ctx.fillText("RUNE ID", 45, 125);

    // Name & Rank
    ctx.fillStyle = rank.color; ctx.font = "italic 22px serif";
    let dName = name.toUpperCase(); if(dName.length > 20) dName = dName.substring(0, 18) + "..";
    ctx.fillText(dName, 25, 230);
    ctx.fillStyle = "#fff"; ctx.font = "12px sans-serif"; ctx.fillText(rank.name + " TIER", 25, 250);
    ctx.fillStyle = rank.color; ctx.fillRect(350, 240, 80, 8);
}

function downloadID() {
    const link = document.createElement('a'); link.download = 'RK_Card.jpg';
    link.href = document.getElementById('cardCanvas').toDataURL(); link.click();
}

// ==========================================
// 🛡️ ADMIN AUTH
// ==========================================
async function adminSignIn() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-pass').value;
    if (!username || !password) return alert("Enter credentials");

    const { data } = await supabaseClient.from('admin_profiles').select('email').eq('username', username).single();
    if (!data) return alert("Username not found");

    const { error } = await supabaseClient.auth.signInWithPassword({ email: data.email, password });
    if (error) alert("Incorrect Password");
}

async function adminSignUp() {
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-pass').value;
    const username = document.getElementById('reg-username').value;
    if (!email || !password || !username) return alert("Fill all fields");
    
    const { data: existing } = await supabaseClient.from('admin_profiles').select('username').eq('username', username).single();
    if(existing) return alert("Username taken");

    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) return alert(error.message);

    await supabaseClient.from('admin_profiles').insert([{ username, email }]);
    alert("Registered! Login now.");
    showSection('admin-login-sec');
}

async function adminSignOut() { await supabaseClient.auth.signOut(); window.location.reload(); }
async function resetAdminPassword() {
    const email = document.getElementById('forgot-email').value;
    if(!email) return alert("Enter email");
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.href });
    if(error) alert(error.message); else alert("Reset link sent!");
}
async function updateAdminPassword() {
    const newPass = document.getElementById('new-password').value;
    const { error } = await supabaseClient.auth.updateUser({ password: newPass });
    if (error) alert(error.message); else { alert("Updated! Login."); adminSignOut(); }
}

function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function showAdminTab(tab) {
    document.getElementById('adm-add-sec').classList.add('hidden'); document.getElementById('adm-list-sec').classList.add('hidden');
    if(tab === 'add') document.getElementById('adm-add-sec').classList.remove('hidden');
    if(tab === 'list') { document.getElementById('adm-list-sec').classList.remove('hidden'); loadCustomers(); }
}

// CSV
function exportCSV() { 
    if(customersList.length === 0) return alert("No data");
    const headers = ["Name", "Mobile", "ID", "Stamps", "Redeems", "Lifetime"];
    const rows = customersList.map(c => [`"${c.name}"`, `"${c.mobile}"`, c.customer_id, c.stamps, c.redeems||0, c.lifetime_stamps||0]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `Dragon_Backup.csv`; link.click();
}
function importCSV() { 
    const fileInput = document.getElementById('csv-input');
    const file = fileInput.files[0];
    if (!file) { fileInput.click(); return; }
    const reader = new FileReader();
    reader.onload = async function(e) {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
        if (lines.length < 2) return alert("Invalid CSV");
        const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g, ''));
        const idxName = headers.indexOf('name');
        const idxID = headers.indexOf('id');
        if(idxName === -1 || idxID === -1) return alert("CSV needs Name & ID columns");
        let batch = [];
        let count = 0;
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            if (cols.length < 2) continue;
            const clean = (val) => val ? val.replace(/^"|"$/g, '').trim() : "";
            const cName = clean(cols[idxName]);
            const cID = clean(cols[idxID]);
            if (cName && cID) {
                batch.push({ name: cName, mobile: clean(cols[headers.indexOf('mobile')]||""), customer_id: cID, stamps: parseInt(clean(cols[headers.indexOf('stamps')]))||0, redeems: parseInt(clean(cols[headers.indexOf('redeems')]))||0, lifetime_stamps: parseInt(clean(cols[headers.indexOf('lifetime')]))||0 });
            }
            if (batch.length >= 50 || i === lines.length - 1) {
                if (batch.length > 0) {
                    await fetch(`${API_URL}/customer`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ action: 'import', data: batch }) });
                    count += batch.length;
                    batch = [];
                }
            }
        }
        alert(`Success! Imported ${count}.`); loadCustomers(); fileInput.value = "";
    };
    reader.readAsText(file);
}

// CUSTOMER PAGE
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
    const msgEl = document.getElementById('cust-status-msg');
    if(c.stamps >= 6) { msgEl.innerHTML = `<span style="color:#0f0; font-size:1.2em;">🎉 FREE SNACK UNLOCKED!</span><br>Show this to the admin.`; } 
    else { msgEl.innerHTML = `Collect <span style="color:gold;">${6 - c.stamps}</span> more Dragon Balls.`; }
    const viewBtn = document.getElementById('view-my-id-btn');
    const newBtn = viewBtn.cloneNode(true);
    viewBtn.parentNode.replaceChild(newBtn, viewBtn);
    newBtn.onclick = () => generateIDCard(c.name, c.customer_id, c.redeems);
}
