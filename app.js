let stock = JSON.parse(localStorage.getItem('cartec_stock')) || [
    { id: 1, name: "Nettoyant Jantes Cartec", pricePart: 18.00, pricePro: 12.00, stock: 10 },
    { id: 2, name: "Shampoing Carosserie", pricePart: 15.00, pricePro: 10.00, stock: 15 }
];

let cart = [];
let salesHistory = JSON.parse(localStorage.getItem('cartec_history')) || [];

function saveData() {
    localStorage.setItem('cartec_stock', JSON.stringify(stock));
    localStorage.setItem('cartec_history', JSON.stringify(salesHistory));
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(el => el.classList.remove('active'));
    
    document.getElementById('section-' + tabName).classList.add('active');
    document.getElementById('tab-' + tabName).classList.add('active');
    
    renderAll();
}

function renderAll() {
    renderProducts();
    renderCart();
    renderStockTable();
    renderHistoryTable();
}

function renderProducts() {
    const grid = document.getElementById('product-grid');
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
        grid.innerHTML += `
            <div class="product-card" onclick="addToCart(${prod.id})">
                <h4>${prod.name}</h4>
                <div class="price">${currentPrice.toFixed(2)} €</div>
                <div class="stock">Stock : ${prod.stock}</div>
            </div>
        `;
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
    saveData();
    clearCart();
    renderAll();
    alert("Vente enregistrée avec succès !");
}

function handleAddProduct(e) {
    e.preventDefault();
    const name = document.getElementById('prod-name').value;
    const stockQty = parseInt(document.getElementById('prod-stock').value);
    const pricePro = parseFloat(document.getElementById('prod-price-pro').value);
    const pricePart = parseFloat(document.getElementById('prod-price-part').value);

    const existingProduct = stock.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existingProduct) {
        existingProduct.stock += stockQty;
        existingProduct.pricePro = pricePro;
        existingProduct.pricePart = pricePart;
    } else {
        stock.push({ id: Date.now(), name, pricePro, pricePart, stock: stockQty });
    }

    saveData();
    e.target.reset();
    renderAll();
    alert("Produit enregistré avec succès !");
}

function deleteProduct(id) {
    stock = stock.filter(p => p.id !== id);
    saveData();
    renderAll();
}

function renderStockTable() {
    const body = document.getElementById('stock-table-body');
    body.innerHTML = '';
    stock.forEach(p => {
        body.innerHTML += `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td>${p.pricePart.toFixed(2)} €</td>
                <td>${p.pricePro.toFixed(2)} €</td>
                <td>${p.stock}</td>
                <td><button class="btn-danger" style="padding: 0.4rem 0.8rem; width: auto; font-size: 0.9rem;" onclick="deleteProduct(${p.id})">Supprimer</button></td>
            </tr>
        `;
    });
}

function renderHistoryTable() {
    const body = document.getElementById('history-table-body');
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
    const dataStr = "BILAN CAISSE CARTEC\n\n--- INVENTAIRE STOCK ---\n" + 
        stock.map(s => `${s.name} - Stock: ${s.stock} (Part: ${s.pricePart}€ / Pro: ${s.pricePro}€)`).join("\n") +
        "\n\n--- HISTORIQUE VENTES ---\n" +
        salesHistory.map(h => `[${h.date}] (${h.canal} - ${h.tarif}) : ${h.items} = ${h.total}€`).join("\n");

    navigator.clipboard.writeText(dataStr);
    alert("Bilan copié dans le presse-papier !");
}

function resetAll() {
    if (confirm("Voulez-vous vraiment TOUT réinitialiser (catalogue et ventes) ?")) {
        stock = [];
        salesHistory = [];
        saveData();
        renderAll();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderAll();
});
