# Architecture Decision Records (ADR)

This document maps out the architectural decisions made during the integration of DevSecOps practices in the **VN Stock Tracker** application.

---

## ADR 1: Multi-stage Docker Builds
- **Status**: Approved
- **Context**: Standard Docker builds carry development packages (e.g. packages compilers, development libraries) which swell the image size and increase the attack surface.
- **Decision**: Next.js uses standard multi-stage builds producing a `standalone` folder copied onto `node:20-alpine`, dropping node_modules and builders. FastAPI builds similarly limit copy scope.
- **Consequences**:
  - Image size decreased from ~1GB to <150MB.
  - Development tools (compilers, npm cache) are absent in the running container, minimizing vulnerability risk.

---

## ADR 2: Non-Root Container Execution
- **Status**: Approved
- **Context**: Running containers as root allows potential kernel exploits or breakout bugs to gain root access on the host system.
- **Decision**:
  - The Next.js image runs as `nextjs` (UID 1001).
  - The FastAPI image runs as `appuser` (UID 10001).
- **Consequences**:
  - In the event of code injection or web vulnerabilities, the attacker is isolated inside a restricted sandbox environment without root capability.

---

## ADR 3: Container Signing via Cosign & OIDC
- **Status**: Approved
- **Context**: Attackers can intercept or spoof registry tags to push malicious images (Supply Chain Injection).
- **Decision**: We utilize **Sigstore Cosign** within GitHub Actions to sign container digests using temporary keys backed by GitHub's OIDC identity provider.
- **Consequences**:
  - Eliminates the need to manage and rotate private keys in GitHub secrets.
  - Deployments verify the container's signature against the GitHub identity, guaranteeing code integrity.

---

## ADR 4: Policy as Code Enforcement via OPA
- **Status**: Approved
- **Context**: Manual reviews of infrastructure configurations (Kubernetes Deployment configurations) are prone to oversight.
- **Decision**: We define OPA policies (`.rego`) validating security contexts (e.g. banning root execution or latest tags) prior to cluster application.
- **Consequences**:
  - Policies are version-controlled in git and can run as pre-commit checks or deployment blockers.

---

## ADR 5: Zero-Secret Architecture
- **Status**: Approved
- **Context**: Traditional web apps store credentials (API keys) on servers or databases, presenting a major target for attacks.
- **Decision**: We run a "Zero-Secret" server model. Users supply their personal OpenRouter and vnstock keys dynamically in client-side headers. Keys are stored in the user's browser, passing through API proxies without persistent storage on our servers.
- **Consequences**:
  - No database storage of third-party keys.
  - Zero-key leaks from server exploits.
