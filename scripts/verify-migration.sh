#!/bin/bash

# =============================================
# Verify Migration Script
# Checks that data was imported correctly to D1
# =============================================

echo "🔍 Verifying D1 Migration..."
echo ""

cd "$(dirname "$0")/../workers"

echo "📊 Checking record counts..."
echo "─────────────────────────────────────────"

echo -n "   stores: "
npx wrangler d1 execute store-db --command "SELECT COUNT(*) as count FROM stores" --remote 2>/dev/null | grep -o '"count":[0-9]*' | cut -d: -f2

echo -n "   admins: "
npx wrangler d1 execute store-db --command "SELECT COUNT(*) as count FROM admins" --remote 2>/dev/null | grep -o '"count":[0-9]*' | cut -d: -f2

echo -n "   products: "
npx wrangler d1 execute store-db --command "SELECT COUNT(*) as count FROM products" --remote 2>/dev/null | grep -o '"count":[0-9]*' | cut -d: -f2

echo -n "   categories: "
npx wrangler d1 execute store-db --command "SELECT COUNT(*) as count FROM categories" --remote 2>/dev/null | grep -o '"count":[0-9]*' | cut -d: -f2

echo -n "   subscription_codes: "
npx wrangler d1 execute store-db --command "SELECT COUNT(*) as count FROM subscription_codes" --remote 2>/dev/null | grep -o '"count":[0-9]*' | cut -d: -f2

echo -n "   usage: "
npx wrangler d1 execute store-db --command "SELECT COUNT(*) as count FROM usage" --remote 2>/dev/null | grep -o '"count":[0-9]*' | cut -d: -f2

echo "─────────────────────────────────────────"
echo ""
echo "✅ Verification complete!"
