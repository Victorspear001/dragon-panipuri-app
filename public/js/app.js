// --- CONFIGURATION ---
const API_URL = '/api';
// ⚠️ PASTE YOUR SUPABASE KEYS HERE
const SUPABASE_URL = 'https://iszzxbakpuwjxhgjwrgi.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzenp4YmFrcHV3anhoZ2p3cmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDE4MDcsImV4cCI6MjA3OTgxNzgwN30.NwWX_PUzLKsfw2UjT0SK7wCZyZnd9jtvggf6bAlD3V0'; 

let supabaseClient = null;
let currentUserEmail = null; // Store email for delete verification

if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            currentUserEmail = session.user.email; // Save email for re-auth check
            if(document.getElementById('admin-dashboard')) {
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

// ... (Keep Rank Logic & ID Card Logic same as before) ...
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

// ... (Keep generateIDCard and downloadID functions) ...
// [Paste generateIDCard function here from previous code]

// ==========================================
// 📥 ROBUST CSV IMPORT / EXPORT (FIXED)
// ==========================================

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
    link.download = `Dragon_Backup_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
}

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
        const idxStamps = headers.indexOf('stamps');
        const idxRedeems = headers.indexOf('redeems');
        const idxLifetime = headers.findIndex(h => h.includes('lifetime'));

        if(idxName === -1 || idxID === -1) return alert("CSV must have 'Name' and 'ID' columns");

        let batch = [];
        let count = 0;

        alert("Importing... Please wait.");

        for (let i = 1; i < lines.length; i++) {
            // Regex to split by comma, ignoring commas inside quotes
            const cols = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            
            if (cols.length < 2) continue;

            // Clean quotes
            const clean = (val) => val ? val.replace(/^"|"$/g, '').trim() : "";

            const cName = clean(cols[idxName]);
            const cID = clean(cols[idxID]);
            
            if (cName && cID) {
                batch.push({
                    name: cName,
                    mobile: clean(cols[headers.indexOf('mobile')] || ""),
                    customer_id: cID,
                    stamps: parseInt(clean(cols[idxStamps])) || 0,
                    redeems: parseInt(clean(cols[idxRedeems])) || 0,
                    lifetime_stamps: parseInt(clean(cols[idxLifetime])) || 0
                });
            }

            // Batch Send (50 at a time)
            if (batch.length >= 50 || i === lines.length - 1) {
                if (batch.length > 0) {
                    await fetch(`${API_URL}/customer`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ action: 'import', data: batch })
                    });
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

// ==========================================
// 🔒 SECURE DELETE (Password Required)
// ==========================================
async function deleteCustomer(id) {
    if(!confirm("Are you sure you want to delete this customer?")) return;

    const password = prompt("🔒 SECURITY CHECK\nEnter Admin Password to confirm deletion:");
    if (!password) return;

    // Verify Password against Supabase Auth
    const { error } = await supabaseClient.auth.signInWithPassword({
        email: currentUserEmail,
        password: password
    });

    if (error) {
        alert("❌ Wrong Password! Deletion Cancelled.");
        return;
    }

    // If verified, proceed to delete
    await fetch(`${API_URL}/customer`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'delete', id})
    });
    
    alert("✅ Customer Deleted.");
    loadCustomers();
}

// ... (Keep existing Admin/Customer/List logic below) ...
// (loadCustomers, renderAdminList, customerLogin, createCustomer, updateStamp, auth functions)
// Ensure "createCustomer" calls generateIDCard(name, data.customerId, 0)
// Ensure "updateStamp" handles redeems correctly (reset -> redeems+1)
