# Invoice Generator UK - Web Edition

A mobile-friendly web version of the Invoice Generator for UK businesses. Create, manage, and share professional invoices directly from your browser.

## Features

- 📱 **Mobile-First Design** - Optimized for mobile browsers
- 💾 **Local Storage** - Data saved in your browser (offline capable)
- 📄 **PDF Generation** - Download professional PDF invoices
- 🇬🇧 **UK Compliant** - VAT support (20%, 5%, 0%)
- 🏦 **Bank Details** - Include payment information
- 📊 **Line Items** - Add multiple items with quantity and price
- 🔄 **Auto-save** - Settings and invoices saved automatically

## Tech Stack

- Vanilla JavaScript (ES6+)
- CSS3 with CSS Variables
- jsPDF for PDF generation
- LocalStorage for data persistence
- PWA ready

## Getting Started

### Local Development

Simply open `index.html` in your browser:

```bash
# Using Python (recommended)
python3 -m http.server 8000

# Then open http://localhost:8000
```

### Deployment

Deploy to GitHub Pages or any static host:

```bash
# Push to GitHub
gh repo create invoice-generator-web --public
git add .
git commit -m "Initial commit"
git push origin main

# Enable GitHub Pages in repo settings
```

## Usage

1. **Settings** - Configure your business details, VAT number, and bank info
2. **Create** - Fill in client details and line items
3. **Save** - Invoice is saved locally
4. **View** - Tap any invoice to view details
5. **Share** - Download PDF or share via browser

## Data Storage

All data is stored in your browser's LocalStorage:
- Invoices persist across sessions
- Settings remembered automatically
- No server required

## Screenshots

| Create Invoice | Invoice List | Settings |
|----------------|--------------|----------|
| Mobile form | Card list | Business details |

## License

MIT License
