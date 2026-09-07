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

// ETATS DE NAVIGATION
let currentFolder = null;    // null = Vue des Dossiers
let currentCategory = null;  // null = Vue des Catégories du dossier sélectionné

// SYNCHRONISATION
db.ref("products").on("value", (snapshot) => {
    const data = snapshot.val();
    products = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
    updateDatalists();
    renderProducts();
    renderStockTable();
});

db.ref("salesHistory").on("value", (snapshot) => {
    const data = snapshot.val();
    salesHistory = data ? Object.values(data) : [];
    renderHistoryTable();
});

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(el => el.classList.remove('active'));

    document.getElementById(`section-${tabName}`).classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// ALIMENTER LES SUGGESTIONS DANS LE FORMULAIRE DU STOCK
function updateDatalists() {
    const folders = [...new Set(products.map(p => p.folder).filter(Boolean))].sort();
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();

    document.getElementById("folders-list").innerHTML = folders.map(f => `<option value="${f}">`).join("");
    document.getElementById("categories-list").innerHTML = categories.map(c => `<option value="${c}">`).join("");
}

// CREATION DE DOSSIER DEPUIS LA PAGE D'ACCUEIL
function createFolderFromHome() {
    const folderName = prompt("Nom du nouveau dossier (ex: Koch-Chemie, Cartec, Accessoires) :");
    if (folderName && folderName.trim() !== "") {
        currentFolder = folderName.trim();
        currentCategory = null;
        renderProducts();
    }
}

// CREATION DE CATEGORIE DEPUIS L'INTERIEUR D'UN DOSSIER
function createCategoryFromHome() {
    if (!currentFolder) return;
    const catName = prompt(`Nouvelle catégorie dans "${currentFolder}" (ex: Nettoyants, Polissage) :`);
    if (catName && catName.trim() !== "") {
        currentCategory = catName.trim();
        renderProducts();
    }
}

// NAVIGATION RETOUR
function navigateBack() {
    if (currentCategory !== null) {
        currentCategory = null; // Retour aux catégories du dossier
    } else if (currentFolder !== null) {
        currentFolder = null; // Retour à la liste des dossiers
    }
    document.getElementById("search-bar").value = "";
    renderProducts();
}

function handleSearch() {
    const search = document.getElementById("search-bar").value.trim();
    if (search.length > 0) {
        currentFolder = null;
        currentCategory = null;
    }
    renderProducts();
}

// RENDU DU CATALOGUE (3 NIVEAUX)
function renderProducts() {
    const grid = document.getElementById("product-grid");
    const clientType = document.getElementById("select-client").value;
    const search = document.getElementById("search-bar").value.toLowerCase().trim();
    
    const backBtn = document.getElementById("btn-back-nav");
    const addFolderBtn = document.getElementById("btn-add-folder-home");
    const addCatBtn = document.getElementById("btn-add-category-home");
    const titleEl = document.getElementById("current-folder-title");

    grid.innerHTML = "";

    // 1. SI RECHERCHE EN COURS
    if (search.length > 0) {
        backBtn.style.display = "inline-flex";
        addFolderBtn.style.display = "none";
        addCatBtn.style.display = "none";
        titleEl.textContent = `Résultats pour "${search}"`;

        const filtered = products.filter(p => p.name.toLowerCase().includes(search));
        if (filtered.length === 0) {
            grid.innerHTML = `<p class="empty-msg">Aucun produit trouvé.</p>`;
            return;
        }
        filtered.forEach(p => appendProductCard(p, grid, clientType));
        return;
    }

    // 2. NIVEAU 1 : AFFICHAGE DES DOSSIERS
    if (currentFolder === null) {
        backBtn.style.display = "none";
        addFolderBtn.style.display = "inline-flex";
        addCatBtn.style.display = "none";
        titleEl.textContent = "Dossiers disponibles";

        const folders = [...new Set(products.map(p => p.folder || "Divers"))].sort();

        if (folders.length === 0) {
            grid.innerHTML = `<p class="empty-msg">Aucun dossier. Cliquez sur "+ Nouveau Dossier" pour démarrer.</p>`;
            return;
        }

        folders.forEach(folder => {
            const count = products.filter(p => (p.folder || "Divers") === folder).length;
            const card = document.createElement("div");
            card.className = "folder-card";
            card.onclick = () => {
                currentFolder = folder;
                currentCategory = null;
                renderProducts();
            };
            card.innerHTML = `
                <div class="folder-icon">📁</div>
                <div class="folder-name">${folder}</div>
                <div class="folder-count">${count} article(s)</div>
            `;
            grid.appendChild(card);
        });
        return;
    }

    // 3. NIVEAU 2 : AFFICHAGE DES CATEGORIES DANS LE DOSSIER
    if (currentCategory === null) {
        backBtn.style.display = "inline-flex";
        addFolderBtn.style.display = "none";
        addCatBtn.style.display = "inline-flex";
        titleEl.textContent = `Dossier : ${currentFolder} > Catégories`;

        const folderProds = products.filter(p => (p.folder || "Divers") === currentFolder);
        const categories = [...new Set(folderProds.map(p => p.category || "Général"))].sort();

        if (categories.length === 0) {
            grid.innerHTML = `<p class="empty-msg">Ce dossier est vide. Cliquez sur "+ Nouvelle Catégorie" ou affectez des produits dans le stock.</p>`;
            return;
        }

        categories.forEach(cat => {
            const count = folderProds.filter(p => (p.category || "Général") === cat).length;
            const card = document.createElement("div");
            card.className = "category-card";
            card.onclick = () => {
                currentCategory = cat;
                renderProducts();
            };
            card.innerHTML = `
                <div class="folder-icon">🏷️</div>
                <div class="folder-name">${cat}</div>
                <div class="folder-count">${count} article(s)</div>
            `;
            grid.appendChild(card);
        });
        return;
    }

    // 4. NIVEAU 3 : AFFICHAGE DES ARTICLES DE LA CATEGORIE
    backBtn.style.display = "inline-flex";
    addFolderBtn.style.display = "none";
    addCatBtn.style.display = "none";
    titleEl.textContent = `${currentFolder} > ${currentCategory}`;

    const items = products.filter(p => (p.folder || "Divers") === currentFolder && (p.category || "Général") === currentCategory);

    if (items.length === 0) {
        grid.innerHTML = `<p class="empty-msg">Aucun article dans cette catégorie.</p>`;
        return;
    }

    items.forEach(p => appendProductCard(p, grid, clientType));
}

function appendProductCard(p, container, clientType) {
    const price = clientType === "pro" ? p.pricePro : p.pricePart;
    const card = document.createElement("div");
    card.className = "product-card";
    card.onclick = () => addToCart(p.id);

    card.innerHTML = `
        <h4>${p.name}</h4>
        <div class="price">${parseFloat(price).toFixed(2)} €</div>
        <div class="stock">Stock: ${p.stock}</div>
    `;
    container.appendChild(card);
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
                <span class="item-total">${itemTotal.toFixed(2)} €</span>
                <button class="btn-remove" onclick="removeFromCart(${index})">✕</button>
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

// ENREGISTREMENT ET EDITION DANS LE STOCK
function handleAddProduct(e) {
    e.preventDefault();
    const name = document.getElementById("prod-name").value.trim();
    const folder = document.getElementById("prod-folder").value.trim() || "Divers";
    const category = document.getElementById("prod-category").value.trim() || "Général";
    const stock = parseInt(document.getElementById("prod-stock").value);
    const cost = parseFloat(document.getElementById("prod-cost").value);
    const pricePart = parseFloat(document.getElementById("prod-price-part").value);
    const pricePro = parseFloat(document.getElementById("prod-price-pro").value);

    const productData = { name, folder, category, stock, cost, pricePart, pricePro };

    if (editingProductId) {
        db.ref(`products/${editingProductId}`).update(productData);
        editingProductId = null;
    } else {
        db.ref("products").push(productData);
    }

    document.getElementById("add-product-form").reset();
    document.getElementById("submit-btn").textContent = "+ Enregistrer le produit";
    document.getElementById("cancel-edit-btn").style.display = "none";
}

function editProduct(id) {
    const p = products.find(prod => prod.id === id);
    if (!p) return;

    editingProductId = id;
    document.getElementById("prod-name").value = p.name;
    document.getElementById("prod-folder").value = p.folder || "";
    document.getElementById("prod-category").value = p.category || "";
    document.getElementById("prod-stock").value = p.stock;
    document.getElementById("prod-cost").value = p.cost;
    document.getElementById("prod-price-part").value = p.pricePart;
    document.getElementById("prod-price-pro").value = p.pricePro;

    document.getElementById("submit-btn").textContent = "Mettre à jour le produit";
    document.getElementById("cancel-edit-btn").style.display = "inline-block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() {
    editingProductId = null;
    document.getElementById("add-product-form").reset();
    document.getElementById("submit-btn").textContent = "+ Enregistrer le produit";
    document.getElementById("cancel-edit-btn").style.display = "none";
}

function deleteProduct(id) {
    if (confirm("Supprimer définitivement cet article ?")) {
        db.ref(`products/${id}`).remove();
    }
}

function renderStockTable() {
    const tbody = document.getElementById("stock-table-body");
    const search = document.getElementById("search-stock-bar").value.toLowerCase();
    tbody.innerHTML = "";

    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(search) || 
        (p.folder && p.folder.toLowerCase().includes(search)) ||
        (p.category && p.category.toLowerCase().includes(search))
    );

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;">Aucun produit trouvé</td></tr>`;
        return;
    }

    filtered.forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <span class="folder-tag">📁 ${p.folder || 'Divers'}</span><br>
                <small style="color:#8e8e93; margin-top:2px; display:inline-block;">🏷️ ${p.category || 'Général'}</small>
            </td>
            <td><strong>${p.name}</strong></td>
            <td>${parseFloat(p.cost).toFixed(2)} €</td>
            <td>${parseFloat(p.pricePart).toFixed(2)} €</td>
            <td>${parseFloat(p.pricePro).toFixed(2)} €</td>
            <td><strong>${p.stock}</strong></td>
            <td>
                <button class="btn-edit" onclick="editProduct('${p.id}')">✏️ Edit</button>
                <button class="btn-remove" onclick="deleteProduct('${p.id}')">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

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
        report += `[${p.folder || 'Divers'} > ${p.category || 'Général'}] ${p.name} - Stock: ${p.stock} - Part: ${p.pricePart}€ - Pro: ${p.pricePro}€\n`;
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
    if (confirm("ATTENTION : Réinitialiser tout le catalogue et l'historique ?")) {
        db.ref().remove();
    }
}
