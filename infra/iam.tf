resource "aws_iam_role" "execution" {
    name = "${var.app_name}-ecs-execution"

    assume_role_policy = jsonencode({
        Version = "2012-10-17"
        Statement = [{
            Effect = "Allow"
            Action = "sts:AssumeRole"
            Principal = { Service = "ecs-tasks.amazonaws.com" }
        }]
    })
}

resource "aws_iam_role_policy_attachment" "execution" {
    role = aws_iam_role.execution.name
    policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "execution_secrets" {
    name = "read-secrets"
    role = aws_iam_role.execution.id

    policy = jsonencode({
        Version = "2012-10-17"
        Statement = [{
            Effect = "Allow"
            Action = "ssm:GetParameters"
            Resource = [for param in aws_ssm_parameter.secret : param.arn]
        }]
    })
}
