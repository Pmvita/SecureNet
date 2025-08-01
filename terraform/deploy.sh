#!/bin/bash

# SecureNet Phase 2: Cloud MVP Deployment Script
# This script deploys SecureNet to AWS using Terraform

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Run 'aws configure' first."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Generate SSH key pair
generate_ssh_key() {
    log_info "Generating SSH key pair..."
    
    if [ ! -f "securenet.pub" ]; then
        ssh-keygen -t rsa -b 4096 -f securenet -N "" -C "securenet@aws"
        log_success "SSH key pair generated"
    else
        log_warning "SSH key pair already exists"
    fi
}

# Initialize Terraform
init_terraform() {
    log_info "Initializing Terraform..."
    
    # Create S3 bucket for Terraform state (if it doesn't exist)
    BUCKET_NAME="securenet-terraform-state"
    if ! aws s3 ls "s3://$BUCKET_NAME" &> /dev/null; then
        log_info "Creating S3 bucket for Terraform state..."
        aws s3 mb "s3://$BUCKET_NAME" --region us-east-1
        aws s3api put-bucket-versioning --bucket "$BUCKET_NAME" --versioning-configuration Status=Enabled
        aws s3api put-bucket-encryption --bucket "$BUCKET_NAME" --server-side-encryption-configuration '{
            "Rules": [
                {
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }
            ]
        }'
        log_success "S3 bucket created"
    fi
    
    # Initialize Terraform
    terraform init
    log_success "Terraform initialized"
}

# Deploy infrastructure
deploy_infrastructure() {
    log_info "Deploying infrastructure..."
    
    # Generate a secure database password
    DB_PASSWORD=$(openssl rand -base64 32)
    
    # Plan the deployment
    log_info "Planning Terraform deployment..."
    terraform plan -var="db_password=$DB_PASSWORD" -out=tfplan
    
    # Ask for confirmation
    echo
    log_warning "This will create AWS resources that may incur costs."
    read -p "Do you want to proceed with the deployment? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Applying Terraform plan..."
        terraform apply tfplan
        
        # Save the database password
        echo "$DB_PASSWORD" > .db_password
        chmod 600 .db_password
        log_success "Database password saved to .db_password"
        
        log_success "Infrastructure deployed successfully!"
    else
        log_warning "Deployment cancelled"
        exit 0
    fi
}

# Get deployment outputs
get_outputs() {
    log_info "Getting deployment outputs..."
    
    ALB_DNS=$(terraform output -raw alb_dns_name)
    EC2_IP=$(terraform output -raw ec2_public_ip)
    RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
    REDIS_ENDPOINT=$(terraform output -raw redis_endpoint)
    
    echo
    log_success "Deployment completed successfully!"
    echo
    echo "🌐 Application URLs:"
    echo "   Load Balancer: http://$ALB_DNS"
    echo "   EC2 Instance:  http://$EC2_IP"
    echo
    echo "🗄️  Database:"
    echo "   RDS Endpoint:  $RDS_ENDPOINT"
    echo "   Redis Endpoint: $REDIS_ENDPOINT"
    echo
    echo "🔑 SSH Access:"
    echo "   ssh -i securenet ubuntu@$EC2_IP"
    echo
    echo "📊 Monitoring:"
    echo "   AWS Console: https://console.aws.amazon.com"
    echo "   CloudWatch:  https://console.aws.amazon.com/cloudwatch"
    echo
}

# Upload application code
upload_code() {
    log_info "Preparing to upload application code..."
    
    # Create deployment package
    log_info "Creating deployment package..."
    tar -czf securenet-app.tar.gz \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='*.pyc' \
        --exclude='__pycache__' \
        --exclude='.env' \
        --exclude='logs' \
        --exclude='*.log' \
        .
    
    # Upload to S3
    BUCKET_NAME="securenet-app-$(date +%Y%m%d)"
    log_info "Creating S3 bucket for application code..."
    aws s3 mb "s3://$BUCKET_NAME" --region us-east-1
    
    log_info "Uploading application code to S3..."
    aws s3 cp securenet-app.tar.gz "s3://$BUCKET_NAME/"
    
    log_success "Application code uploaded to s3://$BUCKET_NAME/securenet-app.tar.gz"
    
    # Clean up
    rm securenet-app.tar.gz
}

# Setup monitoring and alerts
setup_monitoring() {
    log_info "Setting up monitoring and alerts..."
    
    # Create CloudWatch dashboard
    cat > cloudwatch-dashboard.json << 'EOF'
{
    "widgets": [
        {
            "type": "metric",
            "x": 0,
            "y": 0,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    ["AWS/EC2", "CPUUtilization", "AutoScalingGroupName", "securenet-asg"],
                    [".", "NetworkIn", ".", "."],
                    [".", "NetworkOut", ".", "."]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "us-east-1",
                "title": "EC2 Metrics"
            }
        },
        {
            "type": "metric",
            "x": 12,
            "y": 0,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", "securenet-postgres"],
                    [".", "DatabaseConnections", ".", "."],
                    [".", "FreeableMemory", ".", "."]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "us-east-1",
                "title": "RDS Metrics"
            }
        }
    ]
}
EOF
    
    # Create CloudWatch dashboard
    aws cloudwatch put-dashboard \
        --dashboard-name "SecureNet-Production" \
        --dashboard-body file://cloudwatch-dashboard.json
    
    log_success "CloudWatch dashboard created"
}

# Main deployment process
main() {
    echo "🚀 SecureNet Phase 2: Cloud MVP Deployment"
    echo "============================================="
    echo
    
    check_prerequisites
    generate_ssh_key
    init_terraform
    deploy_infrastructure
    upload_code
    setup_monitoring
    get_outputs
    
    echo
    log_success "Phase 2 deployment completed!"
    echo
    echo "Next steps:"
    echo "1. Configure your domain name to point to the load balancer"
    echo "2. Set up SSL certificate using AWS Certificate Manager"
    echo "3. Configure billing alerts in AWS"
    echo "4. Test the application thoroughly"
    echo "5. Set up customer onboarding process"
    echo
}

# Run main function
main "$@" 