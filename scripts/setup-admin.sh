#!/bin/bash
# Setup script to assign initial admin role to a user

DEPLOYED_URL="http://localhost:3000" # Change to your deployed URL
USER_EMAIL="your-email@example.com" # Replace with your email
ROLE="admin" # Can be "admin", "manager", or "sales_rep"

echo "Assigning ${ROLE} role to ${USER_EMAIL}..."
curl -X POST "${DEPLOYED_URL}/api/admin/setup" \
  -H "Content-Type: application/json" \
  -d "{
    \"userEmail\": \"${USER_EMAIL}\",
    \"role\": \"${ROLE}\"
  }"

echo ""
echo "Done! You should be able to access the dashboard now."
