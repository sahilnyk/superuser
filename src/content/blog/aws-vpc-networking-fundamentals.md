---
title: "AWS VPC Networking: Subnets, Route Tables, and Internet Gateways Demystified"
description: "Building a VPC from scratch teaches you more about networking than any tutorial. Here's what actually matters when setting up your AWS network."
publishedAt: 2024-12-03
draft: false
---

When you spin up EC2 instances in AWS, they need to live somewhere. That somewhere is a VPC (Virtual Private Cloud) - your own isolated network in the AWS cloud.

## The VPC Basics

A VPC is just a chunk of IP addresses you define. Pick a CIDR block like `10.0.0.0/16` and you get 65,536 IP addresses to work with.

```hcl
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  
  tags = {
    Name = "production-vpc"
  }
}
```

But a VPC alone doesn't do much. You need subnets, route tables, and gateways to make it useful.

## Subnets: Public vs Private

Subnets divide your VPC into smaller networks. The key distinction is whether they can talk to the internet:

**Public Subnet**: Has a route to an Internet Gateway, resources get public IPs
**Private Subnet**: No internet access, only internal communication

```hcl
# Public subnet for web servers
resource "aws_subnet" "public" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"
  
  map_public_ip_on_launch = true
}

# Private subnet for databases
resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1a"
}
```

## Internet Gateway: The Front Door

An Internet Gateway (IGW) lets resources in your VPC talk to the internet. Attach it to your VPC:

```hcl
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
}
```

But the IGW alone isn't enough - you need routes.

## Route Tables: Traffic Cops

Route tables tell traffic where to go. The default route table keeps everything internal. You need to add a route pointing to the IGW:

```hcl
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block = "0.0.0.0/0"  # All internet traffic
    gateway_id = aws_internet_gateway.igw.id
  }
}

# Associate with public subnet
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}
```

Now anything in the public subnet can reach the internet and vice versa.

## NAT Gateway: Private Subnet Internet Access

What if your private subnet needs to download updates but shouldn't be reachable from the internet? That's where NAT Gateway comes in:

```hcl
# NAT Gateway needs a public IP
resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public.id  # Lives in public subnet
}

# Private subnet route table points to NAT
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id
  }
}
```

Traffic flow: Private instance → NAT Gateway → Internet Gateway → Internet

The NAT Gateway acts as a middleman, making outbound requests on behalf of private instances but blocking inbound traffic.

## Security Groups: Stateful Firewalls

Security groups control what traffic can reach your instances. They're stateful - if you allow incoming traffic on port 80, the response automatically gets through:

```hcl
resource "aws_security_group" "web" {
  vpc_id = aws_vpc.main.id
  
  # Allow HTTP from anywhere
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  # Allow all outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## Network ACLs: Stateless Backup

Network ACLs are subnet-level firewalls. Unlike security groups, they're stateless - you need explicit rules for inbound AND outbound:

```hcl
resource "aws_network_acl" "main" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = [aws_subnet.public.id]
  
  # Allow HTTP in
  ingress {
    rule_no    = 100
    protocol   = "tcp"
    from_port  = 80
    to_port    = 80
    cidr_block = "0.0.0.0/0"
    action     = "allow"
  }
  
  # Allow HTTP responses out
  egress {
    rule_no    = 100
    protocol   = "tcp"
    from_port  = 1024
    to_port    = 65535
    cidr_block = "0.0.0.0/0"
    action     = "allow"
  }
}
```

## The Mental Model

Think of it like a building:
- **VPC**: The entire building
- **Subnets**: Individual floors
- **Internet Gateway**: Main entrance
- **NAT Gateway**: Service entrance (outbound only)
- **Route Tables**: Elevator directories
- **Security Groups**: Door locks on each room
- **NACLs**: Security guard at each floor

Once you understand how traffic flows through these components, AWS networking clicks. Start with this basic setup, then add complexity as needed - VPC peering, VPN connections, Transit Gateways. But this foundation covers 90% of use cases.
