// Forcer le vidage du cache corrompu
localStorage.clear();

let catalogue = JSON.parse(localStorage.getItem('cartec_stock_v3')) || [];
let ticket = [];

window.onload = function() {
    afficherProduits(catalogue);
};

function ajouterProduitManuel(event) {
    event.preventDefault();
    
    const nom = document.getElementById('add-nom').value.trim();
    const stock = parseInt(document.getElementById('add-stock').value) || 0;
    const prixPro = parseFloat(document.getElementById('add-pro').value) || 0;
    const prixParticulier = parseFloat(document.getElementById('add-part').value) || 0;

    const nouveauProduit = {
        id: Date.now().toString(),
        nom: nom,
        stock: stock,
        prix_pro: prixPro,
        prix_particulier: prixParticulier
    };

    catalogue.push(nouveauProduit);
    sauvegarderStock();
    afficherProduits(catalogue);
    document.getElementById('form-produit').reset();
}

function sauvegarderStock() {
    localStorage.setItem('cartec_stock_v3', JSON.stringify(catalogue));
}

function supprimerProduit(id, event) {
    event.stopPropagation();
    if (confirm('Supprimer cet article ?')) {
        catalogue = catalogue.filter(p => p.id !== id);
        sauvegarderStock();
        afficherProduits(catalogue);
    }
}

function calculerPrix(p) {
    const client = document.getElementById('select-client').value;
    const canal = document.getElementById('select-canal').value;

    if (canal === 'black') {
        return p.prix_pro;
    }
    return client === 'pro' ? p.prix_pro : p.prix_particulier;
}

function afficherProduits(liste) {
    const grid = document.getElementById('produits-grid');
    grid.innerHTML = '';

    if (liste.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; color: #8e8e93; text-align: center; padding: 30px;">Le catalogue est totalement vide.<br>Ajoutez vos articles à gauche.</p>';
        return;
    }

    liste.forEach(p => {
        const prix = calculerPrix(p);
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <span class="btn-suppr" onclick="supprimerProduit('${p.id}', event)">×</span>
            <span class="product-title">${p.nom}</span>
            <span class="product-stock" style="color: ${p.stock <= 1 ? '#ff3b30' : '#8e8e93'}">Stock: ${p.stock}</span>
            <div class="product-price">${prix.toFixed(2)} €</div>
        `;
        card.onclick = () => ajouterAuTicket(p);
        grid.appendChild(card);
    });
}

function ajouterAuTicket(produit) {
    if (produit.stock <= 0) {
        alert("Stock épuisé !");
        return;
    }
    const existant = ticket.find(item => item.produit.id === produit.id);
    if (existant) {
        if (existant.quantite >= produit.stock) {
            alert("Stock insuffisant.");
            return;
        }
        existant.quantite++;
    } else {
        ticket.push({ produit: produit, quantite: 1 });
    }
    rafraichirTicket();
}

function rafraichirTout() {
    afficherProduits(catalogue);
    rafraichirTicket();
}

function rafraichirTicket() {
    const container = document.getElementById('ticket-items');
    container.innerHTML = '';
    let total = 0;

    ticket.forEach(item => {
        const prixU = calculerPrix(item.produit);
        const sousTotal = prixU * item.quantite;
        total += sousTotal;

        container.innerHTML += `
            <div class="ticket-item">
                <span><b>${item.quantite}x</b> ${item.produit.nom}</span>
                <span><b>${sousTotal.toFixed(2)} €</b></span>
            </div>`;
    });

    document.getElementById('total-amount').innerText = total.toFixed(2) + ' €';
}

function validerVente() {
    if (ticket.length === 0) return alert('Le ticket est vide');

    ticket.forEach(item => {
        const p = catalogue.find(prod => prod.id === item.produit.id);
        if (p) p.stock -= item.quantite;
    });

    sauvegarderStock();
    alert('Vente effectuée !');
    ticket = [];
    rafraichirTout();
}

function filtrerProduits() {
    const q = document.getElementById('search-bar').value.toLowerCase();
    const filtre = catalogue.filter(p => p.nom.toLowerCase().includes(q));
    afficherProduits(filtre);
}

function exporterStockRepresentant() {
    if (catalogue.length === 0) {
        alert("Le catalogue est vide.");
        return;
    }

    let message = "📦 ETAT DU STOCK CARTEC :\n\n";
    catalogue.forEach(p => {
        message += `- ${p.nom} : ${p.stock} restant(s)\n`;
    });

    navigator.clipboard.writeText(message).then(() => {
        alert("Bilan de stock copié ! Vous pouvez le coller directement dans votre message pour le représentant.");
    }).catch(() => {
        alert(message);
    });
}

function reinitialiserTout() {
    if (confirm('Vider complètement le catalogue ?')) {
        localStorage.clear();
        catalogue = [];
        ticket = [];
        rafraichirTout();
    }
}
