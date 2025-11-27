// Base URL for API
const API_URL = '/api';

// UI Navigation
function showRegister() { toggleSection('register-section'); }
function showLogin() { toggleSection('login-section'); }
function showRecovery() { toggleSection('recovery-section'); }
function toggleSection(id) {
    document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

// 1. ADMIN AUTHENTICATION
async function registerAdmin() {
    const user = document.getElementById('reg-user').value;
    const pass = document.getElementById('reg-pass').value;
    const q = document.getElementById('reg-sec-q').value;
    const a = document.getElementById('reg-sec-a').value;

    if (!user || !pass || !a) {
        alert("Please fill all fields!");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'register', user, pass, q, a })
        });
        
        const data = await res.json(); // Read the response

        if (res.ok) {
            // Success!
            alert(data.message || "Registration Successful!");
            showLogin();
        } else {
            // Error! Show the specific error from the server
            alert("Registration Failed: " + (data.error || "Unknown Error"));
            console.error("Server Error:", data); // Shows details in F12 console
        }
    } catch (err) {
        alert("Network Error: Check your internet or Vercel logs.");
        console.error(err);
    }
}

async function login() {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;

    try {
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
            alert("Login Failed: " + (data.error || "Invalid Credentials"));
        }
    } catch (err) {
        console.error(err);
        alert("Login System Error");
    }
}

async function resetPassword() {
    const user = document.getElementById('rec-user').value;
    const q = document.getElementById('rec-sec-q').value;
    const a = document.getElementById('rec-sec-a').value;
    const newPass = document.getElementById('rec-new-pass').value;

    const res = await fetch(`${API_URL}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recover', user, q, a, newPass })
    });
    const data = await res.json();
    
    if (res.ok) {
        alert(data.message);
        showLogin();
    } else {
        alert("Error: " + data.error);
    }
}

// 2. DASHBOARD LOGIC
function showTab(tab) {
    document.getElementById('add-cust-section').classList.add('hidden');
    document.getElementById('list-cust-section').classList.add('hidden');
    document.getElementById(tab + '-section').classList.remove('hidden');
    if(tab === 'list-cust') loadCustomers();
}

// 3. CUSTOMER REGISTRATION & ID CARD
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
        alert("Customer Added! ID: " + data.customerId);
        generateIDCard(name, data.customerId);
    } else {
        alert("Error: " + (data.error || "Could not add customer"));
    }
}

function generateIDCard(name, id) {
    const canvas = document.getElementById('cardCanvas');
    const ctx = canvas.getContext('2d');
    const area = document.getElementById('id-card-area');
    area.classList.remove('hidden');

    // Background
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, 400, 250);
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, 400, 250);

    // Text
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 24px serif";
    ctx.fillText("RK DRAGON PANIPURI", 50, 50);
    
    ctx.fillStyle = "white";
    ctx.font = "20px sans-serif";
    ctx.fillText(`Name: ${name}`, 30, 120);
    ctx.fillText(`ID: ${id}`, 30, 160);
    
    ctx.fillStyle = "#8b0000";
    ctx.font = "italic 16px sans-serif";
    ctx.fillText("Buy 6, Get 7th Free!", 30, 210);
}

function downloadID() {
    const canvas = document.getElementById('cardCanvas');
    const link = document.createElement('a');
    link.download = 'RK_Loyalty_Card.jpg';
    link.href = canvas.toDataURL();
    link.click();
}

// 4. LOYALTY SYSTEM
async function loadCustomers() {
    const list = document.getElementById('customer-list');
    list.innerHTML = "Loading dragon scrolls...";
    
    try {
        const res = await fetch(`${API_URL}/customer?action=list`);
        const customers = await res.json();

        if (!Array.isArray(customers)) {
             list.innerHTML = "Error loading list.";
             return;
        }

        list.innerHTML = "";
        customers.forEach(c => {
            let statusHtml = "";
            if (c.stamps >= 6) {
                statusHtml = `<div class="free-msg">🎉 FREE SNACK AVAILABLE!</div>
                              <button onclick="stamp('${c.customer_id}', true)">Redeem & Reset</button>`;
            } else {
                statusHtml = `<div class="stamps">Stamps: ${'🔥'.repeat(c.stamps)} (${c.stamps}/6)</div>
                              <button onclick="stamp('${c.customer_id}', false)">Stamp +1</button>`;
            }

            const div = document.createElement('div');
            div.className = 'cust-item';
            div.innerHTML = `<strong>${c.name}</strong> (${c.customer_id})<br>
                             Mobile: ${c.mobile}<br>
                             ${statusHtml}`;
            list.appendChild(div);
        });
    } catch (e) {
        list.innerHTML = "Connection failed.";
    }
}

async function stamp(id, isReset) {
    await fetch(`${API_URL}/customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stamp', id, isReset })
    });
    loadCustomers();
}
