import base64
import nacl.encoding
import nacl.public
import sys
import os
import requests

def encrypt_secret(public_key: str, secret_value: str):
    """Encrypt the secret value using GitHub's public key."""
    public_key_bytes = base64.b64decode(public_key)
    public_key_obj = nacl.public.PublicKey(public_key_bytes, nacl.encoding.RawEncoder)
    sealed_box = nacl.public.SealedBox(public_key_obj)
    encrypted = sealed_box.encrypt(secret_value.encode("utf-8"))
    return base64.b64encode(encrypted).decode("utf-8")

def update_github_secret(secret_name, encrypted_value, key_id):
    """Update GitHub Actions secret via API."""
    github_token = os.getenv("GH_WORKFLOW_TOKEN")
    if not github_token:
        print("Error: GH_WORKFLOW_TOKEN is not set.")
        return

    url = f"https://api.github.com/repos/ORG_NAME/test-sample-ui-bddtests/actions/secrets/{secret_name}"
    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json"
    }
    data = {
        "encrypted_value": encrypted_value,
        "key_id": key_id
    }

    response = requests.put(url, json=data, headers=headers)

    if response.status_code == 201 or response.status_code == 204:
        print(f"Successfully updated GitHub secret")
    else:
        print(f"Failed to update GitHub secret")

if __name__ == "__main__":
    # Ensure at least one argument is provided
    if len(sys.argv) < 2:
        print("Usage: python3 updateGhaItem.py <test_account_name> [new_password]")
        sys.exit(1)

    # Get the required test account name
    test_account_name = sys.argv[1]

    # Get optional new password argument, otherwise use environment variable
    new_password = sys.argv[2] if len(sys.argv) > 2 else os.getenv("NEW_PASSWORD")

    if not new_password:
        print("Error: NEW_PASSWORD is not set.")
        sys.exit(1)

    # Retrieve necessary environment variables
    public_key = os.getenv("SAMPLE_UI_BDD_REPO_PUBLIC_KEY")
    key_id = os.getenv("ORG_NAME_PUBLIC_KEY_ID")

    if not all([public_key, key_id]):
        print("Error: Missing required environment variables.")
        sys.exit(1)

    # Encrypt the password
    encrypted_value = encrypt_secret(public_key, new_password)

    # Always update INT secret
    secrets_to_update = [
        f"SAMPLE_INT_OKTA_PASSWORD_{test_account_name.upper()}"
    ]

    # Also update UAT secret if in specific list
    dual_env_accounts = ["admin", "ar_reviewer", "bioinformatician"]
    if test_account_name.lower() in dual_env_accounts:
        secrets_to_update.append(f"SAMPLE_UAT_OKTA_PASSWORD_{test_account_name.upper()}")

    for secret in secrets_to_update:
        update_github_secret(secret, encrypted_value, key_id)
