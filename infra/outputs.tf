output "cluster" {
    value = aws_ecs_cluster.main.name
}

output "service" {
    value = aws_ecs_service.app.name
}

output "task_family" {
    value = aws_ecs_task_definition.app.family
}

output "log_group" {
    value = aws_cloudwatch_log_group.app.name
}

