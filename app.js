let catalogue = [];
let ticket = [];
let historiqueVentes = [];

document.addEventListener('DOMContentLoaded', function() {
    chargerDonnees();
    rafraichirTout();

    // 1. Gestion Ouverture/Fermeture Modale Produit
    const modal = document.getElementById('modal-produit');
    const btnOuvrir = document.getElementById('btn-ouvrir-modal');
    const btnFermer = document.getElementById('btn-fermer-modal');

    if (btnOuvrir && modal) {
        btnOuvrir.onclick = function(e) {
            e.preventDefault();
            modal.classList.add('active');
        };
    }

    if (btnFermer && modal) {
        btnFermer.onclick = function(e) {
            e.preventDefault();
            modal.classList.remove('active');
        };
    }

    // 2. Soumission du Formulaire d'ajout
    const formProduit = document.getElementById('form-produit');
    if (formProduit) {
        formProduit.onsubmit = function(e) {
            e.preventDefault();
            ajouterProduit();
            if (modal) modal.classList.remove('active');
        };
    }

    // 3. Changement des filtres & barre de recherche
    const selectClient = document.getElementById('select-client');
    if (selectClient) selectClient.onchange = rafraichirTout;

    const selectCanal = document.getElementById('select-canal');
    if (selectCanal) selectCanal.onchange = rafraichirTout;

    const searchBar = document.getElementById('search-bar');
    if (searchBar) searchBar.oninput = rafraichirTout;

    // 4. Boutons d'action
    const btnValider = document.getElementById('btn-valider');
    if (btnValider) btnValider.onclick = validerVente;

    const btnExport = document.getElementById('btn-export');
    if (btnExport) btnExport.onclick = exporterStockEtVentes;

    const btnReset = document.getElementById('btn-reset');
    if (btnReset) btnReset.onclick = reinitialiserTout;
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
    const elNom = document.getElementById('add-nom');
    const elStock = document.getElementById('add-stock');
    const elPro = document.getElementById('add-pro');
    const elPart = document.getElementById('add-part');

    if (!elNom) return;

    const nom = elNom.value.trim();
    const stock = parseInt(elStock ? elStock.value : 0) || 0;
    const prixPro = parseFloat(elPro ? elPro.value : 0) || 0;
    const prixParticulier = parseFloat(elPart ? elPart.value : 0) || 0;

    if (!nom) {
        alert("Veuillez saisir un nom d'article.");
        return;
    }

    const nouveauProduit = {
        id: Date.now().toString(),
        nom: nom,
        stock: stock,
        prix_pro: prixPro,
        prix_particulier: prixParticulier
    };

    catalogue.push(nouveauProduit);
    sauvegarderDonnees();
    rafraichirTout();

    document.getElementById('form-produit').reset();
}

function obtenirPrixProduit(p) {
    const selectClient = document.getElementById('select-client');
    const typeClient = selectClient ? selectClient.value : 'particulier';
    return typeClient === 'pro' ? p.prix_pro : p.prix_particulier;
}

function afficherCatalogue(liste) {
    const grid = document.getElementById('produits-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (liste.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; color: var(--text-secondary); text-align: center; padding: 20px;">Aucun article dans le catalogue.</p>';
        return;
    }

    liste.forEach(p => {
        const prix = obtenirPrixProduit(p);
        const card = document.createElement('div');
        card.className = 'product-card';

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

        let longPressTimer = null;
        let isLongPress = false;

        const startPress = () => {
            isLongPress = false;
            longPressTimer = setTimeout(() => {
                isLongPress = true;
                ouvrirMenuOptionProduit(p);
            }, 600);
        };

        const cancelPress = () => {
            if (longPressTimer) clearTimeout(longPressTimer);
        };

        card.addEventListener('mousedown', startPress);
        card.addEventListener('touchstart', startPress, { passive: true });

        card.addEventListener('mouseup', cancelPress);
        card.addEventListener('mouseleave', cancelPress);
        card.addEventListener('touchend', (e) => {
            cancelPress();
            if (!isLongPress) {
                e.preventDefault();
                ajouterAuTicket(p);
            }
        });

        card.addEventListener('click', () => {
            if (!isLongPress) {
                ajouterAuTicket(p);
            }
        });

        grid.appendChild(card);
    });
}

function ouvrirMenuOptionProduit(produit) {
    const choix = confirm(`Gestion de "${produit.nom}" :\n\n- [OK] pour MODIFIER LE STOCK\n- [Annuler] pour SUPPRIMER L'ARTICLE`);
    
    if (choix) {
        const nouveauStock = prompt(`Nouveau stock pour "${produit.nom}" :`, produit.stock);
        if (nouveauStock !== null) {
            const stockInt = parseInt(nouveauStock);
            if (!isNaN(stockInt) && stockInt >= 0) {
                produit.stock = stockInt;
                sauvegarderDonnees();
                rafraichirTout();
            }
        }
    } else {
        if (confirm(`Voulez-vous vraiment supprimer "${produit.nom}" ?`)) {
            catalogue = catalogue.filter(p => p.id !== produit.id);
            sauvegarderDonnees();
            rafraichirTout();
        }
    }
}

function ajouterAuTicket(produit) {
    const prodCatalogue = catalogue.find(p => p.id === produit.id);
    if (!prodCatalogue || prodCatalogue.stock <= 0) {
        alert("Stock épuisé.");
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
    if (!container) return;

    container.innerHTML = '';
    let total = 0;

    ticket.forEach(item => {
        const prixU = obtenirPrixProduit(item.produit);
        const sousTotal = prixU * item.quantite;
        total += sousTotal;

        const div = document.createElement('div');
        div.className = 'ticket-item';
        div.innerHTML = `
            <span><b>${item.quantite}x</b> ${item.produit.nom}</span>
            <span><b>${sousTotal.toFixed(2)} €</b></span>
        `;
        container.appendChild(div);
    });

    const totalEl = document.getElementById('total-amount');
    if (totalEl) totalEl.innerText = total.toFixed(2) + ' €';
}

function validerVente() {
    if (ticket.length === 0) {
        alert('Le ticket est vide.');
        return;
    }

    const selectCanal = document.getElementById('select-canal');
    const canalActuel = selectCanal ? selectCanal.value : 'black';

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
    alert("Vente validée !");
}

function afficherHistoriqueVentes() {
    const container = document.getElementById('historique-ventes');
    if (!container) return;

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
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span><b>Vente #${historiqueVentes.length - index}</b> <small>(${v.heure})</small></span>
                <span class="tag-canal ${canalClass}">${canalLabel}</span>
            </div>
            <div style="margin-top: 6px; font-weight: 700; color: var(--accent-green);">
                ${v.montant.toFixed(2)} €
            </div>
            <button onclick="toggleDetailsTicket(${v.id})" style="margin-top: 8px; background: none; border: none; color: var(--accent-blue); padding: 0; font-size: 12px; cursor: pointer;">Voir le détail</button>
            <div id="details-${v.id}" style="display: none; margin-top: 8px; font-size: 12px; color: var(--text-secondary);">${articlesHTML}</div>
        `;

        container.appendChild(card);
    });
}

window.toggleDetailsTicket = function(id) {
    const el = document.getElementById(`details-${id}`);
    if (el) {
        el.style.display = (el.style.display === 'none' || !el.style.display) ? 'block' : 'none';
    }
};

function rafraichirTout() {
    const searchBar = document.getElementById('search-bar');
    const query = searchBar ? searchBar.value.toLowerCase().trim() : '';

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
