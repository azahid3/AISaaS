#!/bin/bash

# Khaana AI AWS Deployment Script
# This script deploys the complete infrastructure and application to AWS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STACK_NAME="khaana-ai-stack"
REGION="us-east-1"
ENVIRONMENT="production"
DOMAIN_NAME="khaana-ai.com"
KEY_PAIR_NAME="khaana-ai-keypair"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if AWS CLI is installed and configured
check_aws_cli() {
    print_status "Checking AWS CLI installation..."
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    print_success "AWS CLI is installed and configured"
}

# Function to check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    local missing_deps=()
    
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_error "Please install the missing dependencies and try again."
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Function to create EC2 Key Pair
create_key_pair() {
    print_status "Creating EC2 Key Pair..."
    
    if aws ec2 describe-key-pairs --key-names "$KEY_PAIR_NAME" --region "$REGION" &> /dev/null; then
        print_warning "Key pair $KEY_PAIR_NAME already exists"
    else
        aws ec2 create-key-pair --key-name "$KEY_PAIR_NAME" --region "$REGION" --query 'KeyMaterial' --output text > "${KEY_PAIR_NAME}.pem"
        chmod 400 "${KEY_PAIR_NAME}.pem"
        print_success "Key pair created: ${KEY_PAIR_NAME}.pem"
    fi
}

# Function to build and push Docker image
build_and_push_image() {
    print_status "Building and pushing Docker image..."
    
    # Create ECR repository if it doesn't exist
    local ecr_repo="khaana-ai-backend"
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    local ecr_uri="${account_id}.dkr.ecr.${REGION}.amazonaws.com/${ecr_repo}"
    
    # Create ECR repository
    aws ecr describe-repositories --repository-names "$ecr_repo" --region "$REGION" &> /dev/null || \
    aws ecr create-repository --repository-name "$ecr_repo" --region "$REGION"
    
    # Login to ECR
    aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ecr_uri"
    
    # Build and push image
    cd backend
    docker build -t "$ecr_repo" .
    docker tag "$ecr_repo:latest" "$ecr_uri:latest"
    docker push "$ecr_uri:latest"
    cd ..
    
    print_success "Docker image pushed to ECR: $ecr_uri"
}

# Function to deploy CloudFormation stack
deploy_infrastructure() {
    print_status "Deploying infrastructure with CloudFormation..."
    
    # Generate random password for database
    local db_password=$(openssl rand -base64 32)
    
    # Deploy CloudFormation stack
    aws cloudformation deploy \
        --template-file aws/cloudformation-template.yaml \
        --stack-name "$STACK_NAME" \
        --parameter-overrides \
            Environment="$ENVIRONMENT" \
            DomainName="$DOMAIN_NAME" \
            KeyPairName="$KEY_PAIR_NAME" \
            DBPassword="$db_password" \
        --capabilities CAPABILITY_IAM \
        --region "$REGION"
    
    print_success "Infrastructure deployed successfully"
}

# Function to get stack outputs
get_stack_outputs() {
    print_status "Getting stack outputs..."
    
    local alb_dns=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
        --output text)
    
    local s3_bucket=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`S3BucketName`].OutputValue' \
        --output text)
    
    local cloudfront_url=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' \
        --output text)
    
    echo "ALB_DNS=$alb_dns" > .env.aws
    echo "S3_BUCKET=$s3_bucket" >> .env.aws
    echo "CLOUDFRONT_URL=$cloudfront_url" >> .env.aws
    
    print_success "Stack outputs saved to .env.aws"
}

# Function to deploy frontend to S3
deploy_frontend() {
    print_status "Deploying frontend to S3..."
    
    # Build frontend (if needed)
    if [ -f "package.json" ]; then
        npm install
        npm run build
    fi
    
    # Upload to S3
    local s3_bucket=$(grep S3_BUCKET .env.aws | cut -d'=' -f2)
    aws s3 sync . s3://"$s3_bucket" --exclude "backend/*" --exclude "aws/*" --exclude "*.pem" --exclude ".env*"
    
    print_success "Frontend deployed to S3"
}

# Function to setup database
setup_database() {
    print_status "Setting up database..."
    
    # Get database endpoint
    local db_endpoint=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
        --output text)
    
    print_success "Database endpoint: $db_endpoint"
    print_warning "Please manually configure your application to connect to the database"
}

# Function to run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # This would typically be done by connecting to an EC2 instance
    # For now, we'll just print instructions
    print_warning "To run migrations, SSH into an EC2 instance and run:"
    print_warning "cd /opt/khaana-ai && npm run migrate"
}

# Function to create deployment summary
create_summary() {
    print_status "Creating deployment summary..."
    
    local alb_dns=$(grep ALB_DNS .env.aws | cut -d'=' -f2)
    local cloudfront_url=$(grep CLOUDFRONT_URL .env.aws | cut -d'=' -f2)
    
    cat > DEPLOYMENT_SUMMARY.md << EOF
# Khaana AI Deployment Summary

## 🚀 Deployment Completed Successfully!

### Infrastructure Details
- **Stack Name**: $STACK_NAME
- **Region**: $REGION
- **Environment**: $ENVIRONMENT

### Access URLs
- **Load Balancer**: http://$alb_dns
- **CloudFront**: $cloudfront_url
- **Health Check**: http://$alb_dns/health

### Next Steps
1. Configure your domain to point to the CloudFront distribution
2. Set up SSL certificates for HTTPS
3. Configure environment variables on EC2 instances
4. Run database migrations
5. Test the application

### Useful Commands
\`\`\`bash
# SSH into EC2 instance
ssh -i ${KEY_PAIR_NAME}.pem ec2-user@<EC2-IP>

# View CloudFormation stack
aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION

# View stack outputs
aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].Outputs'
\`\`\`

### Security Notes
- Keep your ${KEY_PAIR_NAME}.pem file secure
- Change default database passwords
- Configure proper security groups
- Enable CloudTrail for audit logging

---
Deployed on: $(date)
EOF
    
    print_success "Deployment summary created: DEPLOYMENT_SUMMARY.md"
}

# Main deployment function
main() {
    print_status "Starting Khaana AI deployment to AWS..."
    
    # Check prerequisites
    check_aws_cli
    check_dependencies
    
    # Create key pair
    create_key_pair
    
    # Build and push Docker image
    build_and_push_image
    
    # Deploy infrastructure
    deploy_infrastructure
    
    # Get stack outputs
    get_stack_outputs
    
    # Deploy frontend
    deploy_frontend
    
    # Setup database
    setup_database
    
    # Run migrations
    run_migrations
    
    # Create summary
    create_summary
    
    print_success "🎉 Deployment completed successfully!"
    print_status "Check DEPLOYMENT_SUMMARY.md for details and next steps"
}

# Run main function
main "$@"
