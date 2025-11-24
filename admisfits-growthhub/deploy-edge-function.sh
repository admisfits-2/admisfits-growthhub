#!/bin/bash

# Check if SUPABASE_ACCESS_TOKEN is set
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "Please set SUPABASE_ACCESS_TOKEN environment variable first"
    echo "Run: export SUPABASE_ACCESS_TOKEN=your-token-here"
    exit 1
fi

echo "Linking Supabase project..."
npx supabase link --project-ref lpuqcvnyzvnrsiyhwoxs

echo "Deploying ghl-proxy edge function..."
npx supabase functions deploy ghl-proxy

echo "Deployment complete!"