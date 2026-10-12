variable "region" {
    type = string
    default = "ap-southeast-2"
}

variable "app_name" {
    type = string
    default = "jira-clone"
}

variable "ecr_repository" {
    type = string
    default = "prod/jira_clone"
}

variable "image_tag" {
    type = string
    default = "1c5ae5b22247404ff0391e269bcd0d9ecc07a183"
}

variable "origin" {
    description = "Frontend URL allowed by CORS"
    type = string
    default = "http://localhost:5173"
}

variable "database_url" {
    type = string
    sensitive = true
}

variable "jwt_secret" {
    type = string
    sensitive = true
}

variable "jwt_refresh_secret" {
    type = string
    sensitive = true
}

variable "cloudinary_url" {
    type = string
    sensitive = true
}