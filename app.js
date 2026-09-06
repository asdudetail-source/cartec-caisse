let catalogue = [];
let ticket = [];

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    chargerStock();
    rafraichirTout();

    // Ecouteur d'événement sur le formulaire d'ajout
    document.getElementById('form-produit').addEventListener('submit', function(e) {
        e.preventDefault();
        ajouterProduit();
    });

    // Écouteurs sur les sélecteurs
    document.getElementById('select-client').addEventListener('change', rafraichirTout);
    document.getElementById('select-canal').addEventListener('change', rafraichirTout);
    document.getElementById('search-bar').addEventListener('input', filtrerProduits);

    // Écouteurs sur les boutons
    document.getElementById('btn-valider').addEventListener('click', validerVente);
    document.getElementById('btn-export').addEventListener('click', exporterStock);
    document.getElementById('btn-reset').addEventListener('click', reinitialiserTout);
});

function chargerStock() {
    const data = localStorage.getItem('cartec_stock_v6');
    if (data) {
        try {
            catalogue = JSON.parse(data);
        } catch(e) {
            catalogue = [];
        }
    }
}

function sauvegarderStock() {
    localStorage.setItem('cartec_stock_v6', JSON.stringify(catalogue));
}

function ajouterProduit() {
    const nom = document.getElementById('add-nom').value.trim();
    const stock = parseInt(document.getElementById('add-stock').value) || 0;
    const prixPro = parseFloat(document.getElementById('add-pro').value) || 0;
    const prixParticulier = parseFloat(document.getElementById('add-part').value) || 0;

    if (!nom) return;

    const produit = {
        id: Date.now().toString(),
        nom: nom,
        stock: stock,
        prix_pro: prixPro,
        prix_particulier: prixParticulier
    };

    catalogue.push(produit);
    sauvegarderStock();
    rafraichirTout();
    document.getElementById('form-produit').reset();
}

function supprimerProduit(id, event) {
    event.stopPropagation();
    if (confirm('Supprimer cet article ?')) {
        catalogue = catalogue.filter(p => p.id !== id);
        sauvegarderStock();
        rafraichirTout();
    }
}

function obtenirPrixProduit(p) {
    const client = document.getElementById('select-client').value;
    return client === 'pro' ? p.prix_pro : p.prix_particulier;
}

function afficherCatalogue(liste) {
    const grid = document.getElementById('produits-grid');
    grid.innerHTML = '';

    if (liste.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; color: #8e8e93; text-align: center; padding: 20px;">Le catalogue est vide.</p>';
        return;
    }

    liste.forEach(p => {
        const prix = obtenirPrixProduit(p);
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <span class="btn-suppr">×</span>
            <span class="product-title">${p.nom}</span>
            <span class="product-stock" style="color: ${p.stock <= 1 ? '#ff3b30' : '#8e8e93'}">Stock: ${p.stock}</span>
            <div class="product-price">${prix.toFixed(2)} €</div>
        `;

        card.querySelector('.btn-suppr').addEventListener('click', (e) => supprimerProduit(p.id, e));
        card.addEventListener('click', () => ajouterAuTicket(p));

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
    afficherTicket();
}

function afficherTicket() {
    const container = document.getElementById('ticket-items');
    container.innerHTML = '';
    let total = 0;

    ticket.forEach(item => {
        const prixU = obtenirPrixProduit(item.produit);
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

function rafraichirTout() {
    afficherCatalogue(catalogue);
    afficherTicket();
}

function validerVente() {
    if (ticket.length === 0) {
        alert('Le ticket est vide.');
        return;
    }

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
    const query = document.getElementById('search-bar').value.toLowerCase();
    const listeFiltree = catalogue.filter(p => p.nom.toLowerCase().includes(query));
    afficherCatalogue(listeFiltree);
}

function exporterStock() {
    if (catalogue.length === 0) {
        alert("Le catalogue est vide.");
        return;
    }

    let message = "📦 ETAT DU STOCK CARTEC :\n\n";
    catalogue.forEach(p => {
        message += `- ${p.nom} : ${p.stock} restant(s)\n`;
    });

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(message).then(() => {
            alert("Bilan de stock copié dans le presse-papier !");
        }).catch(() => alert(message));
    } else {
        alert(message);
    }
}

function reinitialiserTout() {
    if (confirm('Voulez-vous vraiment vider tout le catalogue ?')) {
        localStorage.removeItem('cartec_stock_v6');
        catalogue = [];
        ticket = [];
        rafraichirTout();
    }
}
