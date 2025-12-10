// --- CONFIGURATION ---
const API_URL = '/api';
const SUPABASE_URL = 'https://iszzxbakpuwjxhgjwrgi.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzenp4YmFrcHV3anhoZ2p3cmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDE4MDcsImV4cCI6MjA3OTgxNzgwN30.NwWX_PUzLKsfw2UjT0SK7wCZyZnd9jtvggf6bAlD3V0'; 

let supabaseClient = null;
let currentUserEmail = null;
let customersList = []; 
let html5QrCode = null; // Scanner

if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            currentUserEmail = session.user.email;
            // Check which page we are on
            if (document.getElementById('admin-dashboard')) {
                showSection('admin-dashboard');
                loadCustomers('list'); // Main List
            }
            if (document.getElementById('history-table-body')) {
                loadCustomers('history'); // History Page
            }
        }
        if (event === 'PASSWORD_RECOVERY') showSection('admin-update-pass-sec');
    });
}

function showSection(id) {
    if(!document.getElementById(id)) return;
    document.querySelectorAll('.app-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
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
// 📋 DATA LOADING (Unified)
// ==========================================
async function loadCustomers(mode = 'list') {
    const listEl = document.getElementById('customer-list');
    const tableEl = document.getElementById('history-table-body');
    
    // UI Loading States
    if(mode === 'list' && listEl && customersList.length === 0) listEl.innerHTML = '<div style="color:#888;">Summoning...</div>';
    if(mode === 'history' && tableEl) tableEl.innerHTML = '<tr><td colspan="6">Loading Scrolls...</td></tr>';

    try {
        const res = await fetch(`${API_URL}/customer?action=${mode}`);
        customersList = await res.json();
        
        if (mode === 'list') renderAdminList(customersList);
        if (mode === 'history') renderHistoryTable(customersList);
        
    } catch(e) { console.error(e); }
}

// ==========================================
// 🖥️ MAIN ADMIN DASHBOARD RENDER
// ==========================================
function renderAdminList(data) {
    const el = document.getElementById('customer-list');
    if(!el) return;
    el.innerHTML = "";
    
    data.forEach(c => {
        const rank = getRankInfo(c.redeems || 0);
        let btns = (c.stamps >= 6) ? 
            `<button onclick="updateStamp('${c.customer_id}', 'reset')" class="primary-btn" style="flex:2;">🎁 REDEEM</button>` :
            `<button onclick="updateStamp('${c.customer_id}', 'add')" class="primary-btn" style="flex:2;">+ Stamp</button>`;

        el.innerHTML += `
            <div class="cust-item">
                <img src="assets/${rank.img}" class="rank-mini-icon" onerror="this.src='assets/logo.png'">
                <div class="cust-header">
                    <div>
                        <div style="font-weight:bold; font-size:1.1em; color:white;">
                            ${c.name} <span onclick="editName('${c.customer_id}', '${c.name}')" style="cursor:pointer; font-size:0.8em;">✏️</span>
                        </div>
                        <div style="color:${rank.color}; font-size:0.9em;">ID: ${c.customer_id} | Mob: ${c.mobile}</div>
                    </div>
                </div>
                <div class="stamp-container">${getDragonBalls(c.stamps||0)}</div>
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

// ==========================================
// 📜 HISTORY PAGE RENDER (New)
// ==========================================
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
                    <button onclick="generateIDCard('${c.name}', '${c.customer_id}', ${c.redeems||0})" class="secondary-btn" style="padding:5px 10px; font-size:0.8em;">💳 ID</button>
                </td>
                <td>
                    ${c.is_deleted ? `<button onclick="permanentDelete('${c.customer_id}')" class="danger-btn" style="padding:5px; font-size:0.8em;">🗑️ Forever</button>` : '-'}
                </td>
            </tr>
        `;
    });
}

function getDragonBalls(count) {
    let html = ''; for(let i=0; i<6; i++) html += `<div class="dragon-ball ${i < count ? 'filled' : ''}"></div>`; return html;
}

// ==========================================
// 🔍 SEARCH (By Name, ID, Mobile)
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
// ✏️ EDIT & DELETE LOGIC
// ==========================================
async function editName(id, oldName) {
    const newName = prompt("Enter new name:", oldName);
    if(newName && newName !== oldName) {
        // Optimistic update
        const c = customersList.find(x => x.customer_id === id);
        if(c) c.name = newName;
        renderAdminList(customersList);
        
        await fetch(`${API_URL}/customer`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: 'edit_name', id: id, name: newName})
        });
    }
}

async function softDeleteCustomer(id) {
    if(!confirm("Remove from active list? (Data will be kept in History)")) return;
    
    // Remove from UI instantly
    customersList = customersList.filter(c => c.customer_id !== id);
    renderAdminList(customersList);

    await fetch(`${API_URL}/customer`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'soft_delete', id})
    });
}

async function permanentDelete(id) {
    if(!confirm("⚠️ WARNING: This will permanently delete this customer. This cannot be undone.")) return;
    
    const password = prompt("Enter Admin Password to confirm PERMANENT DELETION:");
    if(!password) return;

    if (!currentUserEmail) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if(session) currentUserEmail = session.user.email;
    }

    const { error } = await supabaseClient.auth.signInWithPassword({ email: currentUserEmail, password });
    if (error) return alert("❌ Wrong Password!");

    await fetch(`${API_URL}/customer`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'permanent_delete', id})
    });
    
    alert("Deleted Forever.");
    loadCustomers('history'); // Reload history table
}

// ==========================================
// 🎨 HIGH QUALITY ID CARD + SHARE
// ==========================================
async function generateIDCard(name, id, redeems = 0) {
    document.getElementById('id-modal').classList.remove('hidden');
    const canvas = document.getElementById('cardCanvas');
    const ctx = canvas.getContext('2d');
    const rank = getRankInfo(redeems);

    // 1. High Res Setup (2x Scale)
    const scale = 2; 
    canvas.width = 450 * scale;
    canvas.height = 270 * scale;
    ctx.scale(scale, scale);

    // Load Images
    const loadImage = (src) => new Promise(r => { let i=new Image(); i.onload=()=>r(i); i.onerror=()=>r(null); i.src=src; });
    const qrData = await QRCode.toDataURL(id, {width:100, margin:1, color:{dark:"#000", light:"#fff"}});
    const qrImg = await loadImage(qrData);
    const logoImg = await loadImage('assets/logo.png');
    const shieldImg = await loadImage(`assets/${rank.img}`);

    // Drawing Logic (Same design, just higher res context)
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

// 📤 SHARE FUNCTION (Web Share API)
async function shareIDCard() {
    const canvas = document.getElementById('cardCanvas');
    canvas.toBlob(async (blob) => {
        const file = new File([blob], "RK_Dragon_Card.png", { type: "image/png" });
        
        // Mobile Share Logic
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: 'RK Dragon ID Card',
                    text: 'Join the snack warriors!'
                });
            } catch (err) { console.log("Share failed", err); }
        } else {
            // Fallback for Desktop
            downloadID();
        }
    });
}

function downloadID() {
    const link = document.createElement('a'); link.download='RK_Card.jpg';
    link.href = document.getElementById('cardCanvas').toDataURL(); link.click();
}

// 📤 FIXED CSV EXPORT
function exportCSV() {
    if (customersList.length === 0) return alert("No data to export!");
    
    // Header
    const headers = ["Name", "Mobile", "ID", "Stamps", "Redeems", "Lifetime"];
    
    // Rows
    const rows = customersList.map(c => [
        `"${c.name}"`, // Quote names to handle commas
        `"${c.mobile}"`,
        c.customer_id,
        c.stamps,
        c.redeems || 0,
        c.lifetime_stamps || 0
    ]);

    // Combine
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Dragon_Backup.csv`;
    link.click();
}

// 📥 FIXED CSV IMPORT
function importCSV() {
    const fileInput = document.getElementById('csv-input');
    const file = fileInput.files[0];
    if (!file) { fileInput.click(); return; }

    const reader = new FileReader();
    reader.onload = async function(e) {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
        
        if (lines.length < 2) return alert("Invalid CSV");

        // Parse Headers (Case Insensitive)
        const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g, ''));
        const idxName = headers.indexOf('name');
        const idxID = headers.indexOf('id');
        
        if(idxName === -1 || idxID === -1) return alert("CSV must have 'Name' and 'ID' columns");

        let batch = [];
        let count = 0;

        alert("Importing... Please wait.");

        for (let i = 1; i < lines.length; i++) {
            // Regex to split by comma, ignoring commas inside quotes
            const cols = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            
            if (cols.length < 2) continue;

            const clean = (val) => val ? val.replace(/^"|"$/g, '').trim() : "";
            const cName = clean(cols[idxName]);
            const cID = clean(cols[idxID]);
            
            if (cName && cID) {
                batch.push({
                    name: cName,
                    mobile: clean(cols[headers.indexOf('mobile')] || ""),
                    customer_id: cID,
                    stamps: parseInt(clean(cols[headers.indexOf('stamps')])) || 0,
                    redeems: parseInt(clean(cols[headers.indexOf('redeems')])) || 0,
                    lifetime_stamps: parseInt(clean(cols[headers.indexOf('lifetime')])) || 0
                });
            }

            if (batch.length >= 50 || i === lines.length - 1) {
                if (batch.length > 0) {
                    await fetch(`${API_URL}/customer`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ action: 'import', data: batch }) });
                    count += batch.length;
                    batch = [];
                }
            }
        }
        alert(`Success! Imported ${count} records.`);
        loadCustomers();
        fileInput.value = "";
    };
    reader.readAsText(file);
}

// AUTH & CUSTOMER
async function updateStamp(id, type) {
    const cust = customersList.find(c => c.customer_id === id);
    if(cust) {
        if(type === 'add') cust.stamps++;
        else if(type === 'remove') cust.stamps = Math.max(0, cust.stamps - 1);
        else if(type === 'reset') { cust.stamps = 0; cust.redeems++; }
        renderAdminList(customersList);
    }
    await fetch(`${API_URL}/customer`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'stamp', id, type}) });
    loadCustomers('list');
}

async function createCustomer() {
    const name = document.getElementById('new-name').value;
    const mobile = document.getElementById('new-mobile').value;
    if(!name || !mobile) return alert("Fill all fields");
    const res = await fetch(`${API_URL}/customer`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'add', name, mobile}) });
    const data = await res.json();
    if(res.ok) { 
        document.getElementById('new-name').value = ""; document.getElementById('new-mobile').value = "";
        generateIDCard(name, data.customerId, 0); loadCustomers('list');
    } else alert(data.error);
}

// Scanner Functions
function startCustomerScanner() { startScanner((text) => { document.getElementById('cust-login-id').value = text; customerLogin(); }); }
function startAdminScanner() { startScanner((text) => { document.getElementById('search-input').value = text; searchCustomers(); }); }
function startScanner(cb) {
    document.getElementById('scanner-modal').classList.remove('hidden');
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({facingMode:"environment"}, {fps:10, qrbox:250}, (txt)=>{ stopScanner(); cb(txt); }).catch(e=>alert(e));
}
function stopScanner() { if(html5QrCode) html5QrCode.stop().then(()=>document.getElementById('scanner-modal').classList.add('hidden')); }

// Auth
async function adminSignIn() { const u=document.getElementById('login-username').value; const p=document.getElementById('login-pass').value; const {data}=await supabaseClient.from('admin_profiles').select('email').eq('username',u).single(); if(!data)return alert("User not found"); const {error}=await supabaseClient.auth.signInWithPassword({email:data.email, password:p}); if(error)alert("Wrong Password"); }
async function adminSignUp() { const e=document.getElementById('reg-email').value; const p=document.getElementById('reg-pass').value; const u=document.getElementById('reg-username').value; const {error}=await supabaseClient.auth.signUp({email:e,password:p}); if(error)return alert(error.message); await supabaseClient.from('admin_profiles').insert([{username:u,email:e}]); alert("Registered!"); showSection('admin-login-sec'); }
async function checkAdminSession() { if(!supabaseClient)return; const {data:{session}} = await supabaseClient.auth.getSession(); if(session){ showSection('admin-dashboard'); loadCustomers('list'); } else if(document.getElementById('admin-login-sec')) showSection('admin-login-sec'); }
async function adminSignOut() { await supabaseClient.auth.signOut(); window.location.reload(); }
async function customerLogin() { const id=document.getElementById('cust-login-id').value.trim(); if(!id)return alert("Enter ID/Mobile"); try{ const r=await fetch(`${API_URL}/customer?action=login&id=${id}`); const d=await r.json(); if(r.ok){showSection('cust-dashboard'); renderCustomerStats(d);} else alert("Not found"); } catch(e){alert("Error");} }
function renderCustomerStats(c) { const r=getRankInfo(c.redeems); document.getElementById('display-cust-name').innerText=c.name; document.getElementById('display-rank-name').innerText=r.name; document.getElementById('display-rank-name').style.color=r.color; document.getElementById('display-redeems').innerText=c.redeems||0; document.getElementById('rank-shield-img').src=`assets/${r.img}`; document.getElementById('xp-bar').style.width=`${Math.min(r.pct,100)}%`; document.getElementById('cust-stamps-display').innerHTML=getDragonBalls(c.stamps||0); document.getElementById('view-my-id-btn').onclick=()=>generateIDCard(c.name,c.customer_id,c.redeems); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function showAdminTab(tab) { document.getElementById('adm-add-sec').classList.add('hidden'); document.getElementById('adm-list-sec').classList.add('hidden'); if(tab==='add') document.getElementById('adm-add-sec').classList.remove('hidden'); if(tab==='list') {document.getElementById('adm-list-sec').classList.remove('hidden'); loadCustomers('list');} }
