// Charge le stock sauvegardé dans l'iPad, ou une liste vide
let catalogue = JSON.parse(localStorage.getItem('cartec_stock')) || [];
let ticket = [];

window.onload = function() {
    afficherProduits(catalogue);
};

function ajouterProduitManuel(event) {
    event.preventDefault();
    
    const id = document.getElementById('add-ref').value.trim();
    const nom = document.getElementById('add-nom').value.trim();
    const stock = parseInt(document.getElementById('add-stock').value) || 0;
    const paNet = parseFloat(document.getElementById('add-pa').value) || 0;

    // Calcul automatique des tarifs
    const nouveauProduit = {
        id: id,
        nom: nom,
        stock: stock,
        pa_net: paNet,
        prix_black: paNet * 1.30,       // Marge Black +30%
        prix_pro_ttc: paNet * 1.35,    // Marge Pro +35%
        prix_particulier_ttc: paNet * 1.50 // Marge Particulier +50%
    };

    catalogue.push(nouveauProduit);
    sauvegarderStock();
    afficherProduits(catalogue);
    document.getElementById('form-produit').reset();
}

function sauvegarderStock() {
    localStorage.setItem('cartec_stock', JSON.stringify(catalogue));
}

function supprimerProduit(id, event) {
    event.stopPropagation();
    if (confirm('Supprimer ce produit du catalogue ?')) {
        catalogue = catalogue.filter(p => p.id !== id);
        sauvegarderStock();
        afficherProduits(catalogue);
    }
}

function calculerPrix(p) {
    const client = document.getElementById('select-client').value;
    const canal = document.getElementById('select-canal').value;

    if (canal === 'black') return p.prix_black;
    if (client === 'pro') return p.prix_pro_ttc;
    return p.prix_particulier_ttc;
}

function afficherProduits(liste) {
    const grid = document.getElementById('produits-grid');
    grid.innerHTML = '';

    if (liste.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; color: #999;">Aucun produit enregistré. Utilisez le formulaire à gauche pour en ajouter.</p>';
        return;
    }

    liste.forEach(p => {
        const prix = calculerPrix(p);
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <span class="btn-suppr" onclick="supprimerProduit('${p.id}', event)">×</span>
            <strong>${p.nom}</strong><br>
            <small style="color: #666;">Réf: ${p.id} | Stock: ${p.stock}</small><br>
            <b style="color: #007aff; font-size: 16px;">${prix.toFixed(2)} €</b>
        `;
        card.onclick = () => ajouterAuTicket(p);
        grid.appendChild(card);
    });
}

function ajouterAuTicket(produit) {
    if (produit.stock <= 0) {
        alert("Stock épuisé pour ce produit !");
        return;
    }
    const existant = ticket.find(item => item.produit.id === produit.id);
    if (existant) {
        existant.quantite++;
    } else {
        ticket.push({ produit: produit, quantite: 1 });
    }
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
    alert('Vente effectuée ! Le stock a été décrémenté.');
    ticket = [];
    rafraichirTicket();
    afficherProduits(catalogue);
}

function filtrerProduits() {
    const q = document.getElementById('search-bar').value.toLowerCase();
    const filtre = catalogue.filter(p => p.nom.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
    afficherProduits(filtre);
}

function reinitialiserTout() {
    if (confirm('Attention, cela va effacer TOUS vos produits enregistrés !')) {
        localStorage.removeItem('cartec_stock');
        catalogue = [];
        afficherProduits(catalogue);
    }
}
