const API_URL = '/api';

// --- UI HELPERS ---
function showRegister() { toggleSection('register-section'); }
function showLogin() { toggleSection('login-section'); }
function showRecovery() { toggleSection('recovery-section'); }
function toggleSection(id) {
    document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

// --- AUTHENTICATION ---
async function registerAdmin() {
    const user = document.getElementById('reg-user').value;
    const pass = document.getElementById('reg-pass').value;
    const q = document.getElementById('reg-sec-q').value;
    const a = document.getElementById('reg-sec-a').value;

    if (!user || !pass) return alert("Fill all fields");

    const res = await fetch(`${API_URL}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', user, pass, q, a })
    });
    const data = await res.json();
    alert(data.message || data.error);
    if(res.ok) showLogin();
}

async function login() {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    const res = await fetch(`${API_URL}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', user, pass })
    });
    const data = await res.json();
    if (res.ok) {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        document.querySelector('header').classList.add('hidden');
    } else {
        alert(data.error || "Login Failed");
    }
}

async function resetPassword() { /* Same as before, keep it simple */
    const user = document.getElementById('rec-user').value;
    const q = document.getElementById('rec-sec-q').value;
    const a = document.getElementById('rec-sec-a').value;
    const newPass = document.getElementById('rec-new-pass').value;
    const res = await fetch(`${API_URL}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recover', user, q, a, newPass })
    });
    alert((await res.json()).message);
    if(res.ok) showLogin();
}

// --- DASHBOARD ---
function showTab(tab) {
    document.getElementById('add-cust-section').classList.add('hidden');
    document.getElementById('list-cust-section').classList.add('hidden');
    document.getElementById(tab + '-section').classList.remove('hidden');
    if(tab === 'list-cust') loadCustomers();
}

// --- NEW STYLISH ID CARD ---
function generateIDCard(name, id) {
    const canvas = document.getElementById('cardCanvas');
    const ctx = canvas.getContext('2d');
    document.getElementById('id-card-area').classList.remove('hidden');

    // 1. Fiery Gradient Background
    const grd = ctx.createLinearGradient(0, 0, 450, 270);
    grd.addColorStop(0, "#8a0303"); // Dark Red
    grd.addColorStop(0.5, "#000000"); // Black Center
    grd.addColorStop(1, "#8a0303"); // Dark Red
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 450, 270);

    // 2. Gold Border
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 15;
    ctx.strokeRect(0, 0, 450, 270);

    // 3. Inner Orange Glow Line
    ctx.strokeStyle = "#ff4500";
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, 410, 230);

    // 4. Text
    ctx.textAlign = "center";
    
    // Header
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 30px serif";
    ctx.shadowColor = "red";
    ctx.shadowBlur = 10;
    ctx.fillText("RK DRAGON PANIPURI", 225, 60);
    ctx.shadowBlur = 0; // Reset shadow

    // ID Number (Big and Bold)
    ctx.fillStyle = "white";
    ctx.font = "bold 40px sans-serif";
    ctx.fillText(id, 225, 130);

    // Name
    ctx.font = "italic 24px serif";
    ctx.fillStyle = "#ffcc00";
    ctx.fillText(name.toUpperCase(), 225, 170);

    // Footer
    ctx.fillStyle = "#ff4500";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText("★ BUY 6 GET 1 FREE ★", 225, 230);
}

function downloadID() {
    const link = document.createElement('a');
    link.download = 'RK_Dragon_Card.jpg';
    link.href = document.getElementById('cardCanvas').toDataURL();
    link.click();
}

async function registerCustomer() {
    const name = document.getElementById('cust-name').value;
    const mobile = document.getElementById('cust-mobile').value;
    const res = await fetch(`${API_URL}/customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', name, mobile })
    });
    const data = await res.json();
    if (res.ok) {
        generateIDCard(name, data.customerId);
    } else {
        alert("Error: " + data.error);
    }
}

// --- LOYALTY LIST, EXPORT, IMPORT, DELETE ---

let currentCustomers = []; // Store locally for export

async function loadCustomers() {
    const list = document.getElementById('customer-list');
    list.innerHTML = "Summoning data...";
    
    try {
        const res = await fetch(`${API_URL}/customer?action=list`);
        currentCustomers = await res.json(); // Save for export

        list.innerHTML = "";
        currentCustomers.forEach(c => {
            let statusHtml = "";
            if (c.stamps >= 6) {
                statusHtml = `<div class="free-msg">🎉 FREE SNACK READY!</div>
                              <button onclick="stamp('${c.customer_id}', true)">Redeem</button>`;
            } else {
                statusHtml = `<div class="stamps">${'🔥'.repeat(c.stamps)} (${c.stamps}/6)</div>
                              <button onclick="stamp('${c.customer_id}', false)">Stamp</button>`;
            }

            const div = document.createElement('div');
            div.className = 'cust-item';
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between;">
                    <strong>${c.name}</strong> 
                    <span style="color:gold;">${c.customer_id}</span>
                </div>
                <div>Mobile: ${c.mobile}</div>
                ${statusHtml}
                <button class="danger-btn" onclick="deleteCustomer('${c.customer_id}')">Delete</button>
            `;
            list.appendChild(div);
        });
    } catch (e) { list.innerHTML = "Error loading data."; }
}

async function stamp(id, isReset) {
    await fetch(`${API_URL}/customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stamp', id, isReset })
    });
    loadCustomers();
}

async function deleteCustomer(id) {
    if(!confirm("Are you sure you want to banish this customer?")) return;
    
    const res = await fetch(`${API_URL}/customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
    });
    if(res.ok) loadCustomers();
    else alert("Could not delete");
}

// --- EXPORT CSV ---
function exportCSV() {
    if(currentCustomers.length === 0) return alert("No data to export!");
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Name,Mobile,CustomerID,Stamps\n"; // Header

    currentCustomers.forEach(row => {
        csvContent += `${row.name},${row.mobile},${row.customer_id},${row.stamps}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "dragon_customers.csv");
    document.body.appendChild(link);
    link.click();
}

// --- IMPORT CSV ---
function importCSV() {
    const file = document.getElementById('csv-input').files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        const text = e.target.result;
        const rows = text.split("\n").slice(1); // Skip header

        const customersToImport = [];
        rows.forEach(row => {
            const cols = row.split(",");
            if(cols.length >= 4) {
                // Remove \r or extra spaces
                customersToImport.push({
                    name: cols[0].trim(),
                    mobile: cols[1].trim(),
                    customer_id: cols[2].trim(),
                    stamps: parseInt(cols[3].trim()) || 0
                });
            }
        });

        if(customersToImport.length > 0) {
            const res = await fetch(`${API_URL}/customer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'import', data: customersToImport })
            });
            alert((await res.json()).message);
            loadCustomers();
        }
    };
    reader.readAsText(file);
}
