#!/bin/bash
# Auto-retry OCI A1 Flex VM creation until capacity is available.
# Usage: ./create-vm.sh
# Typically succeeds within minutes to a few hours.

set -euo pipefail

TENANCY="ocid1.tenancy.oc1..aaaaaaaaoidpevgnu74on5qx2i7kex4ea52262q42eqywrkqdbljogasquvq"
AD="fZHn:CA-TORONTO-1-AD-1"
SUBNET_ID="ocid1.subnet.oc1.ca-toronto-1.aaaaaaaa7fvolris3xqt6rkhetzpjzkx6lnlikfearl7dxlkdo3y7jfercca"
IMAGE="ocid1.image.oc1.ca-toronto-1.aaaaaaaafq6p6p6f6xdn6mh4gwuuzigsbrni2xc7nj6cjpee4l6gaslim5sq"
SSH_KEY="$HOME/.ssh/oci_heybub.pub"

RETRY_INTERVAL=60
ATTEMPT=0

echo "Starting A1 Flex VM creation (2 OCPU, 12GB RAM, 100GB boot)"
echo "Will retry every ${RETRY_INTERVAL}s until capacity is available..."
echo ""

while true; do
    ATTEMPT=$((ATTEMPT + 1))
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$TIMESTAMP] Attempt $ATTEMPT..."

    RESULT=$(oci compute instance launch \
        --compartment-id "$TENANCY" \
        --availability-domain "$AD" \
        --shape "VM.Standard.A1.Flex" \
        --shape-config '{"ocpus":2,"memoryInGBs":12}' \
        --image-id "$IMAGE" \
        --subnet-id "$SUBNET_ID" \
        --assign-public-ip true \
        --display-name "heybub-app" \
        --boot-volume-size-in-gbs 100 \
        --ssh-authorized-keys-file "$SSH_KEY" \
        --output json 2>&1) || true

    if echo "$RESULT" | grep -q '"lifecycle-state"'; then
        INSTANCE_ID=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
        echo ""
        echo "============================================"
        echo "VM CREATED SUCCESSFULLY!"
        echo "Instance ID: $INSTANCE_ID"
        echo "Attempts: $ATTEMPT"
        echo "============================================"
        echo ""
        echo "Waiting for RUNNING state..."

        oci compute instance get \
            --instance-id "$INSTANCE_ID" \
            --wait-for-state RUNNING \
            --query 'data.{id:id, state:"lifecycle-state", name:"display-name"}' \
            --output table

        # Get public IP
        VNIC_ATTACHMENT=$(oci compute vnic-attachment list \
            --compartment-id "$TENANCY" \
            --instance-id "$INSTANCE_ID" \
            --query 'data[0]."vnic-id"' --raw-output)

        PUBLIC_IP=$(oci network vnic get \
            --vnic-id "$VNIC_ATTACHMENT" \
            --query 'data."public-ip"' --raw-output)

        echo ""
        echo "PUBLIC IP: $PUBLIC_IP"
        echo ""
        echo "Connect with: ssh -i ~/.ssh/oci_heybub ubuntu@$PUBLIC_IP"
        echo ""

        # macOS notification
        osascript -e "display notification \"IP: $PUBLIC_IP\" with title \"OCI VM Created!\" sound name \"Glass\"" 2>/dev/null || true

        exit 0
    fi

    if echo "$RESULT" | grep -q "Out of host capacity"; then
        echo "  No capacity — retrying in ${RETRY_INTERVAL}s..."
    else
        echo "  Unexpected error:"
        echo "$RESULT" | head -5
        echo "  Retrying in ${RETRY_INTERVAL}s..."
    fi

    sleep "$RETRY_INTERVAL"
done
