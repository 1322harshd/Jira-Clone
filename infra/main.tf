terraform {
    required_version = ">= 1.5"

    required_providers{
        aws = {
            source = "hashicorp/aws"
            version = "~> 5.0"
        }
    }

    backend "s3" {
        bucket = "cd-terraform-state-bucket"
        key = "jira-clone/terraform.tfstate"
        region = "ap-southeast-2"
    }
}

provider "aws" {
    region = var.region
}

data "aws_vpc" "default" {
    default = true
}

data "aws_subnets" "default" {
    filter {
        name = "vpc-id"
        values = [data.aws_vpc.default.id]
    }
}

data "aws_ecr_repository" "app" {
    name = var.ecr_repository
}

resource "aws_security_group" "app" {
    name = "${var.app_name}-ecs"
    description = "Allow HTTP to the ${var.app_name} container"
    vpc_id = data.aws_vpc.default.id

    ingress {
        from_port = 3000
        to_port = 3000
        protocol = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
    }

    egress {
        from_port = 0
        to_port = 0
        protocol = "-1"
        cidr_blocks = ["0.0.0.0/0"]
    }
}

resource "aws_cloudwatch_log_group" "app" {
    name = "/ecs/${var.app_name}"
    retention_in_days = 3
}

locals{
    secrets = {
        DATABASE_URL = var.database_url
        JWT_SECRET = var.jwt_secret
        JWT_REFRESH_SECRET = var.jwt_refresh_secret
        CLOUDINARY_URL = var.cloudinary_url
    }
}

resource "aws_ssm_parameter" "secret" {
    for_each = nonsensitive(toset(keys(local.secrets)))

    name = "/${var.app_name}/${each.key}"
    type = "SecureString"
    value = local.secrets[each.key]
}

resource "aws_ecs_cluster" "main" {
    name = var.app_name
}

resource "aws_ecs_task_definition" "app" {
    family = var.app_name
    requires_compatibilities = ["FARGATE"]
    network_mode = "awsvpc"
    cpu = 256
    memory = 512
    execution_role_arn = aws_iam_role.execution.arn

    runtime_platform {
        operating_system_family = "LINUX"
        cpu_architecture = "X86_64"
    }
        container_definitions = jsonencode([
            {
                name = var.app_name
                image = "${data.aws_ecr_repository.app.repository_url}:${var.image_tag}"
                essential = true

                portMappings = [
                    { containerPort = 3000, protocol = "tcp" }
                ]

                environment = [
                    { name = "NODE_ENV", value = "production" },
                    { name = "PORT", value = "3000" },
                    { name = "ORIGIN", value = var.origin },
                ]

                secrets = [
                    for key, param in aws_ssm_parameter.secret : { name = key, valueFrom = param.arn }
                ]

                logConfiguration = {
                    logDriver = "awslogs"
                    options = {
                        "awslogs-group" = aws_cloudwatch_log_group.app.name
                        "awslogs-region" = var.region
                        "awslogs-stream-prefix" = "app"
                    }
                }
            }
        ])
    }

resource "aws_ecs_service" "app" {
    name = var.app_name
    cluster = aws_ecs_cluster.main.id
    task_definition = aws_ecs_task_definition.app.arn
    desired_count = 1
    launch_type = "FARGATE"

    network_configuration {
        subnets = data.aws_subnets.default.ids
        security_groups = [aws_security_group.app.id]
        assign_public_ip = true
    }

    lifecycle {
        ignore_changes = [task_definition]
    }
}

