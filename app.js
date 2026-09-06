let catalogue = [];
let ticket = [];

// Chargement automatique du CSV exporté de Numbers
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
    const headers = lines[0].split(';').length > 1 ? lines[0].split(';') : lines[0].split(',');

    catalogue = lines.slice(1).map(line => {
        const values = line.split(lines[0].includes(';') ? ';' : ',');
        
        // Extraction selon la structure de votre fichier Numbers
        const codeArt = values[0]?.trim();
        const nom = values[1]?.replace(/"/g, '').trim();
        const paNet = parseFloat(values[5]?.replace('€', '').replace(',', '.').trim()) || 0;
        
        return {
            id: codeArt,
            nom: nom,
            pa_net: paNet,
            prix_black: parseFloat(values[9]?.replace(',', '.').trim()) || paNet * 1.3,
            prix_pro_ttc: parseFloat(values[10]?.replace(',', '.').trim()) || paNet * 1.35,
            prix_particulier_ttc: paNet * 1.5
        };
    }).filter(p => p.nom && p.id);
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
    liste.forEach(p => {
        const prix = calculerPrix(p);
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<strong>${p.nom}</strong><br><small>Réf: ${p.id}</small><br><b>${prix.toFixed(2)} €</b>`;
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
                <span>${item.quantite}x ${item.produit.nom}</span>
                <span>${sousTotal.toFixed(2)} €</span>
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

    alert('Vente validée !');
    ticket = [];
    rafraichirTicket();
}

function exporterStockCSV() {
    let csvContent = "data:text/csv;charset=utf-8,id,nom,stock,pa_net,prix_black,prix_pro_ttc\n";
    catalogue.forEach(p => {
        csvContent += `${p.id},${p.nom},${p.stock},${p.pa_net},${p.prix_black},${p.prix_pro_ttc}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "stock_cartec_mis_a_jour.csv");
    document.body.appendChild(link);
    link.click();
}

function filtrerProduits() {
    const q = document.getElementById('search-bar').value.toLowerCase();
    const filtre = catalogue.filter(p => p.nom.toLowerCase().includes(q));
    afficherProduits(filtre);
}
