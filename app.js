// 1. CONFIGURATION FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyBXpSLiJZh39Kdrxxd1a6vH3OkJk-WSt44",
    authDomain: "cartec-caisse.firebaseapp.com",
    databaseURL: "https://cartec-caisse-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "cartec-caisse",
    storageBucket: "cartec-caisse.firebasestorage.app",
    messagingSenderId: "802357519611",
    appId: "1:802357519611:web:112d04a074da7e314efc5e"
};

// Initialisation de Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let stock = [];
let salesHistory = [];
let cart = [];
let editingProductId = null;

// 2. ÉCOUTEURS EN TEMPS RÉEL (SYNCHRONISATION EN DIRECT)
db.ref('stock').on('value', (snapshot) => {
    const data = snapshot.val();
    stock = data ? Object.values(data) : [];
    renderAll();
});

db.ref('salesHistory').on('value', (snapshot) => {
    const data = snapshot.val();
    salesHistory = data ? Object.values(data) : [];
    renderAll();
});

// Envoi des données vers Firebase
function saveStockToFirebase() {
    db.ref('stock').set(stock);
}

function saveHistoryToFirebase() {
    db.ref('salesHistory').set(salesHistory);
}

// 3. NAVIGATION PAR ONGLETS
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(el => el.classList.remove('active'));
    
    const targetSection = document.getElementById('section-' + tabName);
    const targetTab = document.getElementById('tab-' + tabName);
    
    if (targetSection) targetSection.classList.add('active');
    if (targetTab) targetTab.classList.add('active');
    
    renderAll();
}

function renderAll() {
    renderProducts();
    renderCart();
    renderStockTable();
    renderHistoryTable();
}

/* CAISSE */
function renderProducts() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    const clientType = document.getElementById('select-client').value;
    const searchQuery = document.getElementById('search-bar').value.toLowerCase();
    grid.innerHTML = '';

    const filteredStock = stock.filter(p => p.name.toLowerCase().includes(searchQuery));

    if (filteredStock.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; color: #8e8e93; font-style: italic;">Aucun produit trouvé.</p>';
        return;
    }

    filteredStock.forEach(prod => {
        const currentPrice = clientType === 'pro' ? prod.pricePro : prod.pricePart;
        
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => addToCart(prod.id);
        card.innerHTML = `
            <h4>${prod.name}</h4>
            <div class="price">${currentPrice.toFixed(2)} €</div>
            <div class="stock">Stock : ${prod.stock}</div>
        `;
        grid.appendChild(card);
    });
}

function addToCart(productId) {
    const product = stock.find(p => p.id === productId);
    const clientType = document.getElementById('select-client').value;

    if (!product || product.stock <= 0) {
        alert("Produit en rupture de stock !");
        return;
    }

    const priceToApply = clientType === 'pro' ? product.pricePro : product.pricePart;
    const cartItem = cart.find(item => item.id === productId);

    if (cartItem) {
        if (cartItem.qty < product.stock) {
            cartItem.qty++;
        } else {
            alert("Stock maximum atteint pour cet article !");
        }
    } else {
        cart.push({ id: product.id, name: product.name, price: priceToApply, qty: 1 });
    }
    renderCart();
}

function renderCart() {
    const cartList = document.getElementById('cart-list');
    const totalEl = document.getElementById('cart-total');
    if (!cartList || !totalEl) return;

    cartList.innerHTML = '';
    
    let total = 0;
    cart.forEach(item => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        cartList.innerHTML += `
            <li class="cart-item">
                <span>${item.name} (x${item.qty})</span>
                <span>${itemTotal.toFixed(2)} €</span>
            </li>
        `;
    });
    
    totalEl.innerText = total.toFixed(2) + ' €';
}

function clearCart() {
    cart = [];
    renderCart();
}

function checkout() {
    if (cart.length === 0) {
        alert("Le panier est vide.");
        return;
    }

    const clientType = document.getElementById('select-client').value === 'pro' ? 'Professionnel' : 'Particulier';
    const canalType = document.getElementById('select-canal').value === 'facture' ? 'Facturé' : 'Cash / Black';

    cart.forEach(item => {
        const prod = stock.find(p => p.id === item.id);
        if (prod) {
            prod.stock -= item.qty;
        }
    });

    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const saleRecord = {
        date: new Date().toLocaleString('fr-FR'),
        canal: canalType,
        tarif: clientType,
        items: cart.map(i => `${i.name} (x${i.qty})`).join(', '),
        total: total.toFixed(2)
    };

    salesHistory.unshift(saleRecord);
    saveStockToFirebase();
    saveHistoryToFirebase();
    clearCart();
    alert("Vente enregistrée et synchronisée !");
}

/* GESTION DU STOCK */
function renderStockTable() {
    const body = document.getElementById('stock-table-body');
    if (!body) return;

    const searchInput = document.getElementById('search-stock-bar');
    const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
    
    body.innerHTML = '';

    const filteredStock = stock.filter(p => p.name.toLowerCase().includes(searchQuery));

    if (filteredStock.length === 0) {
        body.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #8e8e93; padding: 1.2rem;">Aucun produit trouvé</td></tr>`;
        return;
    }

    filteredStock.forEach(p => {
        const costVal = p.cost !== undefined ? p.cost.toFixed(2) : '0.00';
        body.innerHTML += `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td>${costVal} €</td>
                <td>${p.pricePart.toFixed(2)} €</td>
                <td>${p.pricePro.toFixed(2)} €</td>
                <td>${p.stock}</td>
                <td>
                    <button class="btn-edit" onclick="editProduct(${p.id})">Modifier</button>
                    <button class="btn-danger" onclick="deleteProduct(${p.id})">Supprimer</button>
                </td>
            </tr>
        `;
    });
}

function editProduct(id) {
    const prod = stock.find(p => p.id === id);
    if (!prod) return;

    document.getElementById('prod-name').value = prod.name;
    document.getElementById('prod-stock').value = prod.stock;
    document.getElementById('prod-cost').value = prod.cost || 0;
    document.getElementById('prod-price-part').value = prod.pricePart;
    document.getElementById('prod-price-pro').value = prod.pricePro;

    editingProductId = id;

    document.getElementById('form-title').innerText = "✏️ Modifier l'article";
    document.getElementById('submit-btn').innerText = "Mettre à jour l'article";
    document.getElementById('cancel-edit-btn').style.display = "inline-flex";
    document.getElementById('add-product-form').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
    editingProductId = null;
    document.getElementById('add-product-form').reset();
    document.getElementById('form-title').innerText = "+ Ajouter un produit";
    document.getElementById('submit-btn').innerText = "Mettre à jour l'article";
    document.getElementById('cancel-edit-btn').style.display = "none";
}

function handleAddProduct(e) {
    e.preventDefault();

    const name = document.getElementById('prod-name').value;
    const stockQty = parseInt(document.getElementById('prod-stock').value);
    const cost = parseFloat(document.getElementById('prod-cost').value);
    const pricePart = parseFloat(document.getElementById('prod-price-part').value);
    const pricePro = parseFloat(document.getElementById('prod-price-pro').value);

    if (editingProductId !== null) {
        const prod = stock.find(p => p.id === editingProductId);
        if (prod) {
            prod.name = name;
            prod.stock = stockQty;
            prod.cost = cost;
            prod.pricePart = pricePart;
            prod.pricePro = pricePro;
        }
        cancelEdit();
    } else {
        const existingProduct = stock.find(p => p.name.toLowerCase() === name.toLowerCase());
        if (existingProduct) {
            existingProduct.stock += stockQty;
            existingProduct.cost = cost;
            existingProduct.pricePart = pricePart;
            existingProduct.pricePro = pricePro;
        } else {
            stock.push({ id: Date.now(), name, cost, pricePart, pricePro, stock: stockQty });
        }
        e.target.reset();
    }

    saveStockToFirebase();
}

function deleteProduct(id) {
    if (confirm("Voulez-vous vraiment supprimer cet article ?")) {
        stock = stock.filter(p => p.id !== id);
        saveStockToFirebase();
    }
}

/* HISTORIQUE ET BILAN */
function renderHistoryTable() {
    const body = document.getElementById('history-table-body');
    if (!body) return;

    body.innerHTML = '';
    salesHistory.forEach(s => {
        body.innerHTML += `
            <tr>
                <td>${s.date}</td>
                <td><strong>${s.canal}</strong></td>
                <td>${s.tarif}</td>
                <td>${s.items}</td>
                <td><strong>${s.total} €</strong></td>
            </tr>
        `;
    });
}

function exportData() {
    let blackSales = salesHistory.filter(s => s.canal.includes('Cash') || s.canal.includes('Black'));
    let factSales = salesHistory.filter(s => s.canal.includes('Facturé') || s.canal.includes('Facture'));

    let totalBlack = blackSales.reduce((sum, s) => sum + parseFloat(s.total), 0);
    let totalFact = factSales.reduce((sum, s) => sum + parseFloat(s.total), 0);
    let totalGeneral = totalBlack + totalFact;

    let textBlack = blackSales.length === 0 ? "- Aucune vente" : blackSales.map(s => `- ${s.items} (${s.total} €)`).join("\n");
    let textFact = factSales.length === 0 ? "- Aucune vente" : factSales.map(s => `- ${s.items} (${s.total} €)`).join("\n");

    let textStock = stock.length === 0 
        ? "(Catalogue vide)" 
        : stock.map(s => `- ${s.name} : ${s.stock} restant(s)`).join("\n");

    const reportStr = `📊 BILAN DE STOCK & VENTES :

🔴 VENTES CASH / BLACK :
${textBlack}
👉 Total Cash : ${totalBlack.toFixed(2)} €

🔵 VENTES FACTURÉES :
${textFact}
👉 Total Facturé : ${totalFact.toFixed(2)} €

💰 TOTAL GÉNÉRAL ENCAISSÉ : ${totalGeneral.toFixed(2)} €

📦 STOCK RESTANT EN CATALOGUE :
${textStock}`;

    navigator.clipboard.writeText(reportStr);
    alert("Bilan copié dans le presse-papier !");
}

function resetAll() {
    if (confirm("Voulez-vous vraiment TOUT réinitialiser (catalogue et ventes) ?")) {
        stock = [];
        salesHistory = [];
        saveStockToFirebase();
        saveHistoryToFirebase();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    switchTab('caisse');
});
