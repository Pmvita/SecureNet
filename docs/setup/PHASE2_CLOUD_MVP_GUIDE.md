# 🚀 SecureNet Phase 2: Cloud MVP Deployment Guide

## 📋 Overview

This guide walks you through deploying SecureNet to AWS cloud infrastructure, creating a production-ready SaaS platform that can serve real customers.

## 🎯 What We'll Accomplish

- **AWS Infrastructure Setup** - VPC, EC2, RDS, ElastiCache, Load Balancer
- **Production Deployment** - Docker containers, Nginx, SSL
- **Monitoring & Alerting** - CloudWatch, logging, health checks
- **Security Configuration** - Security groups, IAM roles, encryption
- **Domain & SSL Setup** - Custom domain with HTTPS

---

## 📋 Prerequisites

### 1. AWS Account Setup

1. **Create AWS Account**
   ```bash
   # Go to aws.amazon.com and create account
   # Enable MFA for root user
   # Set up billing alerts
   ```

2. **Install AWS CLI**
   ```bash
   # macOS
   brew install awscli
   
   # Ubuntu
   sudo apt-get install awscli
   ```

3. **Configure AWS Credentials**
   ```bash
   aws configure
   # Enter your Access Key ID
   # Enter your Secret Access Key
   # Default region: us-east-1
   # Default output: json
   ```

### 2. Install Terraform

```bash
# macOS
brew install terraform

# Ubuntu
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install terraform
```

### 3. Domain Name (Optional but Recommended)

Purchase a domain name (e.g., `securenet.com`, `securenet.cloud`) for professional appearance.

---

## 🏗️ Infrastructure Architecture

```
Internet
    ↓
Route 53 (DNS)
    ↓
Application Load Balancer
    ↓
EC2 Instance (t3.medium)
├── SecureNet API (Port 8000)
├── SecureNet Frontend (Port 3000)
└── Nginx (Port 80/443)
    ↓
Private Subnet
├── RDS PostgreSQL (Port 5432)
└── ElastiCache Redis (Port 6379)
```

### **Estimated Monthly Costs (us-east-1)**
- **EC2 t3.medium**: ~$30/month
- **RDS db.t3.micro**: ~$15/month
- **ElastiCache cache.t3.micro**: ~$15/month
- **Load Balancer**: ~$20/month
- **Data Transfer**: ~$10/month
- **Total**: ~$90/month

---

## 🚀 Deployment Steps

### Step 1: Prepare Your Environment

```bash
# Navigate to terraform directory
cd terraform

# Make deployment script executable
chmod +x deploy.sh
```

### Step 2: Run Deployment

```bash
# Execute the deployment script
./deploy.sh
```

The script will:
1. ✅ Check prerequisites
2. 🔑 Generate SSH key pair
3. 🏗️ Initialize Terraform
4. ☁️ Deploy AWS infrastructure
5. 📦 Upload application code
6. 📊 Setup monitoring
7. 🌐 Display access information

### Step 3: Verify Deployment

After deployment completes, you'll see output like:

```
🌐 Application URLs:
   Load Balancer: http://securenet-alb-123456789.us-east-1.elb.amazonaws.com
   EC2 Instance:  http://3.123.45.67

🗄️  Database:
   RDS Endpoint:  securenet-postgres.c123456789.us-east-1.rds.amazonaws.com:5432
   Redis Endpoint: securenet-redis.c123456789.cache.amazonaws.com:6379

🔑 SSH Access:
   ssh -i securenet ubuntu@3.123.45.67
```

---

## 🔧 Post-Deployment Configuration

### 1. Domain Configuration

If you have a domain name:

```bash
# Get your load balancer DNS name
terraform output alb_dns_name

# In your domain registrar, create CNAME record:
# securenet.yourdomain.com → [load-balancer-dns-name]
```

### 2. SSL Certificate Setup

```bash
# Connect to EC2 instance
ssh -i securenet ubuntu@[EC2-IP]

# Install Certbot (if not already installed)
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d securenet.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 3. Environment Configuration

```bash
# SSH into your EC2 instance
ssh -i securenet ubuntu@[EC2-IP]

# Check application status
sudo systemctl status securenet

# View logs
sudo journalctl -u securenet -f

# Check Nginx status
sudo systemctl status nginx
```

---

## 📊 Monitoring & Alerting

### 1. CloudWatch Dashboard

Access your monitoring dashboard:
- **URL**: https://console.aws.amazon.com/cloudwatch
- **Dashboard**: SecureNet-Production

### 2. Set Up Billing Alerts

```bash
# Create billing alarm (via AWS Console)
# Go to: CloudWatch → Alarms → Create Alarm
# Metric: Billing → Total Estimated Charge
# Threshold: $100 (or your preferred limit)
```

### 3. Application Health Checks

```bash
# Test health endpoint
curl http://[load-balancer-dns]/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-01-31T12:00:00Z",
  "version": "1.0.0"
}
```

---

## 🔒 Security Configuration

### 1. Security Groups

The deployment creates secure security groups:
- **ALB**: Allows HTTP/HTTPS from internet
- **EC2**: Allows traffic from ALB + SSH
- **RDS**: Allows PostgreSQL from EC2 only
- **Redis**: Allows Redis from EC2 only

### 2. IAM Roles

Create IAM role for EC2 instance:

```bash
# Create IAM role for EC2
aws iam create-role --role-name SecureNetEC2Role --assume-role-policy-document '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}'

# Attach policies
aws iam attach-role-policy --role-name SecureNetEC2Role --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy
aws iam attach-role-policy --role-name SecureNetEC2Role --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

# Create instance profile
aws iam create-instance-profile --instance-profile-name SecureNetEC2Profile
aws iam add-role-to-instance-profile --instance-profile-name SecureNetEC2Profile --role-name SecureNetEC2Role
```

### 3. Database Security

```bash
# Connect to RDS and update passwords
psql -h [rds-endpoint] -U securenet -d securenet

# Change default passwords
ALTER USER securenet PASSWORD 'new-secure-password';
```

---

## 🧪 Testing Your Deployment

### 1. Application Testing

```bash
# Test frontend
curl -I http://[load-balancer-dns]

# Test API
curl http://[load-balancer-dns]/api/health

# Test database connection
curl http://[load-balancer-dns]/api/health/db
```

### 2. Load Testing

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test with 100 requests
ab -n 100 -c 10 http://[load-balancer-dns]/
```

### 3. Security Testing

```bash
# Test SSL (if configured)
curl -I https://securenet.yourdomain.com

# Test security headers
curl -I http://[load-balancer-dns] | grep -E "(X-Frame-Options|X-Content-Type-Options|X-XSS-Protection)"
```

---

## 🔄 Maintenance & Updates

### 1. Application Updates

```bash
# SSH into EC2
ssh -i securenet ubuntu@[EC2-IP]

# Pull latest code
cd /opt/securenet
git pull origin main

# Rebuild and restart
sudo systemctl restart securenet
```

### 2. Infrastructure Updates

```bash
# Update Terraform configuration
cd terraform
terraform plan
terraform apply
```

### 3. Backup Strategy

```bash
# RDS automated backups (already configured)
# Manual backup
aws rds create-db-snapshot \
  --db-instance-identifier securenet-postgres \
  --db-snapshot-identifier securenet-backup-$(date +%Y%m%d)
```

---

## 🚨 Troubleshooting

### Common Issues

#### 1. Application Not Starting

```bash
# Check service status
sudo systemctl status securenet

# View logs
sudo journalctl -u securenet -f

# Check Docker containers
docker ps -a
docker logs [container-id]
```

#### 2. Database Connection Issues

```bash
# Test database connectivity
telnet [rds-endpoint] 5432

# Check security groups
aws ec2 describe-security-groups --group-ids [security-group-id]
```

#### 3. Load Balancer Health Check Failing

```bash
# Check target group health
aws elbv2 describe-target-health --target-group-arn [target-group-arn]

# Test health endpoint directly
curl http://[ec2-ip]:8000/health
```

---

## 📈 Scaling Considerations

### 1. Horizontal Scaling

```bash
# Create Auto Scaling Group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name securenet-asg \
  --launch-template LaunchTemplateId=[template-id] \
  --min-size 1 \
  --max-size 5 \
  --desired-capacity 2 \
  --vpc-zone-identifier [subnet-ids]
```

### 2. Database Scaling

```bash
# Scale RDS instance
aws rds modify-db-instance \
  --db-instance-identifier securenet-postgres \
  --db-instance-class db.t3.small
```

### 3. CDN Setup

```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json
```

---

## 💰 Cost Optimization

### 1. Reserved Instances

```bash
# Purchase reserved instances for cost savings
# Go to: EC2 → Reserved Instances → Purchase Reserved Instances
```

### 2. Spot Instances

```bash
# Use spot instances for non-critical workloads
# Modify launch template to use spot instances
```

### 3. S3 Lifecycle Policies

```bash
# Set up S3 lifecycle for cost optimization
aws s3api put-bucket-lifecycle-configuration \
  --bucket securenet-logs \
  --lifecycle-configuration file://lifecycle-policy.json
```

---

## 🎯 Next Steps

### Phase 3: Production Platform

1. **Multi-tenant Architecture**
   - Customer isolation
   - Resource quotas
   - Billing integration

2. **Advanced Monitoring**
   - Application performance monitoring
   - Error tracking (Sentry)
   - User analytics

3. **CI/CD Pipeline**
   - Automated testing
   - Blue-green deployments
   - Rollback capabilities

4. **Customer Support**
   - Help desk integration
   - Knowledge base
   - Training materials

---

## 📞 Support

### Getting Help

1. **AWS Support**: https://aws.amazon.com/support/
2. **Terraform Documentation**: https://www.terraform.io/docs
3. **SecureNet Documentation**: `/docs/` directory

### Emergency Contacts

- **AWS Account**: [Your AWS Account ID]
- **Domain Registrar**: [Your domain provider]
- **SSL Certificate**: Let's Encrypt (automatic)

---

## ✅ Deployment Checklist

- [ ] AWS account created and configured
- [ ] Terraform installed
- [ ] Domain name purchased (optional)
- [ ] Deployment script executed
- [ ] Application accessible via load balancer
- [ ] SSL certificate configured (if domain)
- [ ] Monitoring dashboard created
- [ ] Billing alerts configured
- [ ] Security groups verified
- [ ] Database backups enabled
- [ ] Application tested thoroughly
- [ ] Documentation updated

---

**🎉 Congratulations! You now have a production-ready SecureNet deployment in the cloud!**

Your application is ready to serve real customers and generate revenue. The next step is to market your platform and start acquiring customers. 