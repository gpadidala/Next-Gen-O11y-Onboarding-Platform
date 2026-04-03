variable "project_name" {
  description = "Name of the project, used as a prefix for all resources"
  type        = string
  default     = "o11y-onboarding"
}

variable "environment" {
  description = "Deployment environment (development, staging, production)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "eastus2"
}

variable "resource_group_name" {
  description = "Name of the Azure Resource Group"
  type        = string
  default     = "o11y-onboarding-rg"
}

# --------------------------------------------------------------------------
# AKS variables
# --------------------------------------------------------------------------

variable "kubernetes_version" {
  description = "Kubernetes version for the AKS cluster"
  type        = string
  default     = "1.29"
}

variable "aks_node_vm_size" {
  description = "VM size for AKS default node pool"
  type        = string
  default     = "Standard_D4s_v5"
}

variable "aks_node_count" {
  description = "Initial number of nodes in the AKS default node pool"
  type        = number
  default     = 3
}

variable "aks_min_node_count" {
  description = "Minimum number of nodes for AKS auto-scaling"
  type        = number
  default     = 2
}

variable "aks_max_node_count" {
  description = "Maximum number of nodes for AKS auto-scaling"
  type        = number
  default     = 10
}

# --------------------------------------------------------------------------
# PostgreSQL variables
# --------------------------------------------------------------------------

variable "postgres_admin_username" {
  description = "Administrator username for the PostgreSQL Flexible Server"
  type        = string
  default     = "o11yadmin"
  sensitive   = true
}

variable "postgres_admin_password" {
  description = "Administrator password for the PostgreSQL Flexible Server"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.postgres_admin_password) >= 16
    error_message = "Password must be at least 16 characters long."
  }
}

variable "postgres_sku_name" {
  description = "SKU name for PostgreSQL Flexible Server (e.g. GP_Standard_D2s_v3)"
  type        = string
  default     = "GP_Standard_D2s_v3"
}

variable "postgres_storage_mb" {
  description = "Storage size in MB for PostgreSQL Flexible Server"
  type        = number
  default     = 32768
}

variable "postgres_database_name" {
  description = "Name of the application database"
  type        = string
  default     = "o11y_onboarding"
}

# --------------------------------------------------------------------------
# Monitoring variables
# --------------------------------------------------------------------------

variable "log_retention_days" {
  description = "Log Analytics workspace retention in days"
  type        = number
  default     = 30

  validation {
    condition     = var.log_retention_days >= 30 && var.log_retention_days <= 730
    error_message = "Log retention must be between 30 and 730 days."
  }
}

# --------------------------------------------------------------------------
# Tags
# --------------------------------------------------------------------------

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "o11y-onboarding-platform"
    ManagedBy   = "terraform"
    Environment = "production"
  }
}
