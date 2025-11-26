import fs from 'fs/promises';

/**
 * 🏗️ InfrastructureAsCodeTool - Enables JOE to manage cloud infrastructure by generating and simulating
 * Infrastructure as Code (IaC) configurations, primarily focusing on Terraform.
 */
class InfrastructureAsCodeTool {
    constructor(dependencies) {
        this.dependencies = dependencies;
        this._initializeMetadata();
    }

    _initializeMetadata() {
        this.generateIacConfig.metadata = {
            name: "generateIacConfig",
            description: "Generates a basic Infrastructure as Code configuration (e.g., Terraform) for common cloud resources based on a text description.",
            parameters: {
                type: "object",
                properties: {
                    provider: {
                        type: "string",
                        enum: ["AWS", "AZURE", "GCP"],
                        description: "The cloud provider for the infrastructure."
                    },
                    resourceType: {
                        type: "string",
                        enum: ["SERVER", "DATABASE", "NETWORK"],
                        description: "The type of cloud resource to configure."
                    },
                    configurationDetails: {
                        type: "string",
                        description: "A detailed description of the resource configuration (e.g., 't2.micro instance, Ubuntu 20.04, 80/443 open')."
                    },
                    outputFilePath: {
                        type: "string",
                        description: "The absolute path where the generated configuration file (e.g., main.tf) should be saved."
                    }
                },
                required: ["provider", "resourceType", "configurationDetails", "outputFilePath"]
            }
        };
    }

    _generateTerraform(provider, resourceType, details) {
        let config = `
terraform {
  required_providers {
    ${provider.toLowerCase()} = {
      source  = "hashicorp/${provider.toLowerCase()}"
      version = "~> 4.0"
    }
  }
}

	provider "${provider.toLowerCase()}" {
	  # Configuration is typically done via environment variables
	  region = "${provider === 'AZURE' ? 'eastus' : provider === 'GCP' ? 'us-central1' : 'us-east-1'}" 
	}
`;

        if (resourceType === "SERVER" && provider === "AWS") {
            config += `
# Resource: EC2 Instance
resource "aws_instance" "web_server" {
  ami           = "ami-0abcdef1234567890" # Placeholder AMI
  instance_type = "t2.micro"
  tags = {
    Name = "GeneratedWebServer"
    Description = "${details}"
  }
}
`;
        } else if (resourceType === "DATABASE" && provider === "AWS") {
            config += `
# Resource: RDS PostgreSQL Database
resource "aws_db_instance" "db_instance" {
  allocated_storage    = 20
  engine               = "postgres"
  engine_version       = "14.5"
  instance_class       = "db.t3.micro"
  name                 = "mydb"
  username             = "postgres"
  password             = "password" # Placeholder - use secrets manager in production
  skip_final_snapshot  = true
  tags = {
    Description = "${details}"
  }
}
`;
        } else if (resourceType === "SERVER" && provider === "AZURE") {
            config += `
# Resource: Azure Virtual Machine
resource "azurerm_resource_group" "rg" {
  name     = "GeneratedResourceGroup"
  location = "East US"
}

resource "azurerm_virtual_machine" "vm" {
  name                  = "GeneratedVM"
  location              = azurerm_resource_group.rg.location
  resource_group_name   = azurerm_resource_group.rg.name
  vm_size               = "Standard_DS1_v2"
  network_interface_ids = [] # Placeholder
  
  storage_image_reference {
    publisher = "Canonical"
    offer     = "UbuntuServer"
    sku       = "18.04-LTS"
    version   = "latest"
  }
  
  os_profile {
    computer_name  = "hostname"
    admin_username = "adminuser"
    admin_password = "Password1234!" # Placeholder
  }
  
  tags = {
    Description = "${details}"
  }
}
`;
        } else {
            config += `
# Note: The requested resource type (${resourceType}) for provider (${provider}) is not yet fully implemented.
# Configuration details: ${details}
`;
        }

        return config;
    }

    async generateIacConfig({ provider, resourceType, configurationDetails, outputFilePath }) {
        const config = this._generateTerraform(provider, resourceType, configurationDetails);

        try {
            await fs.writeFile(outputFilePath, config, 'utf-8');
            return {
                success: true,
                message: `Successfully generated basic ${provider} ${resourceType} configuration (Terraform) and saved it to ${outputFilePath}.`,
                outputFile: outputFilePath
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to save generated configuration to ${outputFilePath}. Error: ${error.message}`
            };
        }
    }
}

export default InfrastructureAsCodeTool;
