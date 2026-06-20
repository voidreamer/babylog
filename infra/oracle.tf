# ============================================================================
# Oracle Cloud — primary API host (Ampere A1, Always Free).
#
# CODE-ONLY / recreate-from-scratch IaC. The live A1 was hand-built (oci-cli +
# on-box steps) and is intentionally NOT imported here, so `apply` against an
# existing tenancy will CREATE a parallel stack — use it for disaster recovery
# or a fresh tenancy, then deploy the app with the CI pipeline + the runbook in
# docs/ORACLE_DEPLOYMENT.md (Terraform manages the VM + network only; the app,
# venv, systemd unit and Cloudflare tunnel are deployed on-box).
# ============================================================================

data "oci_identity_availability_domains" "ads" {
  compartment_id = var.oci_tenancy_ocid
}

# Latest Oracle Linux 9 aarch64 image for the A1 (Ampere) shape.
data "oci_core_images" "ol9_arm" {
  compartment_id           = var.oci_compartment_ocid
  operating_system         = "Oracle Linux"
  operating_system_version = "9"
  shape                    = var.oci_instance_shape
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

resource "oci_core_vcn" "main" {
  compartment_id = var.oci_compartment_ocid
  cidr_blocks    = ["10.0.0.0/16"]
  display_name   = "${var.project_name}-vcn"
  dns_label      = "heybub"
}

resource "oci_core_internet_gateway" "ig" {
  compartment_id = var.oci_compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${var.project_name}-ig"
}

resource "oci_core_route_table" "rt" {
  compartment_id = var.oci_compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${var.project_name}-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    network_entity_id = oci_core_internet_gateway.ig.id
  }
}

resource "oci_core_security_list" "sl" {
  compartment_id = var.oci_compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${var.project_name}-sl"

  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }

  # SSH + HTTP/HTTPS. The Cloudflare tunnel is outbound-only, so only 22 is
  # strictly required; 80/443 kept for flexibility.
  dynamic "ingress_security_rules" {
    for_each = toset([22, 80, 443])
    content {
      protocol = "6" # TCP
      source   = "0.0.0.0/0"
      tcp_options {
        min = ingress_security_rules.value
        max = ingress_security_rules.value
      }
    }
  }
}

resource "oci_core_subnet" "public" {
  compartment_id    = var.oci_compartment_ocid
  vcn_id            = oci_core_vcn.main.id
  cidr_block        = "10.0.0.0/24"
  display_name      = "${var.project_name}-subnet"
  route_table_id    = oci_core_route_table.rt.id
  security_list_ids = [oci_core_security_list.sl.id]
  dns_label         = "heybub"
}

resource "oci_core_instance" "api" {
  compartment_id      = var.oci_compartment_ocid
  availability_domain = var.oci_availability_domain != "" ? var.oci_availability_domain : data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = "${var.project_name}-api-a1"
  shape               = var.oci_instance_shape

  shape_config {
    ocpus         = var.oci_ocpus
    memory_in_gbs = var.oci_memory_gb
  }

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.ol9_arm.images[0].id
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.public.id
    assign_public_ip = true
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    # Minimal bootstrap; the full app + Cloudflare tunnel are deployed on-box by
    # the CI pipeline / docs/ORACLE_DEPLOYMENT.md (not Terraform).
    user_data = base64encode(<<-EOT
      #!/bin/bash
      mkdir -p /opt/heybub && chown opc:opc /opt/heybub
      sudo -u opc bash -c 'curl -LsSf https://astral.sh/uv/install.sh | sh'
    EOT
    )
  }

  lifecycle {
    ignore_changes = [source_details[0].source_id] # don't churn the box when a newer image ships
  }
}
