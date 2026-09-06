let catalogue = [];
let ticket = [];

document.addEventListener('DOMContentLoaded', function() {
    chargerStock();
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
    document.getElementById('btn-export').addEventListener('click', exporterStock);
    document.getElementById('btn-reset').addEventListener('click', reinitialiserTout);
});

// Charge le stock sauvegardé dans le navigateur
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

// Sauvegarde l'état actuel du catalogue
function sauvegarderStock() {
    localStorage.setItem('cartec_stock_v6', JSON.stringify(catalogue));
}

// Ajoute un nouveau produit au catalogue
function ajouterProduit() {
    const nom = document.getElementById('add-nom').value.trim();
    const stock = parseInt(document.getElementById('add-stock').value) || 0;
    const prixPro = parseFloat(document.getElementById('add-pro').value) || 0;
    const prixParticulier = parseFloat(document.getElementById('add-part').value) || 0;

    if (!nom) return;

    // Création de l'objet produit
    const nouveauProduit = {
        id: Date.now().toString(),
        nom: nom,
        stock: stock,
        prix_pro: prixPro,
        prix_particulier: prixParticulier
    };

    // Ajout dans le tableau principal
    catalogue.push(nouveauProduit);

    // Sauvegarde et mise à jour de l'affichage
    sauvegarderStock();
    rafraichirTout();

    // Reinitialisation des champs du formulaire
    document.getElementById('form-produit').reset();
}

// Supprime un produit du catalogue
function supprimerProduit(id, event) {
    event.stopPropagation();
    if (confirm('Supprimer cet article du catalogue ?')) {
        catalogue = catalogue.filter(p => p.id !== id);
        sauvegarderStock();
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

// Ajoute un article au ticket de caisse en cours
function ajouterAuTicket(produit) {
    const prodCatalogue = catalogue.find(p => p.id === produit.id);
    if (!prodCatalogue || prodCatalogue.stock <= 0) {
        alert("Stock épuisé !");
        return;
    }

    const existant = ticket.find(item => item.produit.id === produit.id);
    if (existant) {
        if (existant.quantite >= prodCatalogue.stock) {
            alert("Stock suffisant atteint par rapport au stock dispo.");
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

// Valide la vente et déduit le stock du catalogue
function validerVente() {
    if (ticket.length === 0) {
        alert('Le ticket est vide.');
        return;
    }

    // Déduction des quantités vendues directement dans le catalogue
    ticket.forEach(item => {
        const prod = catalogue.find(p => p.id === item.produit.id);
        if (prod) {
            prod.stock = Math.max(0, prod.stock - item.quantite);
        }
    });

    sauvegarderStock();
    ticket = [];
    
    // Rafraîchissement complet
    rafraichirTout();
    alert('Vente enregistrée ! Le stock a été mis à jour.');
}

// Centralise le rafraîchissement global de l'interface
function rafraichirTout() {
    const query = document.getElementById('search-bar').value.toLowerCase().trim();
    const listeAffichee = query 
        ? catalogue.filter(p => p.nom.toLowerCase().includes(query))
        : catalogue;

    afficherCatalogue(listeAffichee);
    afficherTicket();
}

// Exporte le bilan des stocks sous forme de texte à copier
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

// Réinitialise complètement le catalogue
function reinitialiserTout() {
    if (confirm('Voulez-vous vraiment vider tout le catalogue ?')) {
        localStorage.removeItem('cartec_stock_v6');
        catalogue = [];
        ticket = [];
        rafraichirTout();
    }
}
