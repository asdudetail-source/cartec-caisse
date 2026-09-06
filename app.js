let catalogue = [];
let ticket = [];
let ventes = []; // Stockage de l'historique des ventes

document.addEventListener('DOMContentLoaded', function() {
    chargerDonnees();
    rafraichirTout();

    document.getElementById('form-produit').addEventListener('submit', function(e) {
        e.preventDefault();
        ajouterProduit();
    });

    document.getElementById('select-client').addEventListener('change', rafraichirTout);
    document.getElementById('select-canal').addEventListener('change', rafraichirTout);
    document.getElementById('search-bar').addEventListener('input', filtrerProduits);
    document.getElementById('search-client').addEventListener('input', afficherHistoriqueClients);

    document.getElementById('btn-valider').addEventListener('click', validerVente);
    document.getElementById('btn-export').addEventListener('click', exporterStock);
    document.getElementById('btn-reset').addEventListener('click', reinitialiserTout);
});

function chargerDonnees() {
    const dataStock = localStorage.getItem('cartec_stock_v6');
    if (dataStock) {
        try { catalogue = JSON.parse(dataStock); } catch(e) { catalogue = []; }
    }

    const dataVentes = localStorage.getItem('cartec_ventes_v6');
    if (dataVentes) {
        try { ventes = JSON.parse(dataVentes); } catch(e) { ventes = []; }
    }
}

function sauvegarderDonnees() {
    localStorage.setItem('cartec_stock_v6', JSON.stringify(catalogue));
    localStorage.setItem('cartec_ventes_v6', JSON.stringify(ventes));
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
    if (confirm('Supprimer cet article ?')) {
        catalogue = catalogue.filter(p => p.id !== id);
        sauvegarderDonnees();
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

function validerVente() {
    if (ticket.length === 0) {
        alert('Le ticket est vide.');
        return;
    }

    const nomClient = document.getElementById('client-nom-vente').value.trim() || 'Client Passage / Anonyme';
    const canal = document.getElementById('select-canal').value;
    const typeClient = document.getElementById('select-client').value;

    let totalVente = 0;
    const detailsArticles = ticket.map(item => {
        const p = catalogue.find(prod => prod.id === item.produit.id);
        if (p) p.stock -= item.quantite;
        
        const prixU = obtenirPrixProduit(item.produit);
        totalVente += prixU * item.quantite;

        return {
            nom: item.produit.nom,
            quantite: item.quantite,
            prix_unitaire: prixU,
            total: prixU * item.quantite
        };
    });

    // Sauvegarde dans l'historique
    ventes.push({
        id: Date.now().toString(),
        date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        client: nomClient,
        canal: canal,
        typeClient: typeClient,
        articles: detailsArticles,
        total: totalVente
    });

    sauvegarderDonnees();
    alert('Vente enregistrée avec succès !');
    ticket = [];
    document.getElementById('client-nom-vente').value = '';
    rafraichirTout();
}

function afficherHistoriqueClients() {
    const container = document.getElementById('clients-list');
    container.innerHTML = '';

    const recherche = document.getElementById('search-client').value.toLowerCase();

    // Groupement des ventes par client
    const clientsMap = {};

    ventes.forEach(v => {
        if (!clientsMap[v.client]) {
            clientsMap[v.client] = { totalDepense: 0, ventes: [] };
        }
        clientsMap[v.client].ventes.push(v);
        clientsMap[v.client].totalDepense += v.total;
    });

    const nomClients = Object.keys(clientsMap).filter(c => c.toLowerCase().includes(recherche));

    if (nomClients.length === 0) {
        container.innerHTML = '<p style="color: #8e8e93; text-align: center; padding: 20px;">Aucune vente / client trouvé.</p>';
        return;
    }

    nomClients.forEach(nom => {
        const clientData = clientsMap[nom];
        const clientCard = document.createElement('div');
        clientCard.className = 'client-card';

        let ventesHTML = '';
        clientData.ventes.reverse().forEach(v => {
            const badgeClass = v.canal === 'facture' ? 'badge-facture' : 'badge-black';
            const articlesTxt = v.articles.map(a => `${a.quantite}x ${a.nom} (${a.prix_unitaire.toFixed(2)}€)`).join(', ');

            ventesHTML += `
                <div class="vente-block">
                    <div class="vente-meta">
                        <span>📅 ${v.date}</span>
                        <span class="badge ${badgeClass}">${v.canal.toUpperCase()}</span>
                    </div>
                    <div><b>Articles :</b> ${articlesTxt}</div>
                    <div style="text-align: right; margin-top: 4px; font-weight: bold; color: #007aff;">Total: ${v.total.toFixed(2)} €</div>
                </div>
            `;
        });

        clientCard.innerHTML = `
            <div class="client-header">
                <span>👤 ${nom}</span>
                <span style="color: #34c759;">Total cumulé: ${clientData.totalDepense.toFixed(2)} €</span>
            </div>
            <div>${ventesHTML}</div>
        `;

        container.appendChild(clientCard);
    });
}

function filtrerProduits() {
    const query = document.getElementById('search-bar').value.toLowerCase();
    const listeFiltree = catalogue.filter(p => p.nom.toLowerCase().includes(query));
    afficherCatalogue(listeFiltree);
}

function rafraichirTout() {
    afficherCatalogue(catalogue);
    afficherTicket();
    afficherHistoriqueClients();
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
    if (confirm('Voulez-vous vraiment TOUT réinitialiser (catalogue + historique ventes) ?')) {
        localStorage.removeItem('cartec_stock_v6');
        localStorage.removeItem('cartec_ventes_v6');
        catalogue = [];
        ventes = [];
        ticket = [];
        rafraichirTout();
    }
}
