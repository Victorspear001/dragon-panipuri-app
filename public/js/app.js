// --- CONFIGURATION ---
const API_URL = '/api';
// ⚠️ PASTE KEYS HERE
const SUPABASE_URL = 'https://iszzxbakpuwjxhgjwrgi.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzenp4YmFrcHV3anhoZ2p3cmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDE4MDcsImV4cCI6MjA3OTgxNzgwN30.NwWX_PUzLKsfw2UjT0SK7wCZyZnd9jtvggf6bAlD3V0'; 

let supabaseClient = null;
let currentUserEmail = null;
let customersList = []; 

// --- INITIALIZATION ---
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // AUTH LISTENER: Handles ALL Redirects & Loading
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            currentUserEmail = session.user.email;
            
            // If on Admin Page, Load Data
            if (document.getElementById('admin-portal')) {
                showSection('admin-dashboard');
                loadCustomers('list');
            }
            // If on History Page, Load History
            if (document.getElementById('history-portal')) {
                loadCustomers('history');
            }
        } else if (event === 'SIGNED_OUT') {
            // Force Login View
            if (document.getElementById('admin-portal')) {
                showSection('admin-login-sec');
            }
        }
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
// 📋 DATA LOADING (Fixed)
// ==========================================
async function loadCustomers(mode = 'list') {
    const listEl = document.getElementById('customer-list');
    const historyEl = document.getElementById('history-table-body');
    
    // Show Loading
    if(mode === 'list' && listEl) listEl.innerHTML = '<div style="color:#888;">Loading Scrolls...</div>';
    if(mode === 'history' && historyEl) historyEl.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading...</td></tr>';

    try {
        const res = await fetch(`${API_URL}/customer?action=${mode}`);
        if(!res.ok) throw new Error("Server Error");
        
        customersList = await res.json();
        
        if(mode === 'list') renderAdminList(customersList);
        if(mode === 'history') renderHistoryTable(customersList);
        
    } catch(e) { 
        console.error(e);
        if(listEl) listEl.innerHTML = `<div style="color:red;">Error loading list. <button onclick="loadCustomers('${mode}')">Retry</button></div>`;
    }
}

// 1. ADMIN LIST RENDER
function renderAdminList(data) {
    const el = document.getElementById('customer-list');
    if(!el) return;
    el.innerHTML = "";
    
    if(!data || data.length === 0) {
        el.innerHTML = '<div style="color:#666;">No customers found.</div>';
        return;
    }

    data.forEach(c => {
        const rank = getRankInfo(c.redeems);
        const stamps = c.stamps || 0;
        
        let btns = (stamps >= 6) ? 
            `<button onclick="updateStamp('${c.customer_id}', 'reset')" class="primary-btn" style="flex:2;">🎁 REDEEM</button>` :
            `<button onclick="updateStamp('${c.customer_id}', 'add')" class="primary-btn" style="flex:2;">+ Stamp</button>`;

        el.innerHTML += `
            <div class="cust-item">
                <img src="assets/${rank.img}" class="rank-mini-icon" onerror="this.style.display='none'">
                <div class="cust-header">
                    <div>
                        <div style="font-weight:bold; font-size:1.1em; color:white;">
                            ${c.name} <span onclick="editName('${c.customer_id}', '${c.name}')" style="cursor:pointer; font-size:0.8em;">✏️</span>
                        </div>
                        <div style="color:${rank.color}; font-size:0.9em;">ID: ${c.customer_id} | Mob: ${c.mobile}</div>
                    </div>
                </div>
                <div class="stamp-container">${getDragonBalls(stamps)}</div>
                <div style="display:flex; gap:5px;">
                    ${btns}
                    <button onclick="updateStamp('${c.customer_id}', 'remove')" class="secondary-btn" style="flex:1;">-</button>
                </div>
                <div style="margin-top:10px; border-top:1px solid #333; padding-top:10px; display:flex; gap:10px;">
                    <button onclick="generateIDCard('${c.name}', '${c.customer_id}', ${c.redeems||0})" class="secondary-btn" style="font-size:0.8em; padding:8px;">View / Share ID</button>
                    <button onclick="softDeleteCustomer('${c.customer_id}')" class="secondary-btn" style="font-size:0.8em; padding:8px; border-color:red; color:red;">Delete</button>
                </div>
            </div>`;
    });
}

// 2. HISTORY TABLE RENDER
function renderHistoryTable(data) {
    const el = document.getElementById('history-table-body');
    if(!el) return;
    el.innerHTML = "";

    data.forEach(c => {
        const isDeleted = c.is_deleted ? '<span style="color:red;">DELETED</span>' : '<span style="color:#0f0;">ACTIVE</span>';
        
        el.innerHTML += `
            <tr style="border-bottom:1px solid #333;">
                <td style="padding:10px;">${c.name}</td>
                <td>${c.mobile}</td>
                <td>${c.customer_id}</td>
                <td>${isDeleted}</td>
                <td>
                    <button onclick="generateIDCard('${c.name}', '${c.customer_id}', ${c.redeems||0})" class="secondary-btn" style="padding:5px 10px; font-size:0.8em;">ID</button>
                </td>
                <td>
                    ${c.is_deleted ? `<button onclick="permanentDelete('${c.customer_id}')" class="danger-btn" style="padding:5px; font-size:0.8em;">🗑️</button>` : '-'}
                </td>
            </tr>
        `;
    });
}

function getDragonBalls(count) {
    let html = '';
    for(let i=0; i<6; i++) {
        const filled = i < count ? 'filled' : '';
        html += `<div class="dragon-ball ${filled}"></div>`;
    }
    return html;
}

// ==========================================
// 🔍 SEARCH (Mobile + Name + ID)
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

function searchHistory() {
    const q = document.getElementById('history-search').value.toLowerCase();
    const filtered = customersList.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) || 
        (c.mobile && String(c.mobile).includes(q)) ||
        (c.customer_id && c.customer_id.toLowerCase().includes(q))
    );
    renderHistoryTable(filtered);
}

// ==========================================
// ⚡ ACTIONS (Create / Edit / Delete)
// ==========================================
async function createCustomer() {
    const name = document.getElementById('new-name').value;
    const mobile = document.getElementById('new-mobile').value;
    
    if(!name || !mobile) return alert("Fill all fields");

    const res = await fetch(`${API_URL}/customer`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'add', name, mobile}) });
    const data = await res.json();
    
    if(res.ok) { 
        document.getElementById('new-name').value = "";
        document.getElementById('new-mobile').value = "";
        generateIDCard(name, data.customerId, 0); 
        loadCustomers('list'); 
    } else alert(data.error);
}

async function updateStamp(id, type) {
    // Optimistic
    const cust = customersList.find(c => c.customer_id === id);
    if(cust) {
        if(type === 'add') cust.stamps = (cust.stamps||0)+1;
        else if(type === 'remove') cust.stamps = Math.max(0, (cust.stamps||0)-1);
        else if(type === 'reset') { cust.stamps = 0; cust.redeems = (cust.redeems||0)+1; }
        renderAdminList(customersList);
    }
    
    await fetch(`${API_URL}/customer`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'stamp', id, type})
    });
    // Silent reload
    loadCustomers('list');
}

async function editName(id, oldName) {
    const newName = prompt("Enter new name:", oldName);
    if(newName && newName !== oldName) {
        const c = customersList.find(x => x.customer_id === id);
        if(c) { c.name = newName; renderAdminList(customersList); }
        
        await fetch(`${API_URL}/customer`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: 'edit_name', id, name: newName})
        });
    }
}

async function softDeleteCustomer(id) {
    if(!confirm("Remove from Active List? (Saved in History)")) return;
    customersList = customersList.filter(c => c.customer_id !== id);
    renderAdminList(customersList);
    
    await fetch(`${API_URL}/customer`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'soft_delete', id}) });
}

async function permanentDelete(id) {
    if(!confirm("⚠️ Delete FOREVER? This cannot be undone.")) return;
    const password = prompt("Admin Password:");
    if(!password) return;

    if (!currentUserEmail) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if(session) currentUserEmail = session.user.email;
    }

    const { error } = await supabaseClient.auth.signInWithPassword({ email: currentUserEmail, password });
    if (error) return alert("Wrong Password");

    await fetch(`${API_URL}/customer`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'permanent_delete', id}) });
    loadCustomers('history');
}

// ==========================================
// 🎨 ID CARD + SHARE
// ==========================================
async function generateIDCard(name, id, redeems = 0) {
    document.getElementById('id-modal').classList.remove('hidden');
    const canvas = document.getElementById('cardCanvas');
    const ctx = canvas.getContext('2d');
    const rank = getRankInfo(redeems);

    // High Res
    const scale = 2; canvas.width = 450 * scale; canvas.height = 270 * scale; ctx.scale(scale, scale);

    const loadImage = (src) => new Promise(r => { let i=new Image(); i.onload=()=>r(i); i.onerror=()=>r(null); i.src=src; });
    
    const qrData = await QRCode.toDataURL(id, {width:100, margin:1, color:{dark:"#000", light:"#fff"}});
    const qrImg = await loadImage(qrData);
    const logoImg = await loadImage('assets/logo.png');
    const shieldImg = await loadImage(`assets/${rank.img}`);

    // Draw
    const grd = ctx.createLinearGradient(0,0,450,270);
    grd.addColorStop(0,"#0a0a0a"); grd.addColorStop(1,"#1a1a1a");
    ctx.fillStyle = grd; ctx.fillRect(0,0,450,270);

    ctx.save(); ctx.strokeStyle="rgba(255,255,255,0.03)"; ctx.lineWidth=1;
    for(let y=0; y<270; y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(450,y);ctx.stroke();}
    ctx.restore();

    ctx.strokeStyle=rank.color; ctx.lineWidth=3; ctx.strokeRect(10,10,430,250);

    if(logoImg) { ctx.save(); ctx.shadowColor="black"; ctx.shadowBlur=10; ctx.drawImage(logoImg,25,25,60,60); ctx.restore(); }

    ctx.textAlign="left"; ctx.fillStyle=rank.color; ctx.font="bold 28px 'Cinzel'"; ctx.fillText("RK DRAGON",95,55);
    ctx.font="10px sans-serif"; ctx.fillStyle="#aaa"; ctx.fillText("OFFICIAL MEMBER",95,72);

    if(shieldImg) ctx.drawImage(shieldImg,360,20,60,70);

    ctx.fillStyle="#fff"; ctx.font="bold 32px monospace"; ctx.fillText(id,25,145);
    ctx.font="10px sans-serif"; ctx.fillStyle="#666"; ctx.fillText("RUNE ID",25,115);

    if(qrImg) { ctx.fillStyle="#fff"; ctx.fillRect(350,150,70,70); ctx.drawImage(qrImg,355,155,60,60); }

    ctx.fillStyle=rank.color; ctx.font="italic 22px serif";
    let dName=name.toUpperCase(); if(dName.length>20)dName=dName.substring(0,18)+"..";
    ctx.fillText(dName,25,230);
    ctx.fillStyle="#fff"; ctx.font="12px sans-serif"; ctx.fillText(rank.name+" TIER",25,250);
}

async function shareIDCard() {
    const canvas = document.getElementById('cardCanvas');
    canvas.toBlob(async (blob) => {
        const file = new File([blob], "RK_Card.png", { type: "image/png" });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try { await navigator.share({ files: [file] }); } catch (err) {}
        } else { downloadID(); }
    });
}

function downloadID() {
    const link = document.createElement('a'); link.download='RK_Card.jpg';
    link.href = document.getElementById('cardCanvas').toDataURL(); link.click();
}

// CSV Logic
function exportCSV() {
    if(customersList.length === 0) return alert("No data");
    const headers = ["Name", "Mobile", "ID", "Stamps", "Redeems", "Lifetime"];
    const rows = customersList.map(c => [`"${c.name}"`, `"${c.mobile}"`, c.customer_id, c.stamps, c.redeems||0, c.lifetime_stamps||0]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `Dragon_Data.csv`; link.click();
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
        const idxName = headers.indexOf('name'); const idxMobile = headers.indexOf('mobile'); const idxID = headers.indexOf('id');
        if(idxName === -1 || idxID === -1) return alert("CSV needs Name & ID");
        let batch = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            if (cols.length < 2) continue;
            const clean = (v) => v ? v.replace(/^"|"$/g, '').trim() : "";
            const cName = clean(cols[idxName]); const cID = clean(cols[idxID]);
            if (cName && cID) batch.push({ name: cName, mobile: clean(cols[idxMobile]||""), customer_id: cID, stamps: parseInt(clean(cols[headers.indexOf('stamps')]))||0, redeems: parseInt(clean(cols[headers.indexOf('redeems')]))||0, lifetime_stamps: parseInt(clean(cols[headers.indexOf('lifetime')]))||0 });
            if (batch.length >= 50 || i === lines.length - 1) {
                await fetch(`${API_URL}/customer`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ action: 'import', data: batch }) });
                batch = [];
            }
        }
        alert("Imported!"); loadCustomers(); fileInput.value = "";
    };
    reader.readAsText(file);
}

// Auth Helpers
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
    alert("Registered!"); showSection('admin-login-sec');
}
async function resetAdminPassword() {
    const email = document.getElementById('forgot-email').value;
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.href });
    if(error) alert(error.message); else alert("Link sent!");
}
async function updateAdminPassword() {
    const newPass = document.getElementById('new-password').value;
    const { error } = await supabaseClient.auth.updateUser({ password: newPass });
    if (error) alert(error.message); else { alert("Updated! Login."); adminSignOut(); }
}
async function adminSignOut() { await supabaseClient.auth.signOut(); window.location.reload(); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function showAdminTab(tab) {
    document.getElementById('adm-add-sec').classList.add('hidden'); document.getElementById('adm-list-sec').classList.add('hidden');
    if(tab === 'add') document.getElementById('adm-add-sec').classList.remove('hidden');
    if(tab === 'list') { document.getElementById('adm-list-sec').classList.remove('hidden'); loadCustomers('list'); }
}

// CUSTOMER PAGE
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
