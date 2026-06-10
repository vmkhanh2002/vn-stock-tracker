package k8s.security

# Deny containers that run as root
deny[msg] {
  input.kind == "Deployment"
  container := input.spec.template.spec.containers[_]
  not container.securityContext.runAsNonRoot
  msg := sprintf("Container '%v' in Deployment '%v' must set runAsNonRoot to true", [container.name, input.metadata.name])
}

# Deny containers that allow privilege escalation
deny[msg] {
  input.kind == "Deployment"
  container := input.spec.template.spec.containers[_]
  container.securityContext.allowPrivilegeEscalation
  msg := sprintf("Container '%v' in Deployment '%v' must not allow privilege escalation", [container.name, input.metadata.name])
}

# Deny containers with the 'latest' image tag
deny[msg] {
  input.kind == "Deployment"
  container := input.spec.template.spec.containers[_]
  endswith(container.image, ":latest")
  msg := sprintf("Container '%v' in Deployment '%v' is using the 'latest' image tag. Please use specific SHA or semantic tags.", [container.name, input.metadata.name])
}

# Deny containers that do not have memory limits defined
deny[msg] {
  input.kind == "Deployment"
  container := input.spec.template.spec.containers[_]
  not container.resources.limits.memory
  msg := sprintf("Container '%v' in Deployment '%v' must specify a memory resource limit", [container.name, input.metadata.name])
}
