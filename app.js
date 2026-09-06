let stock = JSON.parse(localStorage.getItem('cartec_stock')) || [
    { id: 1, name: "Nettoyant Jantes Cartec", price: 15.00, stock: 10 },
    { id: 2, name: "Shampoing Carosserie", price: 12.50, stock: 15 },
    { id: 3, name: "Microfibre Haute Densité", price: 5.00, stock: 30 }
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
    grid.innerHTML = '';
    stock.forEach(prod => {
        grid.innerHTML += `
            <div class="product-card" onclick="addToCart(${prod.id})">
                <h4>${prod.name}</h4>
                <div class="price">${prod.price.toFixed(2)} €</div>
                <div class="stock">Stock : ${prod.stock}</div>
            </div>
        `;
    });
}

function addToCart(productId) {
    const product = stock.find(p => p.id === productId);
    if (!product || product.stock <= 0) {
        alert("Produit en rupture de stock !");
        return;
    }

    const cartItem = cart.find(item => item.id === productId);
    if (cartItem) {
        if (cartItem.qty < product.stock) {
            cartItem.qty++;
        } else {
            alert("Stock maximum atteint pour cet article !");
        }
    } else {
        cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
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

    cart.forEach(item => {
        const prod = stock.find(p => p.id === item.id);
        if (prod) {
            prod.stock -= item.qty;
        }
    });

    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const saleRecord = {
        date: new Date().toLocaleString('fr-FR'),
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
    const price = parseFloat(document.getElementById('prod-price').value);
    const qty = parseInt(document.getElementById('prod-stock').value);

    const existingProduct = stock.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existingProduct) {
        existingProduct.price = price;
        existingProduct.stock += qty;
    } else {
        stock.push({ id: Date.now(), name, price, stock: qty });
    }

    saveData();
    e.target.reset();
    renderAll();
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
                <td>${p.name}</td>
                <td>${p.price.toFixed(2)} €</td>
                <td>${p.stock}</td>
                <td><button class="btn-danger" style="padding: 0.3rem 0.6rem; width: auto;" onclick="deleteProduct(${p.id})">Supprimer</button></td>
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
                <td>${s.items}</td>
                <td><strong>${s.total} €</strong></td>
            </tr>
        `;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    renderAll();
});
