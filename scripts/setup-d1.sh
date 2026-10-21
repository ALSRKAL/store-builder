#!/bin/bash

# =============================================
# D1 Database Setup Script
# =============================================

echo "🚀 Setting up Cloudflare D1 Database..."
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Navigate to workers directory
cd "$(dirname "$0")/../workers" || exit

# Step 1: Create D1 database
echo "📦 Step 1: Creating D1 database..."
echo "   Running: wrangler d1 create store-db"
wrangler d1 create store-db

echo ""
echo "⚠️  IMPORTANT: Copy the database_id from above and update wrangler.toml"
echo "   Press Enter after updating wrangler.toml..."
read -r

# Step 2: Run schema
echo ""
echo "📝 Step 2: Creating database schema..."
echo "   Running: wrangler d1 execute store-db --file=schema.sql"
wrangler d1 execute store-db --file=schema.sql

# Step 3: Check if import file exists
IMPORT_FILE="../data/export/import.sql"
if [ -f "$IMPORT_FILE" ]; then
    echo ""
    echo "📥 Step 3: Importing data from Firestore export..."
    echo "   Running: wrangler d1 execute store-db --file=$IMPORT_FILE"
    wrangler d1 execute store-db --file="$IMPORT_FILE"
else
    echo ""
    echo "⚠️  No import file found at $IMPORT_FILE"
    echo "   Run 'node scripts/export-firestore.js' first to export Firestore data"
fi

# Step 4: Verify
echo ""
echo "✅ Step 4: Verifying database..."
echo "   Running: wrangler d1 execute store-db --command='SELECT COUNT(*) FROM stores'"
wrangler d1 execute store-db --command="SELECT COUNT(*) as stores_count FROM stores"
wrangler d1 execute store-db --command="SELECT COUNT(*) as admins_count FROM admins"
wrangler d1 execute store-db --command="SELECT COUNT(*) as products_count FROM products"

echo ""
echo "🎉 D1 Database setup complete!"
echo ""
echo "📌 Next steps:"
echo "   1. Deploy the Worker: cd workers && wrangler deploy"
echo "   2. Update VITE_API_URL in .env with your Worker URL"
echo "   3. Test the API endpoints"
