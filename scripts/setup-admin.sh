#!/bin/bash
# ============================================================================
# AressCRM First Admin User Setup
# ============================================================================
# This script assigns an initial admin role to your first user.
# Used after user signs up via the platform or manually via Supabase Auth.
#
# Requirements:
#   - SUPABASE_SERVICE_ROLE_KEY environment variable set
#   - User must already exist in auth.users (via signup or Supabase dashboard)
#   - Platform must be deployed or running locally
#
# Usage:
#   ./setup-admin.sh <email> [role] [url]
#   ./setup-admin.sh admin@example.com admin http://localhost:3000
# ============================================================================

# Default values
DEPLOYED_URL="${3:-http://localhost:3000}"
USER_EMAIL="${1:-your-email@example.com}"
ROLE="${2:-admin}"

# Check environment variable
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set"
  echo ""
  echo "Set it with:"
  echo "  export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'"
  echo ""
  exit 1
fi

echo "🔐 AressCRM First Admin Setup"
echo "──────────────────────────────"
echo "📧 Email:  $USER_EMAIL"
echo "👤 Role:   $ROLE"
echo "🔗 URL:    $DEPLOYED_URL"
echo ""
echo "Assigning ${ROLE} role to ${USER_EMAIL}..."
echo ""

# Make the API request
RESPONSE=$(curl -s -X POST "${DEPLOYED_URL}/api/admin/setup" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -d "{
    \"userEmail\": \"${USER_EMAIL}\",
    \"role\": \"${ROLE}\"
  }")

# Parse response
SUCCESS=$(echo "$RESPONSE" | grep -o '"success":true' | wc -l)

if [ $SUCCESS -eq 1 ]; then
  echo "✅ Success! User role assigned."
  echo ""
  echo "Message: $(echo "$RESPONSE" | grep -o '"message":"[^"]*' | cut -d'"' -f4)"
  echo ""
  echo "🎉 You can now log in at: ${DEPLOYED_URL}/login"
  exit 0
else
  echo "❌ Error: Failed to assign role"
  echo ""
  echo "Response:"
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
  echo ""
  exit 1
fi
