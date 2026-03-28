# Lambda Cold-Start Optimization (Future)

This document captures strategies to eliminate Lambda cold starts when the project
moves beyond the free tier.

## Problem

AWS Lambda cold starts add **400ms-1000ms** to the first request after a period of
inactivity. The HeyBub backend uses FastAPI + SQLAlchemy + Mangum, which means
every cold start must:

1. Initialize the FastAPI app (import routers, setup middleware): ~200-500ms
2. Create the SQLAlchemy engine + first DB connection: ~150-400ms
3. Initialize auth/Supabase clients: ~50-100ms

## Strategies (pick one or combine)

### 1. Provisioned Concurrency (Recommended first step)
- **Cost**: ~$15-30/mo for 1 instance
- **Effort**: Add one line to Terraform
- **Effect**: Keeps 1-2 Lambda instances warm permanently

```hcl
# infra/lambda.tf
resource "aws_lambda_provisioned_concurrency_config" "api" {
  function_name                  = aws_lambda_function.api.function_name
  provisioned_concurrent_executions = 1
  qualifier                      = aws_lambda_function.api.version
}
```

### 2. CloudWatch Warm-Up Ping (Free)
- **Cost**: $0
- **Effort**: Add EventBridge rule
- **Effect**: Pings `/api/health` every 5 min to keep Lambda warm
- **Caveat**: Not guaranteed — AWS may still recycle the instance

```hcl
resource "aws_cloudwatch_event_rule" "warmup" {
  name                = "lambda-warmup"
  schedule_expression = "rate(5 minutes)"
}

resource "aws_cloudwatch_event_target" "warmup" {
  rule = aws_cloudwatch_event_rule.warmup.name
  arn  = aws_lambda_function.api.arn
  input = jsonencode({
    httpMethod = "GET"
    path       = "/api/health"
  })
}
```

### 3. Lambda SnapStart
- **Effect**: Snapshots the initialized JVM/runtime state, ~100ms cold starts
- **Caveat**: Only available for Java/Python runtimes on specific architectures
- **Effort**: Config change in Lambda settings

### 4. Move to Always-On Compute
- **Options**: ECS Fargate ($5-15/mo), Fly.io ($5/mo), Railway ($5/mo)
- **Effect**: Zero cold starts, persistent DB connection pool
- **Effort**: Medium — need Docker container, new deployment pipeline
- **Best for**: When sustained traffic justifies the cost

### 5. Lambda@Edge for Dashboard
- **Effect**: Run dashboard endpoint at CDN edge locations
- **Caveat**: Limited runtime, 5s timeout for origin response
- **Effort**: Medium — requires edge function deployment

## Recommendation

Start with **Warm-Up Ping** (free) + **Provisioned Concurrency** (1 instance) when
ready to spend ~$15/mo. This eliminates cold starts for 99%+ of requests.

When traffic grows to sustained levels (>100 RPM), migrate to **ECS Fargate** for
better cost efficiency and persistent connections.
