// --- CONFIGURATION ---
const API_URL = '/api';

// ⚠️ PASTE YOUR SUPABASE KEYS HERE
const SUPABASE_URL = 'https://iszzxbakpuwjxhgjwrgi.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzenp4YmFrcHV3anhoZ2p3cmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDE4MDcsImV4cCI6MjA3OTgxNzgwN30.NwWX_PUzLKsfw2UjT0SK7wCZyZnd9jtvggf6bAlD3V0'; 

let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Auth Listener
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && document.getElementById('admin-portal')) {
            showSection('admin-dashboard');
            loadCustomers();
        }
        if (event === 'PASSWORD_RECOVERY') showSection('admin-update-pass-sec');
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
// 🎨 NEW STYLISH ID CARD GENERATOR
// ==========================================
function generateIDCard(name, id, lifetimeStamps = 0) {
    document.getElementById('id-modal').classList.remove('hidden');
    const canvas = document.getElementById('cardCanvas');
    const ctx = canvas.getContext('2d');
    
    // 1. CLEAR
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 2. BACKGROUND: Matte Black with Texture
    const grd = ctx.createLinearGradient(0, 0, 450, 270);
    grd.addColorStop(0, "#1a1a1a");
    grd.addColorStop(1, "#000000");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 450, 270);

    // 3. GOLD BORDER
    ctx.strokeStyle = "#d4af37"; // Metallic Gold
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 430, 250);
    
    // Inner thin border
    ctx.strokeStyle = "rgba(212, 175, 55, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 16, 418, 238);

    // 4. WATERMARK (Dragon)
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.font = "150px serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "#ff4500"; 
    ctx.fillText("🐲", 420, 250);
    ctx.restore();

    // 5. EMV CHIP (Credit Card Style)
    // Chip Background
    ctx.fillStyle = "#e6c265";
    ctx.roundRect(35, 120, 50, 40, 5);
    ctx.fill();
    // Chip Details
    ctx.strokeStyle = "#aa8833";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(35, 140); ctx.lineTo(85, 140); // Horizontal Middle
    ctx.moveTo(60, 120); ctx.lineTo(60, 160); // Vertical Middle
    ctx.stroke();
    ctx.strokeRect(45, 130, 30, 20); // Inner Box

    // 6. HEADER
    ctx.textAlign = "right";
    ctx.fillStyle = "#d4af37"; 
    ctx.font = "bold 28px 'Cinzel', serif"; 
    ctx.shadowColor = "rgba(212, 175, 55, 0.5)";
    ctx.shadowBlur = 10;
    ctx.fillText("RK DRAGON", 420, 50);
    ctx.shadowBlur = 0;

    ctx.font = "10px sans-serif";
    ctx.letterSpacing = "2px";
    ctx.fillStyle = "#888";
    ctx.fillText("PREMIUM MEMBER", 420, 65);

    // 7. CUSTOMER DETAILS
    ctx.textAlign = "left";
    
    // Rank Badge Text
    const rank = calculateRank(lifetimeStamps);
    ctx.fillStyle = rank.color; 
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(rank.name, 35, 50);

    // ID Number (Big & Embossed look)
    ctx.fillStyle = "#fff";
    ctx.font = "bold 32px monospace";
    ctx.shadowColor = "black";
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(id, 100, 150);
    ctx.shadowOffsetX = 0; 
    ctx.shadowOffsetY = 0; // Reset

    // Label
    ctx.fillStyle = "#666";
    ctx.font = "10px sans-serif";
    ctx.fillText("MEMBER ID", 100, 125);

    // Name
    ctx.fillStyle = "#d4af37";
    ctx.font = "italic 20px serif";
    let dName = name.toUpperCase();
    if(dName.length > 25) dName = dName.substring(0, 22) + "..";
    ctx.fillText(dName, 35, 230);

    // 8. HOLOGRAPHIC SHINE (Diagonal lines)
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    const holoGrad = ctx.createLinearGradient(0, 0, 450, 270);
    holoGrad.addColorStop(0, "rgba(255,255,255,0)");
    holoGrad.addColorStop(0.4, "rgba(255,255,255,0)");
    holoGrad.addColorStop(0.5, "rgba(255,255,255,0.1)");
    holoGrad.addColorStop(0.6, "rgba(255,255,255,0)");
    holoGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = holoGrad;
    ctx.fillRect(0,0,450,270);
    ctx.restore();
}

function downloadID() {
    const link = document.createElement('a'); link.download = 'RK_Card.jpg';
    link.href = document.getElementById('cardCanvas').toDataURL(); link.click();
}

// ==========================================
// 📥 SMART CSV IMPORT LOGIC (FIXED)
// ==========================================
function importCSV() {
    const fileInput = document.getElementById('csv-input');
    const file = fileInput.files[0];
    
    if (!file) { fileInput.click(); return; }

    const reader = new FileReader();
    reader.onload = async function(e) {
        const text = e.target.result;
        // Handle Windows (\r\n) and Unix (\n) line endings
        const lines = text.split(/\r?\n/);
        
        if (lines.length < 2) return alert("CSV is empty or invalid format");

        // 1. Parse Headers to find column indexes
        const headers = lines[0].toLowerCase().split(",").map(h => h.trim());
        const idxName = headers.findIndex(h => h.includes('name'));
        const idxMobile = headers.findIndex(h => h.includes('mobile'));
        const idxID = headers.findIndex(h => h.includes('id'));
        const idxStamps = headers.findIndex(h => h.includes('stamps') && !h.includes('lifetime'));
        const idxLife = headers.findIndex(h => h.includes('lifetime'));

        if(idxName === -1 || idxID === -1) {
            return alert("CSV Error: Must have headers 'Name' and 'ID'");
        }

        let batch = [];
        let successCount = 0;
        const batchSize = 50; 

        alert("Importing... Please do not close.");

        // 2. Parse Rows
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Handle commas inside quotes (Basic regex split)
            // If simpler CSV, simple split works:
            const cols = line.split(","); 

            // Extract data using dynamic indexes
            const cName = cols[idxName]?.replace(/"/g, '').trim();
            const cMobile = idxMobile > -1 ? cols[idxMobile]?.trim() : "";
            const cID = cols[idxID]?.trim();
            const cStamps = idxStamps > -1 ? (parseInt(cols[idxStamps]) || 0) : 0;
            const cLife = idxLife > -1 ? (parseInt(cols[idxLife]) || 0) : 0;

            if (cName && cID) {
                batch.push({
                    name: cName,
                    mobile: cMobile,
                    customer_id: cID,
                    stamps: cStamps,
                    lifetime_stamps: cLife
                });
            }

            // Send Batch
            if (batch.length >= batchSize || i === lines.length - 1) {
                if (batch.length > 0) {
                    await sendBatch(batch);
                    successCount += batch.length;
                    batch = [];
                }
            }
        }
        
        alert(`Success! ${successCount} records imported.`);
        loadCustomers();
        fileInput.value = "";
    };
    reader.readAsText(file);
}

async function sendBatch(data) {
    try {
        await fetch(`${API_URL}/customer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'import', data: data })
        });
    } catch (err) { console.error("Batch error", err); }
}

// EXPORT CSV
function exportCSV() { 
    if(customersList.length === 0) return alert("No data");
    let csv = "Name,Mobile,ID,Stamps,Lifetime\n" + 
    customersList.map(r => `"${r.name}",${r.mobile},${r.customer_id},${r.stamps},${r.lifetime_stamps||0}`).join("\n");
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "dragon_customers.csv";
    link.click();
}

// ==========================================
// 🛡️ ADMIN & CUSTOMER LOGIC
// ==========================================

// ... (KEEP your existing Login/Register/Stamp Logic exactly as is below) ...
// Below is the condensed version of the existing logic for completeness

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
    const c = { "BRONZE":"#cd7f32", "SILVER":"#c0c0c0", "GOLD":"#ffd700", "CRYSTAL":"#00ffff", "MASTER":"#dc143c", "CHAMPION":"#ff4500", "TITAN":"#e6e6fa" }[rankName.split(' ')[0]] || "#fff";
    return `<svg viewBox="0 0 100 100" fill="none"><path d="M50 5 L90 20 V50 Q90 80 50 95 Q10 80 10 50 V20 Z" fill="${c}" fill-opacity="0.3" stroke="${c}" stroke-width="3"/><path d="M50 20 V80" stroke="${c}" stroke-width="1"/><circle cx="50" cy="50" r="12" fill="${c}"/></svg>`;
}

function renderCustomerStats(c) {
    document.getElementById('display-cust-name').innerText = c.name;
    const rankData = calculateRank(c.lifetime_stamps || 0);
    document.getElementById('rpg-rank').innerText = rankData.name;
    document.getElementById('rpg-rank').style.color = rankData.color;
    const badgeEl = document.getElementById('rank-badge-display');
    if(badgeEl) badgeEl.innerHTML = getRankSVG(rankData.name);
    if(document.getElementById('next-rank-name')) document.getElementById('next-rank-name').innerText = rankData.next;
    const barEl = document.getElementById('xp-bar');
    if(barEl) {
        barEl.style.width = Math.min(rankData.pct, 100) + "%";
        barEl.style.background = rankData.color;
    }
    let html = '<div class="stamp-container">';
    for(let i=0; i<6; i++) html += `<div class="orb ${i < c.stamps ? 'filled' : ''}"></div>`;
    html += '</div>';
    document.getElementById('cust-stamps-display').innerHTML = html;
    const msg = c.stamps >= 6 ? "🎉 REWARD UNLOCKED!" : `Collect ${6 - c.stamps} more.`;
    document.getElementById('cust-status-msg').innerText = msg;
}

// ADMIN AUTH
async function adminSignUp() {
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-pass').value;
    const username = document.getElementById('reg-username').value;
    if (!email || !password || !username) return alert("Fill all fields");
    if (password.length < 6) return alert("Password too short");
    const { data: existing } = await supabaseClient.from('admin_profiles').select('username').eq('username', username).single();
    if(existing) return alert("Username taken");
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) return alert(error.message);
    await supabaseClient.from('admin_profiles').insert([{ username, email }]);
    alert("Success! Login now.");
    showSection('admin-login-sec');
}
async function adminSignIn() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-pass').value;
    if (!username || !password) return alert("Enter credentials");
    const { data } = await supabaseClient.from('admin_profiles').select('email').eq('username', username).single();
    if (!data) return alert("Username not found");
    const { error } = await supabaseClient.auth.signInWithPassword({ email: data.email, password });
    if (error) alert("Incorrect Password");
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
    if(newPass.length < 6) return alert("Too short");
    const { error } = await supabaseClient.auth.updateUser({ password: newPass });
    if (error) alert(error.message); else { alert("Updated! Login now."); adminSignOut(); }
}

// ADMIN LIST
let customersList = [];
async function loadCustomers() {
    const el = document.getElementById('customer-list');
    if(!el) return;
    el.innerHTML = '<div style="color:#888;">Summoning...</div>';
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
            btns = `<div class="stamp-control"><button onclick="updateStamp('${c.customer_id}', 'reset')" style="background:linear-gradient(45deg, gold, orange); color:black; font-weight:bold; flex:3;">🎁 REDEEM</button><button onclick="updateStamp('${c.customer_id}', 'remove')" class="secondary" style="flex:1;">Undo</button></div>`;
        } else {
            btns = `<div class="stamp-control"><button onclick="updateStamp('${c.customer_id}', 'add')" style="flex:3;">+ Stamp</button><button onclick="updateStamp('${c.customer_id}', 'remove')" class="secondary" style="flex:1;">-</button></div>`;
        }
        const div = document.createElement('div');
        div.className = 'cust-item';
        div.innerHTML = `
            <div style="position:absolute; top:10px; right:10px; width:30px;">${getRankSVG(rank.name)}</div>
            <div class="cust-header"><div><div class="cust-name">${c.name}</div><div class="cust-id">${c.customer_id}</div></div></div>
            <div style="font-size:0.8em; color:#888; margin-bottom:10px;">Mobile: ${c.mobile} | Lvl: <span style="color:${rank.color}">${rank.name}</span></div>
            <div class="stamp-container" style="justify-content:flex-start; margin: 10px 0;">${getOrbHTML(c.stamps)}</div>
            ${btns}
            <div class="action-row" style="margin-top:10px; display:flex; gap:10px;">
                <button class="secondary small-btn" onclick="generateIDCard('${c.name}', '${c.customer_id}', ${c.lifetime_stamps||0})">ID Card</button>
                <button class="secondary small-btn danger" onclick="deleteCustomer('${c.customer_id}')">Delete</button>
            </div>
        `;
        el.appendChild(div);
    });
}
function getOrbHTML(count) {
    let html = ''; for(let i=0; i<6; i++) html += `<div class="orb ${i < count ? 'filled' : ''}"></div>`; return html;
}
async function createCustomer() {
    const name = document.getElementById('new-name').value;
    const mobile = document.getElementById('new-mobile').value;
    const res = await fetch(`${API_URL}/customer`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'add', name, mobile}) });
    const data = await res.json();
    if(res.ok) { generateIDCard(name, data.customerId, 0); loadCustomers(); } else alert(data.error);
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
    if(!confirm("Delete?")) return;
    await fetch(`${API_URL}/customer`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'delete', id}) });
    loadCustomers();
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
