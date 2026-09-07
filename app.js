// CONFIGURATION FIREBASE
const firebaseConfig = {
    databaseURL: "https://caisse-cartec-default-rtdb.europe-west1.firebasedatabase.app"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

let products = [];
let salesHistory = [];
let cart = [];
let editingProductId = null;

// SYNCHRONISATION EN TEMPS RÉEL AVEC FIREBASE
db.ref("products").on("value", (snapshot) => {
    const data = snapshot.val();
    products = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
    updateDropdowns();
    renderProducts();
    renderStockTable();
});

db.ref("salesHistory").on("value", (snapshot) => {
    const data = snapshot.val();
    salesHistory = data ? Object.values(data) : [];
    renderHistoryTable();
});

// GESTION DES ONGLETS
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(el => el.classList.remove('active'));

    document.getElementById(`section-${tabName}`).classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// METTRE A JOUR LES MENUS DE SELECTION MARQUE & CATEGORIE
function updateDropdowns() {
    const brands = [...new Set(products.map(p => p.brand).filter(Boolean))].sort();
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();

    // Filtres Caisse
    const brandSelect = document.getElementById("filter-brand");
    const catSelect = document.getElementById("filter-category");

    const currentBrand = brandSelect.value;
    const currentCat = catSelect.value;

    brandSelect.innerHTML = '<option value="">Toutes les marques</option>' + brands.map(b => `<option value="${b}">${b}</option>`).join("");
    catSelect.innerHTML = '<option value="">Toutes les catégories</option>' + categories.map(c => `<option value="${c}">${c}</option>`).join("");

    brandSelect.value = currentBrand;
    catSelect.value = currentCat;

    // Autocomplétion Formulaire Stock
    document.getElementById("brands-list").innerHTML = brands.map(b => `<option value="${b}">`).join("");
    document.getElementById("categories-list").innerHTML = categories.map(c => `<option value="${c}">`).join("");
}

// AFFICHAGE DES PRODUITS DANS LA CAISSE
function renderProducts() {
    const grid = document.getElementById("product-grid");
    const clientType = document.getElementById("select-client").value;
    const search = document.getElementById("search-bar").value.toLowerCase();
    const selectedBrand = document.getElementById("filter-brand").value;
    const selectedCat = document.getElementById("filter-category").value;

    grid.innerHTML = "";

    const filtered = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search);
        const matchesBrand = selectedBrand === "" || p.brand === selectedBrand;
        const matchesCat = selectedCat === "" || p.category === selectedCat;
        return matchesSearch && matchesBrand && matchesCat;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #8e8e93; padding: 2rem 0;">Aucun produit ne correspond.</p>`;
        return;
    }

    filtered.forEach(p => {
        const price = clientType === "pro" ? p.pricePro : p.pricePart;
        const card = document.createElement("div");
        card.className = "product-card";
        card.onclick = () => addToCart(p.id);

        card.innerHTML = `
            <div class="badge-brand">${p.brand || 'Général'}</div>
            <h4>${p.name}</h4>
            <div class="price">${parseFloat(price).toFixed(2)} €</div>
            <div class="stock">Stock: ${p.stock}</div>
        `;
        grid.appendChild(card);
    });
}

// PANIER
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) {
        alert("Stock épuisé !");
        return;
    }

    const item = cart.find(i => i.id === productId);
    if (item) {
        if (item.qty < product.stock) {
            item.qty++;
        } else {
            alert("Stock maximum atteint dans le panier !");
        }
    } else {
        cart.push({ id: product.id, name: product.name, pricePart: product.pricePart, pricePro: product.pricePro, qty: 1 });
    }
    renderCart();
}

function renderCart() {
    const cartList = document.getElementById("cart-list");
    const totalEl = document.getElementById("cart-total");
    const clientType = document.getElementById("select-client").value;

    cartList.innerHTML = "";
    let total = 0;

    cart.forEach((item, index) => {
        const price = clientType === "pro" ? item.pricePro : item.pricePart;
        const itemTotal = price * item.qty;
        total += itemTotal;

        const li = document.createElement("li");
        li.className = "cart-item";
        li.innerHTML = `
            <div>
                <strong>${item.name}</strong><br>
                <small>${item.qty} x ${parseFloat(price).toFixed(2)} €</small>
            </div>
            <div>
                <span>${itemTotal.toFixed(2)} €</span>
                <button class="btn-danger-small" onclick="removeFromCart(${index})">✕</button>
            </div>
        `;
        cartList.appendChild(li);
    });

    totalEl.textContent = `${total.toFixed(2)} €`;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

function clearCart() {
    cart = [];
    renderCart();
}

function checkout() {
    if (cart.length === 0) return alert("Le panier est vide !");

    const clientType = document.getElementById("select-client").value;
    const canal = document.getElementById("select-canal").value;
    let total = 0;

    const itemsSummary = cart.map(item => {
        const price = clientType === "pro" ? item.pricePro : item.pricePart;
        total += price * item.qty;
        
        // Mettre à jour le stock dans Firebase
        const prod = products.find(p => p.id === item.id);
        if (prod) {
            const newStock = Math.max(0, prod.stock - item.qty);
            db.ref(`products/${item.id}`).update({ stock: newStock });
        }

        return `${item.name} (x${item.qty})`;
    }).join(", ");

    const sale = {
        date: new Date().toLocaleString("fr-FR"),
        canal: canal === "facture" ? "Facturé" : "Cash / Black",
        type: clientType === "pro" ? "Professionnel" : "Particulier",
        details: itemsSummary,
        total: total.toFixed(2)
    };

    db.ref("salesHistory").push(sale);
    clearCart();
    alert("Vente enregistrée avec succès !");
}

// FORMULAIRE PRODUIT (AJOUT / EDIT)
function handleAddProduct(e) {
    e.preventDefault();
    const name = document.getElementById("prod-name").value.trim();
    const brand = document.getElementById("prod-brand").value.trim() || "Général";
    const category = document.getElementById("prod-category").value.trim() || "Divers";
    const stock = parseInt(document.getElementById("prod-stock").value);
    const cost = parseFloat(document.getElementById("prod-cost").value);
    const pricePart = parseFloat(document.getElementById("prod-price-part").value);
    const pricePro = parseFloat(document.getElementById("prod-price-pro").value);

    const productData = { name, brand, category, stock, cost, pricePart, pricePro };

    if (editingProductId) {
        db.ref(`products/${editingProductId}`).update(productData);
        editingProductId = null;
    } else {
        db.ref("products").push(productData);
    }

    document.getElementById("add-product-form").reset();
    document.getElementById("submit-btn").textContent = "+ Ajouter l'article";
    document.getElementById("cancel-edit-btn").style.display = "none";
}

function editProduct(id) {
    const p = products.find(prod => prod.id === id);
    if (!p) return;

    editingProductId = id;
    document.getElementById("prod-name").value = p.name;
    document.getElementById("prod-brand").value = p.brand || "";
    document.getElementById("prod-category").value = p.category || "";
    document.getElementById("prod-stock").value = p.stock;
    document.getElementById("prod-cost").value = p.cost;
    document.getElementById("prod-price-part").value = p.pricePart;
    document.getElementById("prod-price-pro").value = p.pricePro;

    document.getElementById("submit-btn").textContent = "Mettre à jour l'article";
    document.getElementById("cancel-edit-btn").style.display = "inline-block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() {
    editingProductId = null;
    document.getElementById("add-product-form").reset();
    document.getElementById("submit-btn").textContent = "+ Ajouter l'article";
    document.getElementById("cancel-edit-btn").style.display = "none";
}

function deleteProduct(id) {
    if (confirm("Supprimer définitivement cet article ?")) {
        db.ref(`products/${id}`).remove();
    }
}

// TABLEAU STOCK
function renderStockTable() {
    const tbody = document.getElementById("stock-table-body");
    const search = document.getElementById("search-stock-bar").value.toLowerCase();
    tbody.innerHTML = "";

    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(search) || 
        (p.brand && p.brand.toLowerCase().includes(search)) ||
        (p.category && p.category.toLowerCase().includes(search))
    );

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Aucun produit trouvé</td></tr>`;
        return;
    }

    filtered.forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><small style="color:#007aff; font-weight:bold;">${p.brand || 'Général'}</small><br><small style="color:#8e8e93;">${p.category || 'Divers'}</small></td>
            <td><strong>${p.name}</strong></td>
            <td>${parseFloat(p.cost).toFixed(2)} €</td>
            <td>${parseFloat(p.pricePart).toFixed(2)} €</td>
            <td>${parseFloat(p.pricePro).toFixed(2)} €</td>
            <td><strong>${p.stock}</strong></td>
            <td>
                <button class="btn-edit" onclick="editProduct('${p.id}')">✏️ Edit</button>
                <button class="btn-danger-small" onclick="deleteProduct('${p.id}')">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// HISTORIQUE
function renderHistoryTable() {
    const tbody = document.getElementById("history-table-body");
    tbody.innerHTML = "";

    salesHistory.slice().reverse().forEach(sale => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${sale.date}</td>
            <td><span class="tag ${sale.canal === 'Facturé' ? 'tag-blue' : 'tag-orange'}">${sale.canal}</span></td>
            <td>${sale.type}</td>
            <td>${sale.details}</td>
            <td><strong>${sale.total} €</strong></td>
        `;
        tbody.appendChild(tr);
    });
}

function exportData() {
    let report = "=== BILAN DU STOCK ===\n";
    products.forEach(p => {
        report += `[${p.brand || 'Sans marque'}] ${p.name} - Stock: ${p.stock} - Part: ${p.pricePart}€ - Pro: ${p.pricePro}€\n`;
    });

    report += "\n=== HISTORIQUE DES VENTES ===\n";
    salesHistory.forEach(s => {
        report += `${s.date} | ${s.canal} | ${s.type} | ${s.details} | Total: ${s.total}€\n`;
    });

    navigator.clipboard.writeText(report).then(() => {
        alert("Bilan copié dans le presse-papier !");
    });
}

function resetAll() {
    if (confirm("ATTENTION : Cela va supprimer TOUS les produits et TOUTES les ventes ! Continuer ?")) {
        db.ref().remove();
    }
}
