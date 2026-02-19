// Invoice Generator Web - Main App Logic (Simplified)

const API = {
    save: (key, data) => localStorage.setItem(key, JSON.stringify(data)),
    get: (key, def) => JSON.parse(localStorage.getItem(key) || def)
};

let invoices = API.get('invoices', '[]');
let settings = API.get('settings', '{}');
let currentInvoice = null;

// DOM Elements
const dom = {
    pages: {
        invoices: document.getElementById('page-invoices'),
        create: document.getElementById('page-create'),
        settings: document.getElementById('page-settings')
    },
    nav: document.querySelectorAll('.nav-item'),
    lineItemsContainer: document.getElementById('lineItems'),
    invoiceForm: document.getElementById('invoice-form'),
    settingsForm: document.getElementById('settings-form'),
    invoicesList: document.getElementById('invoices-list'),
    emptyInvoices: document.getElementById('empty-invoices'),
    subtotal: document.getElementById('subtotal'),
    vat: document.getElementById('vat'),
    total: document.getElementById('total'),
    vatRow: document.getElementById('vatRow'),
    isVATRegistered: document.getElementById('isVATRegistered'),
    toast: document.getElementById('toast'),
    modal: document.getElementById('invoiceModal'),
    invoiceDetail: document.getElementById('invoiceDetail')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupForms();
    addLineItem(); // Add first item by default
    renderInvoices();
    loadSettings();
});

// Navigation
function setupNavigation() {
    dom.nav.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            dom.nav.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            Object.values(dom.pages).forEach(page => page.classList.remove('active'));
            dom.pages[tab].classList.add('active');
        });
    });
}

// Forms
function setupForms() {
    // Invoice form
    dom.invoiceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveInvoice();
    });
    
    // Add item button
    document.getElementById('addItemBtn').addEventListener('click', addLineItem);
    
    // VAT toggle
    dom.isVATRegistered.addEventListener('change', calculateTotals);
    document.getElementById('vatRate').addEventListener('change', calculateTotals);
    
    // Settings form
    dom.settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveSettings();
    });
    
    // Modal
    document.getElementById('closeModal').addEventListener('click', () => {
        dom.modal.classList.remove('active');
    });
    document.getElementById('downloadPDF').addEventListener('click', downloadPDF);
    document.getElementById('shareInvoice').addEventListener('click', shareInvoice);
}

// Line Items
function addLineItem() {
    const container = dom.lineItemsContainer;
    const index = container.children.length;
    
    const div = document.createElement('div');
    div.className = 'line-item';
    div.innerHTML = `
        <div class="line-item-header">
            <input type="text" placeholder="Item description" class="item-desc">
            <button type="button" class="remove-btn">&times;</button>
        </div>
        <div class="line-item-row">
            <input type="number" placeholder="Qty" value="1" min="1" class="item-qty">
            <input type="number" placeholder="Price" value="0" min="0" step="0.01" class="item-price">
            <span class="item-total">£0.00</span>
        </div>
    `;
    
    // Remove button
    div.querySelector('.remove-btn').addEventListener('click', () => {
        if (container.children.length > 1) {
            div.remove();
            calculateTotals();
        }
    });
    
    // Input listeners
    div.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', calculateTotals);
    });
    
    container.appendChild(div);
    calculateTotals();
}

function getLineItems() {
    const items = [];
    const descInputs = dom.lineItemsContainer.querySelectorAll('.item-desc');
    
    descInputs.forEach((descInput, idx) => {
        const row = descInput.closest('.line-item');
        const qtyInput = row.querySelector('.item-qty');
        const priceInput = row.querySelector('.item-price');
        
        const desc = descInput.value.trim();
        const qty = parseFloat(qtyInput.value) || 1;
        const price = parseFloat(priceInput.value) || 0;
        
        if (desc) {
            items.push({ description: desc, quantity: qty, unitPrice: price });
        }
    });
    
    return items;
}

function calculateTotals() {
    const items = getLineItems();
    let subtotal = 0;
    
    dom.lineItemsContainer.querySelectorAll('.line-item').forEach((row, idx) => {
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const itemTotal = qty * price;
        subtotal += itemTotal;
        row.querySelector('.item-total').textContent = formatCurrency(itemTotal);
    });
    
    const isVAT = dom.isVATRegistered.checked;
    const vatRate = parseFloat(document.getElementById('vatRate').value);
    const vat = isVAT ? subtotal * vatRate : 0;
    const total = subtotal + vat;
    
    dom.subtotal.textContent = formatCurrency(subtotal);
    dom.vat.textContent = formatCurrency(vat);
    dom.total.textContent = formatCurrency(total);
    dom.vatRow.style.display = isVAT ? 'flex' : 'none';
}

// Save Invoice
function saveInvoice() {
    const items = getLineItems();
    
    if (items.length === 0) {
        showToast('Please enter at least one item description');
        return;
    }
    
    const clientName = document.getElementById('clientName').value.trim();
    const clientEmail = document.getElementById('clientEmail').value.trim();
    
    if (!clientName || !clientEmail) {
        showToast('Please fill in client name and email');
        return;
    }
    
    const isVAT = dom.isVATRegistered.checked;
    const vatRate = parseFloat(document.getElementById('vatRate').value);
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const vat = isVAT ? subtotal * vatRate : 0;
    
    const invoice = {
        id: Date.now().toString(),
        invoiceNumber: generateInvoiceNumber(),
        clientName: clientName,
        clientCompany: document.getElementById('clientCompany').value.trim(),
        clientEmail: clientEmail,
        clientAddress: document.getElementById('clientAddress').value.trim(),
        lineItems: items,
        isVATRegistered: isVAT,
        vatRate: vatRate,
        subtotal: subtotal,
        vat: vat,
        total: subtotal + vat,
        notes: document.getElementById('notes').value.trim(),
        status: 'sent',
        createdAt: new Date().toISOString()
    };
    
    invoices.unshift(invoice);
    API.save('invoices', invoices);
    
    // Reset form
    dom.invoiceForm.reset();
    dom.lineItemsContainer.innerHTML = '';
    addLineItem();
    
    showToast('Invoice saved!');
    renderInvoices();
    switchTab('invoices');
}

// Settings
function saveSettings() {
    const fields = ['businessName', 'businessAddress', 'businessEmail', 'businessPhone',
                   'vatNumber', 'companiesHouse', 'sortCode', 'accountNumber', 'accountName', 'bankName'];
    
    fields.forEach(field => {
        const el = document.getElementById(field);
        if (el) settings[field] = el.value;
    });
    
    API.save('settings', settings);
    showToast('Settings saved!');
}

function loadSettings() {
    const fields = ['businessName', 'businessAddress', 'businessEmail', 'businessPhone',
                   'vatNumber', 'companiesHouse', 'sortCode', 'accountNumber', 'accountName', 'bankName'];
    
    fields.forEach(field => {
        const el = document.getElementById(field);
        if (el && settings[field]) el.value = settings[field];
    });
}

// Render Invoices
function renderInvoices() {
    if (invoices.length === 0) {
        dom.invoicesList.innerHTML = '';
        dom.invoicesList.appendChild(dom.emptyInvoices);
        dom.emptyInvoices.style.display = 'flex';
        return;
    }
    
    dom.invoicesList.innerHTML = invoices.map(inv => `
        <div class="invoice-card" onclick="viewInvoice('${inv.id}')">
            <div class="invoice-card-header">
                <h3>${escapeHtml(inv.invoiceNumber)}</h3>
                <span class="amount">${formatCurrency(inv.total)}</span>
            </div>
            <div class="invoice-card-footer">
                <span class="client">${escapeHtml(inv.clientName)}</span>
                <span class="status-badge status-${inv.status}">${inv.status}</span>
            </div>
        </div>
    `).join('');
}

// View Invoice
function viewInvoice(id) {
    const invoice = invoices.find(inv => inv.id === id);
    if (!invoice) return;
    
    currentInvoice = invoice;
    
    dom.invoiceDetail.innerHTML = `
        <div class="invoice-detail-header">
            <h3>${escapeHtml(invoice.invoiceNumber)}</h3>
            <div class="invoice-detail-meta">
                <p>Date: ${formatDate(invoice.createdAt)}</p>
                <p>Status: <span class="status-badge status-${invoice.status}">${invoice.status}</span></p>
            </div>
        </div>
        
        <div class="invoice-detail-section">
            <h4>FROM</h4>
            <p><strong>${escapeHtml(settings.businessName || 'Your Business')}</strong></p>
            ${settings.businessAddress ? `<p>${escapeHtml(settings.businessAddress)}</p>` : ''}
            ${settings.vatNumber ? `<p>VAT: ${escapeHtml(settings.vatNumber)}</p>` : ''}
        </div>
        
        <div class="invoice-detail-section">
            <h4>BILL TO</h4>
            <p><strong>${escapeHtml(invoice.clientName)}</strong></p>
            ${invoice.clientCompany ? `<p>${escapeHtml(invoice.clientCompany)}</p>` : ''}
            <p>${escapeHtml(invoice.clientEmail)}</p>
            ${invoice.clientAddress ? `<p>${escapeHtml(invoice.clientAddress)}</p>` : ''}
        </div>
        
        <div class="invoice-detail-section">
            <h4>ITEMS</h4>
            <table class="invoice-detail-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoice.lineItems.map(item => `
                        <tr>
                            <td>${escapeHtml(item.description)}</td>
                            <td>${item.quantity}</td>
                            <td>${formatCurrency(item.unitPrice)}</td>
                            <td>${formatCurrency(item.quantity * item.unitPrice)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="invoice-detail-totals">
                <div class="row">
                    <span>Subtotal</span>
                    <span>${formatCurrency(invoice.subtotal)}</span>
                </div>
                ${invoice.isVATRegistered ? `
                <div class="row">
                    <span>VAT (${(invoice.vatRate * 100).toFixed(0)}%)</span>
                    <span>${formatCurrency(invoice.vat)}</span>
                </div>
                ` : ''}
                <div class="row total">
                    <span>TOTAL</span>
                    <span>${formatCurrency(invoice.total)}</span>
                </div>
            </div>
        </div>
        
        ${invoice.notes ? `
        <div class="invoice-detail-section">
            <h4>NOTES</h4>
            <p>${escapeHtml(invoice.notes)}</p>
        </div>
        ` : ''}
        
        ${settings.sortCode && settings.accountNumber ? `
        <div class="invoice-detail-section">
            <h4>PAYMENT DETAILS</h4>
            <p>Sort Code: ${escapeHtml(settings.sortCode)}</p>
            <p>Account: ${escapeHtml(settings.accountNumber)}</p>
            ${settings.accountName ? `<p>Account Name: ${escapeHtml(settings.accountName)}</p>` : ''}
        </div>
        ` : ''}
    `;
    
    dom.modal.classList.add('active');
}

// PDF
function downloadPDF() {
    if (!currentInvoice || typeof jspdf === 'undefined') {
        showToast('PDF not available');
        return;
    }
    
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    const pageWidth = 210;
    const margin = 20;
    let y = margin;
    
    // Header
    doc.setFontSize(24);
    doc.setTextColor(37, 99, 235);
    doc.text('INVOICE', margin, y);
    y += 15;
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Invoice #: ${currentInvoice.invoiceNumber}`, margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Date: ${formatDate(currentInvoice.createdAt)}`, margin, y);
    
    // From
    y += 20;
    doc.setTextColor(100);
    doc.setFontSize(8);
    doc.text('FROM', margin, y);
    y += 6;
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text(settings.businessName || 'Your Business', margin, y);
    y += 6;
    if (settings.businessAddress) {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(settings.businessAddress, margin, y);
        y += 6;
    }
    
    // Bill To
    y += 10;
    doc.setTextColor(100);
    doc.setFontSize(8);
    doc.text('BILL TO', margin, y);
    y += 6;
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text(currentInvoice.clientName, margin, y);
    y += 6;
    if (currentInvoice.clientCompany) {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(currentInvoice.clientCompany, margin, y);
        y += 6;
    }
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(currentInvoice.clientEmail, margin, y);
    y += 15;
    
    // Table
    const tableTop = y;
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, tableTop, pageWidth - 2 * margin, 10, 'F');
    doc.setTextColor(255);
    doc.setFontSize(9);
    doc.text('DESCRIPTION', margin + 2, tableTop + 7);
    doc.text('QTY', pageWidth - margin - 35, tableTop + 7);
    doc.text('RATE', pageWidth - margin - 18, tableTop + 7);
    doc.text('AMOUNT', pageWidth - margin, tableTop + 7, { align: 'right' });
    
    y = tableTop + 15;
    currentInvoice.lineItems.forEach((item, idx) => {
        if (idx % 2 === 1) {
            doc.setFillColor(243, 244, 246);
            doc.rect(margin, y - 4, pageWidth - 2 * margin, 10, 'F');
        }
        doc.setTextColor(0);
        doc.setFontSize(9);
        doc.text(item.description, margin + 2, y + 2);
        doc.text(item.quantity.toString(), pageWidth - margin - 35, y + 2);
        doc.text(formatCurrency(item.unitPrice), pageWidth - margin - 18, y + 2);
        doc.text(formatCurrency(item.quantity * item.unitPrice), pageWidth - margin, y + 2, { align: 'right' });
        y += 10;
    });
    
    y += 10;
    
    // Totals
    const totalsX = pageWidth - margin - 50;
    doc.setTextColor(100);
    doc.setFontSize(10);
    doc.text('Subtotal:', totalsX, y);
    doc.text(formatCurrency(currentInvoice.subtotal), pageWidth - margin, y, { align: 'right' });
    y += 7;
    
    if (currentInvoice.isVATRegistered) {
        doc.text(`VAT (${(currentInvoice.vatRate * 100).toFixed(0)}%):`, totalsX, y);
        doc.text(formatCurrency(currentInvoice.vat), pageWidth - margin, y, { align: 'right' });
        y += 7;
    }
    
    doc.setFillColor(37, 99, 235);
    doc.rect(totalsX - 5, y - 4, 55, 12, 'F');
    doc.setTextColor(255);
    doc.setFontSize(12);
    doc.text('TOTAL:', totalsX, y + 3);
    doc.text(formatCurrency(currentInvoice.total), pageWidth - margin, y + 3, { align: 'right' });
    
    // Save
    const filename = `Invoice_${currentInvoice.invoiceNumber.replace(/\//g, '-')}.pdf`;
    doc.save(filename);
    showToast('PDF downloaded!');
}

function shareInvoice() {
    if (navigator.share) {
        navigator.share({
            title: `Invoice ${currentInvoice.invoiceNumber}`,
            text: `Invoice from ${settings.businessName || 'Your Business'}`,
            url: window.location.href
        }).catch(() => downloadPDF());
    } else {
        downloadPDF();
    }
}

// Helpers
function generateInvoiceNumber() {
    const d = new Date();
    return `INV-${d.getFullYear()}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getDate().toString().padStart(2,'0')}-${Math.floor(Math.random()*10000).toString().padStart(4,'0')}`;
}

function formatCurrency(amount) {
    return '£' + amount.toFixed(2);
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function showToast(msg) {
    dom.toast.textContent = msg;
    dom.toast.classList.add('show');
    setTimeout(() => dom.toast.classList.remove('show'), 3000);
}

function switchTab(tab) {
    dom.nav.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    Object.values(dom.pages).forEach(p => p.classList.remove('active'));
    dom.pages[tab].classList.add('active');
}

// Global
window.viewInvoice = viewInvoice;
