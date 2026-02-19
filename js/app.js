// Invoice Generator Web - Main App Logic

// State
let invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
let settings = JSON.parse(localStorage.getItem('settings') || '{}');
let currentInvoice = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initForms();
    initInvoiceForm();
    renderInvoices();
    loadSettings();
});

// Navigation
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            switchTab(tab);
        });
    });
}

function switchTab(tab) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tab);
    });
    
    // Update page
    document.querySelectorAll('.page').forEach(page => {
        page.classList.toggle('active', page.id === `page-${tab}`);
    });
}

// Forms
function initForms() {
    // Invoice Form
    document.getElementById('invoice-form').addEventListener('submit', saveInvoice);
    document.getElementById('addItemBtn').addEventListener('click', addLineItem);
    
    // Settings Form
    document.getElementById('settings-form').addEventListener('submit', saveSettings);
    
    // Modal
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('downloadPDF').addEventListener('click', downloadPDF);
    document.getElementById('shareInvoice').addEventListener('click', shareInvoice);
}

// Invoice Form
function initInvoiceForm() {
    document.getElementById('isVATRegistered').addEventListener('change', updateTotals);
    document.getElementById('vatRate').addEventListener('change', updateTotals);
    
    // Add first item
    addLineItem();
}

function addLineItem() {
    const container = document.getElementById('lineItems');
    const index = container.children.length;
    
    const item = document.createElement('div');
    item.className = 'line-item';
    item.dataset.index = index;
    item.innerHTML = `
        <div class="line-item-header">
            <input type="text" placeholder="Item description" class="item-desc">
            <button type="button" class="remove-btn" onclick="removeLineItem(${index})">&times;</button>
        </div>
        <div class="line-item-row">
            <div class="qty">
                <input type="number" placeholder="Qty" value="1" min="1" class="item-qty" onchange="updateTotals()">
            </div>
            <div class="price">
                <input type="number" placeholder="Price" value="0" min="0" step="0.01" class="item-price" onchange="updateTotals()">
            </div>
            <div class="item-total">£0.00</div>
        </div>
    `;
    container.appendChild(item);
    updateRemoveButtons();
}

function removeLineItem(index) {
    const container = document.getElementById('lineItems');
    const items = container.querySelectorAll('.line-item');
    if (items.length > 1) {
        items[index].remove();
        updateTotals();
    }
}

function updateRemoveButtons() {
    const items = document.querySelectorAll('.line-item');
    items.forEach((item, idx) => {
        const btn = item.querySelector('.remove-btn');
        btn.style.display = items.length > 1 ? 'block' : 'none';
    });
}

function getLineItems() {
    const items = [];
    document.querySelectorAll('.line-item').forEach(item => {
        const desc = item.querySelector('.item-desc').value.trim();
        const qty = parseFloat(item.querySelector('.item-qty').value) || 1;
        const price = parseFloat(item.querySelector('.item-price').value) || 0;
        if (!desc) return; // Skip if no description
        items.push({ description: desc, quantity: qty, unitPrice: price });
    });
    return items;
}

function updateTotals() {
    const items = getLineItems();
    const isVAT = document.getElementById('isVATRegistered').checked;
    const vatRate = parseFloat(document.getElementById('vatRate').value);
    
    let subtotal = 0;
    document.querySelectorAll('.line-item').forEach((item, idx) => {
        const qty = parseFloat(item.querySelector('.item-qty').value) || 0;
        const price = parseFloat(item.querySelector('.item-price').value) || 0;
        const total = qty * price;
        subtotal += total;
        const totalEl = item.querySelector('.item-total');
        if (totalEl) totalEl.textContent = formatCurrency(total);
    });
    
    const vat = isVAT ? subtotal * vatRate : 0;
    const total = subtotal + vat;
    
    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('vat').textContent = formatCurrency(vat);
    document.getElementById('total').textContent = formatCurrency(total);
    
    document.getElementById('vatRow').style.display = isVAT ? 'flex' : 'none';
}

function saveInvoice(e) {
    e.preventDefault();
    
    const items = getLineItems();
    if (items.length === 0) {
        showToast('Please add at least one item');
        return;
    }
    
    const isVAT = document.getElementById('isVATRegistered').checked;
    const vatRate = parseFloat(document.getElementById('vatRate').value);
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const vat = isVAT ? subtotal * vatRate : 0;
    
    const invoice = {
        id: Date.now().toString(),
        invoiceNumber: generateInvoiceNumber(),
        clientName: document.getElementById('clientName').value,
        clientCompany: document.getElementById('clientCompany').value,
        clientEmail: document.getElementById('clientEmail').value,
        clientAddress: document.getElementById('clientAddress').value,
        lineItems: items,
        isVATRegistered: isVAT,
        vatRate: vatRate,
        subtotal: subtotal,
        vat: vat,
        total: subtotal + vat,
        notes: document.getElementById('notes').value,
        status: 'sent',
        createdAt: new Date().toISOString()
    };
    
    invoices.unshift(invoice);
    saveToStorage();
    
    // Reset form
    document.getElementById('invoice-form').reset();
    document.getElementById('lineItems').innerHTML = '';
    addLineItem();
    updateTotals();
    
    showToast('Invoice saved!');
    renderInvoices();
    switchTab('invoices');
}

// Settings
function loadSettings() {
    const fields = ['businessName', 'businessAddress', 'businessEmail', 'businessPhone',
                   'vatNumber', 'companiesHouse', 'sortCode', 'accountNumber', 'accountName', 'bankName'];
    fields.forEach(field => {
        const el = document.getElementById(field);
        if (el && settings[field]) {
            el.value = settings[field];
        }
    });
}

function saveSettings(e) {
    e.preventDefault();
    
    const fields = ['businessName', 'businessAddress', 'businessEmail', 'businessPhone',
                   'vatNumber', 'companiesHouse', 'sortCode', 'accountNumber', 'accountName', 'bankName'];
    fields.forEach(field => {
        const el = document.getElementById(field);
        if (el) {
            settings[field] = el.value;
        }
    });
    
    saveToStorage();
    showToast('Settings saved!');
}

// Invoices List
function renderInvoices() {
    const container = document.getElementById('invoices-list');
    const emptyEl = document.getElementById('empty-invoices');
    
    if (invoices.length === 0) {
        container.innerHTML = '';
        container.appendChild(emptyEl);
        emptyEl.style.display = 'flex';
        return;
    }
    
    container.innerHTML = invoices.map(inv => `
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

function viewInvoice(id) {
    const invoice = invoices.find(inv => inv.id === id);
    if (!invoice) return;
    
    currentInvoice = invoice;
    
    const detail = document.getElementById('invoiceDetail');
    detail.innerHTML = `
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
                        <th class="amount">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoice.lineItems.map(item => `
                        <tr>
                            <td>${escapeHtml(item.description)}</td>
                            <td>${item.quantity}</td>
                            <td>${formatCurrency(item.unitPrice)}</td>
                            <td class="amount">${formatCurrency(item.quantity * item.unitPrice)}</td>
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
    
    document.getElementById('invoiceModal').classList.add('active');
}

function closeModal() {
    document.getElementById('invoiceModal').classList.remove('active');
}

// PDF Generation
function downloadPDF() {
    if (!currentInvoice || typeof jspdf === 'undefined') {
        showToast('PDF generation not available');
        return;
    }
    
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    let y = margin;
    
    // Helper functions
    const addText = (text, x, y, options = {}) => {
        doc.setFontSize(options.size || 10);
        doc.setTextColor(options.color || '#000000');
        doc.text(text, x, y, { align: options.align || 'left' });
    };
    
    const addRect = (x, y, w, h, color) => {
        doc.setFillColor(color);
        doc.rect(x, y, w, h, 'F');
    };
    
    // Header
    addText('INVOICE', margin, y, { size: 24, color: '#2563EB' });
    y += 15;
    
    addText(`Invoice #: ${currentInvoice.invoiceNumber}`, margin, y, { size: 12, color: '#000000' });
    y += 6;
    addText(`Date: ${formatDate(currentInvoice.createdAt)}`, margin, y, { size: 10, color: '#666666' });
    y += 6;
    if (currentInvoice.total > 0) {
        const statusColor = currentInvoice.status === 'paid' ? '#10B981' : 
                          currentInvoice.status === 'overdue' ? '#EF4444' : '#F59E0B';
        addText(currentInvoice.status.toUpperCase(), pageWidth - margin, margin, { size: 10, color: statusColor, align: 'right' });
    }
    
    y += 20;
    
    // From
    addText('FROM', margin, y, { size: 8, color: '#666666' });
    y += 6;
    addText(settings.businessName || 'Your Business', margin, y, { size: 12, color: '#000000' });
    y += 6;
    if (settings.businessAddress) {
        const addrLines = doc.splitTextToSize(settings.businessAddress, 80);
        addrLines.forEach(line => {
            addText(line, margin, y, { size: 10, color: '#666666' });
            y += 5;
        });
    }
    if (settings.vatNumber) {
        addText(`VAT: ${settings.vatNumber}`, margin, y, { size: 10, color: '#666666' });
        y += 6;
    }
    
    y += 10;
    
    // Bill To
    addText('BILL TO', margin, y, { size: 8, color: '#666666' });
    y += 6;
    addText(currentInvoice.clientName, margin, y, { size: 12, color: '#000000' });
    y += 6;
    if (currentInvoice.clientCompany) {
        addText(currentInvoice.clientCompany, margin, y, { size: 10, color: '#666666' });
        y += 6;
    }
    addText(currentInvoice.clientEmail, margin, y, { size: 10, color: '#666666' });
    y += 6;
    if (currentInvoice.clientAddress) {
        addText(currentInvoice.clientAddress, margin, y, { size: 10, color: '#666666' });
        y += 10;
    }
    
    y += 10;
    
    // Table Header
    const tableTop = y;
    addRect(margin, tableTop, pageWidth - 2 * margin, 10, '#2563EB');
    y = tableTop + 7;
    addText('DESCRIPTION', margin + 2, y, { size: 9, color: '#FFFFFF' });
    addText('QTY', pageWidth - margin - 35, y, { size: 9, color: '#FFFFFF' });
    addText('RATE', pageWidth - margin - 18, y, { size: 9, color: '#FFFFFF' });
    addText('AMOUNT', pageWidth - margin, y, { size: 9, color: '#FFFFFF', align: 'right' });
    
    y += 10;
    
    // Table Rows
    currentInvoice.lineItems.forEach((item, idx) => {
        if (idx % 2 === 1) {
            addRect(margin, y - 4, pageWidth - 2 * margin, 10, '#F3F4F6');
        }
        addText(item.description, margin + 2, y, { size: 9, color: '#000000' });
        addText(item.quantity.toString(), pageWidth - margin - 35, y, { size: 9, color: '#000000' });
        addText(formatCurrency(item.unitPrice), pageWidth - margin - 18, y, { size: 9, color: '#000000' });
        addText(formatCurrency(item.quantity * item.unitPrice), pageWidth - margin, y, { size: 9, color: '#000000', align: 'right' });
        y += 10;
    });
    
    y += 10;
    
    // Totals
    const totalsX = pageWidth - margin - 50;
    addText('Subtotal:', totalsX, y, { size: 10, color: '#666666' });
    addText(formatCurrency(currentInvoice.subtotal), pageWidth - margin, y, { size: 10, color: '#000000', align: 'right' });
    y += 7;
    
    if (currentInvoice.isVATRegistered) {
        addText(`VAT (${(currentInvoice.vatRate * 100).toFixed(0)}%):`, totalsX, y, { size: 10, color: '#666666' });
        addText(formatCurrency(currentInvoice.vat), pageWidth - margin, y, { size: 10, color: '#000000', align: 'right' });
        y += 7;
    }
    
    addRect(totalsX - 5, y - 4, 55, 12, '#2563EB');
    addText('TOTAL:', totalsX, y + 3, { size: 12, color: '#FFFFFF' });
    addText(formatCurrency(currentInvoice.total), pageWidth - margin, y + 3, { size: 12, color: '#FFFFFF', align: 'right' });
    
    // Payment Details
    if (settings.sortCode && settings.accountNumber) {
        y = pageHeight - 30;
        addText('Payment Details', margin, y, { size: 10, color: '#666666' });
        y += 6;
        addText(`Sort Code: ${settings.sortCode}  |  Account: ${settings.accountNumber}`, margin, y, { size: 9, color: '#666666' });
    }
    
    // Save
    const filename = `Invoice_${currentInvoice.invoiceNumber.replace(/\//g, '-')}.pdf`;
    doc.save(filename);
    
    showToast('PDF downloaded!');
}

function shareInvoice() {
    if (!currentInvoice) return;
    
    // For web, we'll try to use Web Share API if available
    if (navigator.share) {
        navigator.share({
            title: `Invoice ${currentInvoice.invoiceNumber}`,
            text: `Invoice from ${settings.businessName || 'Your Business'} to ${currentInvoice.clientName}`,
            url: window.location.href
        }).catch(() => {
            downloadPDF();
        });
    } else {
        downloadPDF();
    }
}

// Storage
function saveToStorage() {
    localStorage.setItem('invoices', JSON.stringify(invoices));
    localStorage.setItem('settings', JSON.stringify(settings));
}

// Helpers
function generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}${day}-${random}`;
}

function formatCurrency(amount) {
    return '£' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Make functions available globally
window.viewInvoice = viewInvoice;
window.removeLineItem = removeLineItem;
