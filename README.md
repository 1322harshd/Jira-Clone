# Jira Clone — Backend

REST API for a Jira-style project tracker: users create projects, invite members, manage tasks on a board and comment on them. Built with Node.js, Express 5, PostgreSQL and Prisma, tested with Vitest, and deployed to AWS ECS Fargate through a GitHub Actions pipeline with Terraform.

## Tech stack

| Area | Tools |
|---|---|
| Runtime | Node.js 22, Express 5 (ES modules) |
| Database | PostgreSQL (Supabase in production), Prisma ORM |
| Auth | JWT in httpOnly cookies, bcrypt password hashing |
| File uploads | Multer (in memory) → Cloudinary |
| Quality | ESLint, Vitest, Supertest |
| Delivery | Docker, GitHub Actions, Amazon ECR, Amazon ECS Fargate, Terraform |

## Project structure

```
app.js                 Express app: middleware and routers (imported by tests)
server.js              Starts the HTTP server
routes/                One router per feature area
middleware/            JWT cookie authentication
services/              Prisma client, Multer config, Cloudinary upload
utils/                 Token generation, activity logging
prisma/                Schema and migrations
tests/                 Vitest + Supertest tests
scripts/               One-off scripts (local uploads → Cloudinary migration)
infra/                 Terraform for the AWS deployment
.github/workflows/     CI/CD pipeline
Dockerfile             Multi-stage production image
```

## Data model

- **User** — name, email, hashed password, avatar URL.
- **Project** — has an owner and members (`ProjectMember` with role `OWNER` or `MEMBER`).
- **Task** — belongs to a project; has title, description, `status` (`TO_DO`, `IN_PROGRESS`, `DONE`), `priority` (`LOW`, `MEDIUM`, `HIGH`), due date and an optional assignee.
- **Comment** — text on a task, written by a user.
- **Activity** — a log of actions in a project, shown as the "recent activity" feed.
- **RefreshToken** — stored refresh tokens, removed on logout.

## Authentication

Logging in sets two httpOnly cookies:

| Cookie | Lifetime | Used for |
|---|---|---|
| `accessToken` | 1 hour | Sent with every protected request |
| `refreshToken` | 7 days | Exchanged at `POST /refresh` for a new access token |

Clients must send requests with credentials (for example `fetch(url, { credentials: "include" })`). In production the cookies are marked `secure`, so they are only stored over HTTPS.

## API reference

All routes are mounted at the root. "Auth" means a valid `accessToken` cookie is required; without it the response is `401`.

### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/users` | — | Register. Body: `name`, `email`, `password`. `201` on success, `400` if the password is missing, `409` if the email exists. |
| POST | `/login` | — | Log in. Body: `email`, `password`. Sets the auth cookies; `401` on wrong credentials. |
| POST | `/refresh` | refresh cookie | Issues a new `accessToken`. `401` with no refresh cookie, `403` if it is invalid or revoked. |
| POST | `/logout` | Auth | Revokes the refresh token and clears the cookies. |
| POST | `/displayimage` | sign-up cookie | Sets the avatar. Multipart field `image` (image files, max 2 MB) uploads to Cloudinary; or send `avatarOption` to pick a preset avatar. |

### Projects

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/create-project` | Auth | Create a project. Body: `name`, `description`, optional `members` (user IDs). The creator becomes the owner. |
| GET | `/projects` | Auth | Projects the current user belongs to. |
| GET | `/project/:id` | Auth | One project with its details, if the user is a member. |
| GET | `/member-search?q=` | Auth | Search users to invite when creating a project. |
| GET | `/projects/:projectId/member-search?q=` | Auth | Search users who are not yet members of that project. |
| POST | `/projects/:projectId/members` | Auth | Add members. Body: `userIds` (array). |

### Tasks

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/createtask/:projectId` | Auth | Create a task. Body: `title`, `description`, `priority`, `status`, `dueDate`, optional assignee. Project members only. |
| PUT | `/updatetask/:taskId` | Auth | Update any of `title`, `description`, `priority`, `status`, `dueDate`, `assignedToId`. Validates each field (`400` on invalid values). |
| PATCH | `/updatestatus/:taskId` | Auth | Change only the status (used for drag-and-drop on the board). Body: `status`. |
| DELETE | `/deletetask/:taskId` | Auth | Delete a task. Project members only. |

### Comments

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/getcomments/:taskId` | Auth | Comments on a task. |
| POST | `/comment/:taskId` | Auth | Add a comment. Body: `content`. |
| DELETE | `/deletecomment/:commentId` | Auth | Delete a comment. Only its author; others get `403`. |

### Dashboard and search

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/dashboard` | Auth | Summary for the current user (counts and overview data). |
| GET | `/dashboard/tasks` | Auth | The user's tasks grouped by status. |
| GET | `/recentactivity` | Auth | Recent activity across the user's projects. |
| GET | `/search?q=` | Auth | Case-insensitive search across the user's projects and tasks. Returns `{ projects, tasks }`. |

### Settings

| Method | Path | Auth | Description |
|---|---|---|---|
| PUT | `/updatedetails` | Auth | Update `name` and `email`. |
| PUT | `/changepassword` | Auth | Body: `oldPassword`, `newPassword`. `401` if the old password is wrong. |

## Running locally

**Prerequisites:** Node.js 22 and a PostgreSQL database.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` in the project root:
   ```
   DATABASE_URL=postgresql://<user>:<password>@localhost:5432/<database>
   JWT_SECRET=<long random string>
   JWT_REFRESH_SECRET=<different long random string>
   CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
   ORIGIN=http://localhost:5173
   PORT=3000
   NODE_ENV=development
   ```
   `ORIGIN` is the frontend URL allowed by CORS.
3. Apply the migrations and start the server:
   ```bash
   npx prisma migrate deploy
   npm run dev
   ```

## Linting and tests

```bash
npm run lint          # ESLint
npm run test:local    # migrate the test database, then run Vitest
npm run test:watch    # Vitest in watch mode
```

Tests run against a real PostgreSQL database, not mocks. Create a separate test database and a `.env.test` file pointing at it; every table is emptied before each test.

| Test file | Covers |
|---|---|
| `tests/generateTokens.test.js` | JWT creation (no database) |
| `tests/auth.test.js` | Register and login, including error cases |
| `tests/protected.test.js` | Protected routes reject requests without a login |

## CI/CD pipeline

The workflow in `.github/workflows/ci-cd-pipeline.yml` runs on every push. Each job only starts if the previous one passed.

```
 push
  │
  ▼
┌────────┐   ┌────────┐   ┌──────────────────┐   ┌──────────────────────────┐
│  Lint  │──▶│  Test  │──▶│  Build and push  │──▶│  Deploy (main only)      │
│ ESLint │   │ Vitest │   │  Docker → ECR    │   │  Migrate → Terraform     │
└────────┘   └────────┘   └──────────────────┘   └──────────────────────────┘
```

| Job | What it does | Runs on |
|---|---|---|
| **Lint** | `npm run lint:ci`; uploads an HTML report as a build artifact. | Every branch |
| **Test** | Starts a `postgres:16` service container, applies migrations and runs Vitest. | Every branch |
| **Build** | Builds the Docker image tagged with the commit SHA. On `main`, pushes it to Amazon ECR. | Every branch (push on `main` only) |
| **Deploy** | Runs `prisma migrate deploy` against the production database, then `terraform apply` with the new image tag. Terraform updates the ECS service, which replaces the running task. | `main` only |

### AWS authentication

GitHub Actions signs in to AWS through **OpenID Connect**: it assumes an IAM role for the duration of the job. No AWS access keys are stored in GitHub. The role's trust policy only allows this repository.

### Required GitHub secrets

| Secret | Used by |
|---|---|
| `DATABASE_URL` | Deploy job (migrations) and the running container |
| `JWT_SECRET` | Running container |
| `JWT_REFRESH_SECRET` | Running container |
| `CLOUDINARY_URL` | Running container |

Terraform reads them as `TF_VAR_*` environment variables and stores them in AWS SSM Parameter Store, from where ECS injects them into the container at start-up.

## Infrastructure (Terraform)

Everything in AWS is defined in `infra/`:

| File | Contents |
|---|---|
| `main.tf` | Provider, S3 state backend, security group, log group, SSM secrets, ECS cluster, task definition and service |
| `iam.tf` | Task execution role (pull the image, write logs, read secrets) |
| `variables.tf` | Inputs: region, app name, ECR repository, image tag, secrets |
| `outputs.tf` | Cluster, service, task family and log group names |

### What gets created

- **ECS cluster and service** running one Fargate task (0.25 vCPU, 0.5 GB) in the default VPC with a public IP.
- **Task definition** for the container: port 3000, environment variables, secrets from SSM, logs to CloudWatch.
- **Security group** allowing inbound traffic on port 3000.
- **CloudWatch log group** `/ecs/jira-clone`, kept for 3 days.
- **SSM SecureString parameters** for the four secrets.
- **IAM execution role** for ECS.

Created outside Terraform, once: the ECR repository, the GitHub OIDC role, and the S3 bucket that holds the Terraform state.

### Running Terraform locally

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # fill in real values; this file is gitignored
terraform init
terraform plan
terraform apply
```

State is kept in S3, so local runs and the pipeline share it.

### Finding the running app

The service has no load balancer, so the address is the task's public IP, which changes on every deploy:

```bash
TASK=$(aws ecs list-tasks --cluster jira-clone --service-name jira-clone \
  --region ap-southeast-2 --query 'taskArns[0]' --output text)

ENI=$(aws ecs describe-tasks --cluster jira-clone --tasks $TASK --region ap-southeast-2 \
  --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text)

aws ec2 describe-network-interfaces --network-interface-ids $ENI --region ap-southeast-2 \
  --query 'NetworkInterfaces[0].Association.PublicDnsName' --output text
```

The API is then at `http://<public-dns>:3000`.

### Tearing down

1. Disable the deploy job (otherwise the next push to `main` recreates everything).
2. Run `terraform destroy` in `infra/`.

The ECR repository and its images are not managed by Terraform and stay until deleted manually.

## Known limitations

- **HTTP only.** There is no load balancer or certificate, so browsers drop the `secure` auth cookies. Browser-based login needs HTTPS (a load balancer with an ACM certificate, or CloudFront) and `sameSite: "none"` cookies.
- **The address changes on every deploy**, because it is the task's own public IP.
- **One task, no autoscaling.** The setup is sized for a short-lived demo deployment, not production traffic.
