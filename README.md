# Closing Cost Calculator

FL-specific buyer and seller closing cost calculator for NE Florida real estate agents.

## Features
- **Buyer side**: Conventional, FHA, VA, Cash with loan-type-specific fees
- **Seller side**: Net sheet with title fees, doc stamps, brokerage, pro-rated taxes
- FL promulgated title insurance rates, doc stamps, intangible tax
- Auto-calculated insurance (1.5%) and taxes (1.0%) with manual override
- Donut chart visualizations
- Text report (copy to clipboard) and full HTML report preview
- Mobile-first design

## Project Structure
```
closing-calc/
├── index.html          # Entry point with mobile meta tags
├── package.json        # Vite + React deps
├── vite.config.js      # Vite config
├── .gitignore
└── src/
    ├── main.jsx        # React mount
    └── App.jsx         # Full calculator app (single file)
```

## Local Development
```bash
npm install
npm run dev
```

## Deploy to Vercel
```bash
# Option 1: Vercel CLI
npm i -g vercel
vercel

# Option 2: Push to GitHub, connect repo in vercel.com
#   Framework: Vite
#   Build command: npm run build
#   Output directory: dist
```

## Customization
- **Fee amounts**: Edit the calc useMemo blocks in `src/App.jsx`
- **Branding**: Search for "Closing Cost Calculator" and "NE Florida" to add team name
- **Default percentages**: Insurance (1.5%) and tax (1.0%) defaults are in useState initializers
- **Title company fees**: Buyer title endorsements and seller search/closing/lien fees are hardcoded constants in the calc blocks — change them to match your title company
