let catalogue = [];
let ticket = [];

window.onload = function() {
    fetch('produits.csv')
        .then(response => response.text())
        .then(data => {
            parseCSV(data);
            afficherProduits(catalogue);
        });
};

function parseCSV(text) {
    const lines = text.trim().split('\n');
    catalogue = [];

    lines.forEach(line => {
        const cols = line.split(line.includes(';') ? ';' : ',').map(c => c.replace(/"/g, '').trim());
        
        const codeArt = cols[0];
        const nom = cols[1];
        
        if (codeArt && nom && !codeArt.toLowerCase().includes('numéro') && !codeArt.toLowerCase().includes('devis')) {
            const paNet = parseFloat(cols[5]?.replace('€', '').replace(',', '.').trim()) || 0;
            const stock = parseInt(cols[7]) || 1;
            
            catalogue.push({
                id: codeArt,
                nom: nom,
                stock: stock,
                pa_net: paNet,
                prix_black: paNet * 1.3,
                prix_pro_ttc: paNet * 1.35,
                prix_particulier_ttc: paNet * 1.5
            });
        }
    });
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
        grid.innerHTML = '<p style="grid-column: 1/-1; color: red;">Aucun produit chargé.</p>';
        return;
    }

    liste.forEach(p => {
        const prix = calculerPrix(p);
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <strong>${p.nom}</strong><br>
            <small style="color: #666;">Réf: ${p.id} | Stock: ${p.stock}</small><br>
            <b style="color: #007aff; font-size: 16px;">${prix.toFixed(2)} €</b>
        `;
        card.onclick = () => ajouterAuTicket(p);
        grid.appendChild(card);
    });
}

function ajouterAuTicket(produit) {
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
    afficherProduits(catalogue);
}

function validerVente() {
    if (ticket.length === 0) return alert('Le ticket est vide');

    ticket.forEach(item => {
        const p = catalogue.find(prod => prod.id === item.produit.id);
        if (p) p.stock -= item.quantite;
    });

    alert('Vente validée !');
    ticket = [];
    rafraichirTicket();
}

function filtrerProduits() {
    const q = document.getElementById('search-bar').value.toLowerCase();
    const filtre = catalogue.filter(p => p.nom.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
    afficherProduits(filtre);
}
