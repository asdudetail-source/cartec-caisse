let catalogue = [];
let ticket = [];
let historiqueVentes = [];

document.addEventListener('DOMContentLoaded', function() {
    chargerDonnees();
    rafraichirTout();

    document.getElementById('form-produit').addEventListener('submit', function(e) {
        e.preventDefault();
        ajouterProduit();
    });

    document.getElementById('select-client').addEventListener('change', rafraichirTout);
    document.getElementById('select-canal').addEventListener('change', rafraichirTout);
    document.getElementById('search-bar').addEventListener('input', rafraichirTout);

    document.getElementById('btn-valider').addEventListener('click', validerVente);
    document.getElementById('btn-export').addEventListener('click', exporterStockEtVentes);
    document.getElementById('btn-reset').addEventListener('click', reinitialiserTout);
});

function chargerDonnees() {
    const dataStock = localStorage.getItem('cartec_stock_v9');
    if (dataStock) {
        try { catalogue = JSON.parse(dataStock); } catch(e) { catalogue = []; }
    }

    const dataVentes = localStorage.getItem('cartec_ventes_v9');
    if (dataVentes) {
        try { historiqueVentes = JSON.parse(dataVentes); } catch(e) { historiqueVentes = []; }
    }
}

function sauvegarderDonnees() {
    localStorage.setItem('cartec_stock_v9', JSON.stringify(catalogue));
    localStorage.setItem('cartec_ventes_v9', JSON.stringify(historiqueVentes));
}

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

function supprimerProduit(id, event) {
    event.stopPropagation();
    if (confirm('Supprimer cet article du catalogue ?')) {
        catalogue = catalogue.filter(p => p.id !== id);
        sauvegarderDonnees();
        rafraichirTout();
    }
}

function obtenirPrixProduit(p) {
    const typeClient = document.getElementById('select-client').value;
    return typeClient === 'pro' ? p.prix_pro : p.prix_particulier;
}

function afficherCatalogue(liste) {
    const grid = document.getElementById('produits-grid');
    grid.innerHTML = '';

    if (liste.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; color: #6c757d; text-align: center; padding: 20px;">Aucun article dans le catalogue.</p>';
        return;
    }

    liste.forEach(p => {
        const prix = obtenirPrixProduit(p);
        const card = document.createElement('div');
        card.className = 'product-card';
        const couleurStock = p.stock <= 1 ? '#dc3545' : '#6c757d';

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

function validerVente() {
    if (ticket.length === 0) {
        alert('Le ticket est vide.');
        return;
    }

    const canalActuel = document.getElementById('select-canal').value;
    let totalVente = 0;
    const articlesVendus = [];

    ticket.forEach(item => {
        const prod = catalogue.find(p => p.id === item.produit.id);
        if (prod) {
            prod.stock = Math.max(0, prod.stock - item.quantite);
        }
        const prixU = obtenirPrixProduit(item.produit);
        const sousTotal = prixU * item.quantite;
        totalVente += sousTotal;

        articlesVendus.push({
            nom: item.produit.nom,
            qte: item.quantite,
            prixU: prixU,
            total: sousTotal
        });
    });

    historiqueVentes.unshift({
        id: Date.now(),
        heure: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        canal: canalActuel,
        montant: totalVente,
        articles: articlesVendus
    });

    sauvegarderDonnees();
    ticket = [];
    rafraichirTout();
    alert('Vente validée !');
}

function afficherHistoriqueVentes() {
    const container = document.getElementById('historique-ventes');
    container.innerHTML = '';

    if (historiqueVentes.length === 0) {
        container.innerHTML = '<p style="color: #6c757d; font-size: 13px; text-align: center;">Aucune vente enregistrée.</p>';
        return;
    }

    historiqueVentes.forEach((v, index) => {
        const canalLabel = v.canal === 'facture' ? 'Facturé' : 'Cash / Black';
        const canalClass = v.canal === 'facture' ? 'tag-facture' : 'tag-black';

        let articlesHTML = '';
        v.articles.forEach(a => {
            articlesHTML += `<div>• ${a.qte}x ${a.nom} (${a.total.toFixed(2)} €)</div>`;
        });

        const card = document.createElement('div');
        card.className = 'vente-card';
        card.innerHTML = `
            <div class="vente-header">
                <span><b>Vente #${historiqueVentes.length - index}</b> <small>(${v.heure})</small></span>
                <span class="tag-canal ${canalClass}">${canalLabel}</span>
            </div>
            <div style="margin-top: 4px; font-weight: 700; color: #198754;">
                ${v.montant.toFixed(2)} €
            </div>
            <button class="btn-toggle-ticket" onclick="toggleDetailsTicket(${v.id})">Voir le ticket</button>
            <div id="details-${v.id}" class="ticket-details">
                ${articlesHTML}
            </div>
        `;

        container.appendChild(card);
    });
}

function toggleDetailsTicket(id) {
    const el = document.getElementById(`details-${id}`);
    if (el) {
        el.classList.toggle('active');
    }
}

function rafraichirTout() {
    const query = document.getElementById('search-bar').value.toLowerCase().trim();
    const listeAffichee = query 
        ? catalogue.filter(p => p.nom.toLowerCase().includes(query))
        : catalogue;

    afficherCatalogue(listeAffichee);
    afficherTicket();
    afficherHistoriqueVentes();
}

function exporterStockEtVentes() {
    let totalFacture = 0;
    let totalCash = 0;

    const cumulFacture = {};
    const cumulCash = {};

    historiqueVentes.forEach(v => {
        if (v.canal === 'facture') {
            totalFacture += v.montant;
            v.articles.forEach(a => {
                cumulFacture[a.nom] = (cumulFacture[a.nom] || 0) + a.qte;
            });
        } else {
            totalCash += v.montant;
            v.articles.forEach(a => {
                cumulCash[a.nom] = (cumulCash[a.nom] || 0) + a.qte;
            });
        }
    });

    let message = "📊 BILAN DE STOCK & VENTES :\n\n";

    // 1. Ventes Cash / Black
    message += "🔴 VENTES CASH / BLACK :\n";
    if (Object.keys(cumulCash).length === 0) {
        message += "- Aucune vente\n";
    } else {
        for (const [nom, qte] of Object.entries(cumulCash)) {
            message += `- ${qte}x ${nom}\n`;
        }
    }
    message += `👉 Total Cash : ${totalCash.toFixed(2)} €\n\n`;

    // 2. Ventes Facturées
    message += "🔵 VENTES FACTURÉES :\n";
    if (Object.keys(cumulFacture).length === 0) {
        message += "- Aucune vente\n";
    } else {
        for (const [nom, qte] of Object.entries(cumulFacture)) {
            message += `- ${qte}x ${nom}\n`;
        }
    }
    message += `👉 Total Facturé : ${totalFacture.toFixed(2)} €\n\n`;

    // 3. Total Général
    message += `💰 TOTAL GÉNÉRAL ENCAISSÉ : ${(totalFacture + totalCash).toFixed(2)} €\n\n`;

    // 4. Stock Restant
    message += "📦 STOCK RESTANT EN CATALOGUE :\n";
    if (catalogue.length === 0) {
        message += "(Catalogue vide)\n";
    } else {
        catalogue.forEach(p => {
            message += `- ${p.nom} : ${p.stock} restant(s)\n`;
        });
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(message).then(() => {
            alert("Bilan détaillé copié dans le presse-papier !");
        }).catch(() => alert(message));
    } else {
        alert(message);
    }
}

function reinitialiserTout() {
    if (confirm('Voulez-vous vraiment TOUT réinitialiser (catalogue et historique des ventes) ?')) {
        localStorage.removeItem('cartec_stock_v9');
        localStorage.removeItem('cartec_ventes_v9');
        catalogue = [];
        historiqueVentes = [];
        ticket = [];
        rafraichirTout();
    }
}
