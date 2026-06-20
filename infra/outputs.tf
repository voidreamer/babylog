# AWS outputs — null while the AWS module is dormant (enable_aws = false).
output "aws_api_url" {
  value = one(module.aws[*].api_url)
}
output "aws_frontend_url" {
  value = one(module.aws[*].frontend_url)
}
output "aws_s3_bucket_name" {
  value = one(module.aws[*].s3_bucket_name)
}
output "aws_cloudfront_distribution_id" {
  value = one(module.aws[*].cloudfront_distribution_id)
}
output "aws_lambda_function_name" {
  value = one(module.aws[*].lambda_function_name)
}

# Oracle Cloud (primary host)
output "oracle_instance_id" {
  value = oci_core_instance.api.id
}
output "oracle_public_ip" {
  description = "Public IP of the A1 instance (point the Cloudflare tunnel / api.heybub.app at it)"
  value       = oci_core_instance.api.public_ip
}
