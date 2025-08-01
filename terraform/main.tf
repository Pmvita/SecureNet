# SecureNet AWS Infrastructure
# Phase 2: Cloud MVP Deployment

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "securenet-terraform-state"
    key    = "phase2-mvp/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "SecureNet"
      Environment = "production"
      ManagedBy   = "terraform"
    }
  }
}

# VPC and Networking
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"
  
  name = "securenet-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = ["${var.aws_region}a", "${var.aws_region}b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
  
  enable_nat_gateway = true
  single_nat_gateway = true
  
  enable_dns_hostnames = true
  enable_dns_support   = true
}

# Security Groups
resource "aws_security_group" "securenet_alb" {
  name        = "securenet-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = module.vpc.vpc_id
  
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "securenet_ec2" {
  name        = "securenet-ec2-sg"
  description = "Security group for SecureNet EC2 instances"
  vpc_id      = module.vpc.vpc_id
  
  ingress {
    description     = "HTTP from ALB"
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.securenet_alb.id]
  }
  
  ingress {
    description     = "HTTPS from ALB"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.securenet_alb.id]
  }
  
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# RDS PostgreSQL Database
resource "aws_security_group" "securenet_rds" {
  name        = "securenet-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = module.vpc.vpc_id
  
  ingress {
    description     = "PostgreSQL from EC2"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.securenet_ec2.id]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_subnet_group" "securenet" {
  name       = "securenet-db-subnet-group"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_db_instance" "securenet" {
  identifier = "securenet-postgres"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.micro"
  
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp2"
  storage_encrypted     = true
  
  db_name  = "securenet"
  username = "securenet"
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.securenet_rds.id]
  db_subnet_group_name   = aws_db_subnet_group.securenet.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = true
  deletion_protection = false
  
  tags = {
    Name = "SecureNet PostgreSQL"
  }
}

# ElastiCache Redis
resource "aws_security_group" "securenet_redis" {
  name        = "securenet-redis-sg"
  description = "Security group for ElastiCache Redis"
  vpc_id      = module.vpc.vpc_id
  
  ingress {
    description     = "Redis from EC2"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.securenet_ec2.id]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_elasticache_subnet_group" "securenet" {
  name       = "securenet-redis-subnet-group"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_elasticache_cluster" "securenet" {
  cluster_id           = "securenet-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  
  security_group_ids = [aws_security_group.securenet_redis.id]
  subnet_group_name  = aws_elasticache_subnet_group.securenet.name
}

# EC2 Instance for SecureNet
data "aws_ami" "ubuntu" {
  most_recent = true
  
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-22.04-amd64-server-*"]
  }
  
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
  
  owners = ["099720109477"] # Canonical
}

resource "aws_instance" "securenet" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  
  subnet_id                   = module.vpc.public_subnets[0]
  vpc_security_group_ids      = [aws_security_group.securenet_ec2.id]
  associate_public_ip_address = true
  
  key_name = aws_key_pair.securenet.key_name
  
  root_block_device {
    volume_size = 30
    volume_type = "gp3"
    encrypted   = true
  }
  
  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    db_host     = aws_db_instance.securenet.endpoint
    db_name     = aws_db_instance.securenet.db_name
    db_user     = aws_db_instance.securenet.username
    db_password = aws_db_instance.securenet.password
    redis_host  = aws_elasticache_cluster.securenet.cache_nodes[0].address
    redis_port  = aws_elasticache_cluster.securenet.cache_nodes[0].port
  }))
  
  tags = {
    Name = "SecureNet Application Server"
  }
}

# SSH Key Pair
resource "aws_key_pair" "securenet" {
  key_name   = "securenet-key"
  public_key = file("${path.module}/securenet.pub")
}

# Application Load Balancer
resource "aws_lb" "securenet" {
  name               = "securenet-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.securenet_alb.id]
  subnets            = module.vpc.public_subnets
  
  enable_deletion_protection = false
}

resource "aws_lb_target_group" "securenet" {
  name     = "securenet-tg"
  port     = 8000
  protocol = "HTTP"
  vpc_id   = module.vpc.vpc_id
  
  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }
}

resource "aws_lb_target_group_attachment" "securenet" {
  target_group_arn = aws_lb_target_group.securenet.arn
  target_id        = aws_instance.securenet.id
  port             = 8000
}

resource "aws_lb_listener" "securenet_http" {
  load_balancer_arn = aws_lb.securenet.arn
  port              = "80"
  protocol          = "HTTP"
  
  default_action {
    type = "redirect"
    
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# S3 Bucket for Terraform State
resource "aws_s3_bucket" "terraform_state" {
  bucket = "securenet-terraform-state"
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Outputs
output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.securenet.dns_name
}

output "ec2_public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.securenet.public_ip
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.securenet.endpoint
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = aws_elasticache_cluster.securenet.cache_nodes[0].address
}