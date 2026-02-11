#!/bin/bash
# @deprecated — one-time commit helper, no longer needed.
echo 'Dead script' && exit 1
echo "The Stripe Connect files exist in VS Code's virtual GitHub view but"
echo "haven't been saved to disk yet."
echo ""
echo "To commit them:"
echo "1. In VS Code, open the Source Control panel (already open)"
echo "2. You should see changes in the vscode-vfs://github workspace"
echo "3. Stage all changes with the '+' icon"
echo "4. Write commit message: 'feat: Add Stripe Connect automatic payouts'"
echo "5. Click the checkmark to commit"
echo "6. Click '...' menu → Push"
echo ""
echo "OR use the Command Palette (Cmd+Shift+P):"
echo "  → Type 'Git: Stage All Changes'"
echo "  → Type 'Git: Commit Staged'"
echo "  → Type 'Git: Push'"
