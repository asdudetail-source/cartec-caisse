let catalogue = [];
let ticket = [];
let historiqueVentes = [];

document.addEventListener('DOMContentLoaded', function() {
    chargerDonnees();
    rafraichirTout();

    // Gestion du Modal
    const modal = document.getElementById('modal-produit');
    document.getElementById('btn-ouvrir-modal').addEventListener('click', () => modal.classList.add('active'));
    document.getElementById('btn-fermer-modal').addEventListener('click', () => modal.classList.remove('active'));

    document.getElementById('form-produit').addEventListener('submit', function(e) {
        e.preventDefault();
        ajouterProduit();
        modal.classList.remove('active');
    });

    document.getElementById('select-client').addEventListener('change', rafraichirTout);
    document.getElementById('select-canal').addEventListener('change', rafraichirTout);
    document.getElementById('search-bar').addEventListener('input', rafraichirTout);

    document.getElementById('btn-valider').addEventListener('click', validerVente);
    document.getElementById('btn-export').addEventListener('click', exporterStockEtVentes);
    document.getElementById('btn-reset').addEventListener('click', reinitialiserTout);
});

function chargerDonnees() {
    const dataStock = localStorage.getItem('cartec_stock_v11');
    if (dataStock) {
        try { catalogue = JSON.parse(dataStock); } catch(e) { catalogue = []; }
    }

    const dataVentes = localStorage.getItem('cartec_ventes_v11');
    if (dataVentes) {
        try { historiqueVentes = JSON.parse(dataVentes); } catch(e) { historiqueVentes = []; }
    }
}

function sauvegarderDonnees() {
    localStorage.setItem('cartec_stock_v11', JSON.stringify(catalogue));
    localStorage.setItem('cartec_ventes_v11', JSON.stringify(historiqueVentes));
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

function obtenirPrixProduit(p) {
    const typeClient = document.getElementById('select-client').value;
    return typeClient === 'pro' ? p.prix_pro : p.prix_particulier;
}

function afficherCatalogue(liste) {
    const grid = document.getElementById('produits-grid');
    grid.innerHTML = '';

    if (liste.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; color: var(--text-secondary); text-align: center; padding: 20px;">Aucun article disponible.</p>';
        return;
    }

    liste.forEach(p => {
        const prix = obtenirPrixProduit(p);
        const card = document.createElement('div');
        card.className = 'product-card';

        // Badge Stock Couleur Dynamique
        let badgeClass = 'stock-high';
        if (p.stock === 0) badgeClass = 'stock-out';
        else if (p.stock <= 3) badgeClass = 'stock-low';

        card.innerHTML = `
            <div>
                <span class="product-title">${p.nom}</span>
                <span class="product-badge-stock ${badgeClass}">Stock: ${p.stock}</span>
            </div>
            <div class="product-price">${prix.toFixed(2)} €</div>
        `;

        // Appui long & Clics
        let timerAppuiLong = null;
        let estAppuiLong = false;

        const demarrerAppuiLong = () => {
            estAppuiLong = false;
            timerAppuiLong = setTimeout(() => {
                estAppuiLong = true;
                ouvrirMenuOptionProduit(p);
            }, 500);
        };

        const annulerAppuiLong = () => clearTimeout(timerAppuiLong);

        card.addEventListener('touchstart', demarrerAppuiLong, { passive: true });
        card.addEventListener('touchend', () => {
            annulerAppuiLong();
            if (!estAppuiLong) ajouterAuTicket(p);
        });

        card.addEventListener('mousedown', demarrerAppuiLong);
        card.addEventListener('mouseup', annulerAppuiLong);
        card.addEventListener('click', (e) => {
            if (!estAppuiLong && e.pointerType === 'mouse') ajouterAuTicket(p);
        });

        grid.appendChild(card);
    });
}

function ouvrirMenuOptionProduit(produit) {
    const choix = confirm(`Gestion de "${produit.nom}" :\n\n- [OK] pour MODIFIER LE STOCK\n- [Annuler] pour SUPPRIMER L'ARTICLE`);
    
    if (choix) {
        const nouveauStock = prompt(`Ajuster le stock pour "${produit.nom}" :`, produit.stock);
        if (nouveauStock !== null) {
            const stockInt = parseInt(nouveauStock);
            if (!isNaN(stockInt) && stockInt >= 0) {
                produit.stock = stockInt;
                sauvegarderDonnees();
                rafraichirTout();
            }
        }
    } else {
        if (confirm(`Confirmer la SUPPRESSION définitive de "${produit.nom}" ?`)) {
            catalogue = catalogue.filter(p => p.id !== produit.id);
            sauvegarderDonnees();
            rafraichirTout();
        }
    }
}

function ajouterAuTicket(produit) {
    const prodCatalogue = catalogue.find(p => p.id === produit.id);
    if (!prodCatalogue || prodCatalogue.stock <= 0) {
        alert("Cet article est en rupture de stock.");
        return;
    }

    const existant = ticket.find(item => item.produit.id === produit.id);
    if (existant) {
        if (existant.quantite >= prodCatalogue.stock) {
            alert("Stock maximum atteint dans le ticket.");
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
        if (prod) prod.stock = Math.max(0, prod.stock - item.quantite);
        const prixU = obtenirPrixProduit(item.produit);
        const sousTotal = prixU * item.quantite;
        totalVente += sousTotal;

        articlesVendus.push({ nom: item.produit.nom, qte: item.quantite, prixU: prixU, total: sousTotal });
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
}

function afficherHistoriqueVentes() {
    const container = document.getElementById('historique-ventes');
    container.innerHTML = '';

    if (historiqueVentes.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); font-size: 13px; text-align: center;">Aucune vente enregistrée.</p>';
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
            <div style="margin-top: 6px; font-weight: 700; color: var(--success-color);">
                ${v.montant.toFixed(2)} €
            </div>
            <button class="btn-toggle-ticket" onclick="toggleDetailsTicket(${v.id})">Voir le détail</button>
            <div id="details-${v.id}" class="ticket-details">${articlesHTML}</div>
        `;

        container.appendChild(card);
    });
}

function toggleDetailsTicket(id) {
    const el = document.getElementById(`details-${id}`);
    if (el) el.classList.toggle('active');
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
            v.articles.forEach(a => cumulFacture[a.nom] = (cumulFacture[a.nom] || 0) + a.qte);
        } else {
            totalCash += v.montant;
            v.articles.forEach(a => cumulCash[a.nom] = (cumulCash[a.nom] || 0) + a.qte);
        }
    });

    let message = "📊 BILAN DE STOCK & VENTES :\n\n";

    message += "🔴 VENTES CASH / BLACK :\n";
    if (Object.keys(cumulCash).length === 0) message += "- Aucune vente\n";
    else for (const [nom, qte] of Object.entries(cumulCash)) message += `- ${qte}x ${nom}\n`;
    message += `👉 Total Cash : ${totalCash.toFixed(2)} €\n\n`;

    message += "🔵 VENTES FACTURÉES :\n";
    if (Object.keys(cumulFacture).length === 0) message += "- Aucune vente\n";
    else for (const [nom, qte] of Object.entries(cumulFacture)) message += `- ${qte}x ${nom}\n`;
    message += `👉 Total Facturé : ${totalFacture.toFixed(2)} €\n\n`;

    message += `💰 TOTAL GÉNÉRAL ENCAISSÉ : ${(totalFacture + totalCash).toFixed(2)} €\n\n`;

    message += "📦 STOCK RESTANT EN CATALOGUE :\n";
    if (catalogue.length === 0) message += "(Catalogue vide)\n";
    else catalogue.forEach(p => message += `- ${p.nom} : ${p.stock} restant(s)\n`);

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(message).then(() => alert("Bilan copié !")).catch(() => alert(message));
    } else {
        alert(message);
    }
}

function reinitialiserTout() {
    if (confirm('Voulez-vous vraiment réinitialiser le catalogue et les ventes ?')) {
        localStorage.removeItem('cartec_stock_v11');
        localStorage.removeItem('cartec_ventes_v11');
        catalogue = [];
        historiqueVentes = [];
        ticket = [];
        rafraichirTout();
    }
}
