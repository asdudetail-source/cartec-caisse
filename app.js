let catalogue = [];
let ticket = [];
let historiqueVentes = [];

document.addEventListener('DOMContentLoaded', function() {
    chargerDonnees();
    rafraichirTout();

    // Soumission du formulaire pour ajouter un nouveau produit
    document.getElementById('form-produit').addEventListener('submit', function(e) {
        e.preventDefault();
        ajouterProduit();
    });

    // Changement de type de tarif ou de canal
    document.getElementById('select-client').addEventListener('change', rafraichirTout);
    document.getElementById('select-canal').addEventListener('change', rafraichirTout);
    
    // Filtrage par recherche
    document.getElementById('search-bar').addEventListener('input', rafraichirTout);

    // Boutons de gestion
    document.getElementById('btn-valider').addEventListener('click', validerVente);
    document.getElementById('btn-export').addEventListener('click', exporterStockEtVentes);
    document.getElementById('btn-reset').addEventListener('click', reinitialiserTout);
});

// Charge le stock et l'historique des ventes sauvegardés
function chargerDonnees() {
    const dataStock = localStorage.getItem('cartec_stock_v7');
    if (dataStock) {
        try { catalogue = JSON.parse(dataStock); } catch(e) { catalogue = []; }
    }

    const dataVentes = localStorage.getItem('cartec_ventes_v7');
    if (dataVentes) {
        try { historiqueVentes = JSON.parse(dataVentes); } catch(e) { historiqueVentes = []; }
    }
}

// Sauvegarde l'état actuel
function sauvegarderDonnees() {
    localStorage.setItem('cartec_stock_v7', JSON.stringify(catalogue));
    localStorage.setItem('cartec_ventes_v7', JSON.stringify(historiqueVentes));
}

// Ajoute un nouveau produit au catalogue
function ajouterProduit() {
    const nom = document.getElementById('add-nom').value.trim();
    const stock = parseInt(document.getElementById('add-stock').value) || 0;
    const prixPro = parseFloat(document.getElementById('add-pro').value) || 0;
    const prixParticulier = parseFloat(document.getElementById('add-part').value) || 0;

    if (!nom) return;

    catalogue.push({
        id: Date.now().toString(),
        nom: nom,
        stock: stock,
        prix_pro: prixPro,
        prix_particulier: prixParticulier
    });

    sauvegarderDonnees();
    rafraichirTout();
    document.getElementById('form-produit').reset();
}

// Supprime un produit du catalogue
function supprimerProduit(id, event) {
    event.stopPropagation();
    if (confirm('Supprimer cet article du catalogue ?')) {
        catalogue = catalogue.filter(p => p.id !== id);
        sauvegarderDonnees();
        rafraichirTout();
    }
}

// Récupère le prix selon le type de client sélectionné (Pro ou Particulier)
function obtenirPrixProduit(p) {
    const typeClient = document.getElementById('select-client').value;
    return typeClient === 'pro' ? p.prix_pro : p.prix_particulier;
}

// Affiche la grille des produits
function afficherCatalogue(liste) {
    const grid = document.getElementById('produits-grid');
    grid.innerHTML = '';

    if (liste.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; color: #8e8e93; text-align: center; padding: 20px;">Aucun article dans le catalogue.</p>';
        return;
    }

    liste.forEach(p => {
        const prix = obtenirPrixProduit(p);
        const card = document.createElement('div');
        card.className = 'product-card';
        
        const couleurStock = p.stock <= 1 ? '#ff3b30' : '#8e8e93';

        card.innerHTML = `
            <span class="btn-suppr">&times;</span>
            <span class="product-title">${p.nom}</span>
            <span class="product-stock" style="color: ${couleurStock}">Stock: ${p.stock}</span>
            <div class="product-price">${prix.toFixed(2)} €</div>
        `;

        card.querySelector('.btn-suppr').addEventListener('click', (e) => supprimerProduit(p.id, e));
        card.addEventListener('click', () => ajouterAuTicket(p));

        grid.appendChild(card);
    });
}

// Ajoute un article au ticket de caisse
function ajouterAuTicket(produit) {
    const prodCatalogue = catalogue.find(p => p.id === produit.id);
    if (!prodCatalogue || prodCatalogue.stock <= 0) {
        alert("Stock épuisé !");
        return;
    }

    const existant = ticket.find(item => item.produit.id === produit.id);
    if (existant) {
        if (existant.quantite >= prodCatalogue.stock) {
            alert("Stock insuffisant.");
            return;
        }
        existant.quantite++;
    } else {
        ticket.push({ produit: prodCatalogue, quantite: 1 });
    }

    afficherTicket();
}

// Met à jour l'affichage du ticket et le total
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

// Valide la vente et enregistre la répartition par canal
function validerVente() {
    if (ticket.length === 0) {
        alert('Le ticket est vide.');
        return;
    }

    const canalActuel = document.getElementById('select-canal').value; // 'facture' ou 'black'
    let totalVente = 0;

    // Déduction des stocks et calcul du total de cette vente
    ticket.forEach(item => {
        const prod = catalogue.find(p => p.id === item.produit.id);
        if (prod) {
            prod.stock = Math.max(0, prod.stock - item.quantite);
        }
        const prixU = obtenirPrixProduit(item.produit);
        totalVente += (prixU * item.quantite);
    });

    // Enregistrement de la vente dans l'historique
    historiqueVentes.push({
        date: new Date().toISOString(),
        canal: canalActuel,
        montant: totalVente,
        articles: ticket.map(i => ({ nom: i.produit.nom, qte: i.quantite }))
    });

    sauvegarderDonnees();
    ticket = [];
    
    rafraichirTout();
    alert('Vente validée et enregistrée !');
}

// Centralise le rafraîchissement global
function rafraichirTout() {
    const query = document.getElementById('search-bar').value.toLowerCase().trim();
    const listeAffichee = query 
        ? catalogue.filter(p => p.nom.toLowerCase().includes(query))
        : catalogue;

    afficherCatalogue(listeAffichee);
    afficherTicket();
}

// Exporte le bilan des stocks + le total Vendu en Facturé et en Cash
function exporterStockEtVentes() {
    let totalFacture = 0;
    let totalCash = 0;

    // Calcul des totaux par canal
    historiqueVentes.forEach(v => {
        if (v.canal === 'facture') {
            totalFacture += v.montant;
        } else if (v.canal === 'black') {
            totalCash += v.montant;
        }
    });

    let message = "📊 BILAN DE STOCK & VENTES :\n\n";

    message += "📦 STOCK ACTUEL RESTANT :\n";
    if (catalogue.length === 0) {
        message += "(Catalogue vide)\n";
    } else {
        catalogue.forEach(p => {
            message += `- ${p.nom} : ${p.stock} restant(s)\n`;
        });
    }

    message += "\n💰 TOTAL DES VENTES ENCAISSÉES :\n";
    message += `- Facturé : ${totalFacture.toFixed(2)} €\n`;
    message += `- Cash / Black : ${totalCash.toFixed(2)} €\n`;
    message += `- TOTAL GÉNÉRAL : ${(totalFacture + totalCash).toFixed(2)} €\n`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(message).then(() => {
            alert("Bilan (Stock & Ventes) copié dans le presse-papier !");
        }).catch(() => alert(message));
    } else {
        alert(message);
    }
}

// Réinitialise tout (stock et historique des ventes)
function reinitialiserTout() {
    if (confirm('Voulez-vous vraiment TOUT réinitialiser (catalogue et historique des ventes) ?')) {
        localStorage.removeItem('cartec_stock_v7');
        localStorage.removeItem('cartec_ventes_v7');
        catalogue = [];
        historiqueVentes = [];
        ticket = [];
        rafraichirTout();
    }
}
