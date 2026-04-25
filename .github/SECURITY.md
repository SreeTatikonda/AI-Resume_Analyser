# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.x (latest) | ✅ Active |
| < 1.0 | ❌ End of life |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

To report a security issue, email **security@example.com** with:

1. A description of the vulnerability and its potential impact
2. Steps to reproduce (proof-of-concept code or commands)
3. Affected components / versions
4. Any suggested mitigations

You will receive an acknowledgement within **48 hours** and a detailed response within **7 business days** outlining next steps.

## Disclosure Policy

- Vulnerabilities will be patched in a private fork and released as a patch version.
- Researchers will be credited in `CHANGELOG.md` and the GitHub release notes unless they prefer to remain anonymous.
- We follow a **90-day coordinated disclosure** window.

## Scope

In scope:
- Authentication and authorization bypasses
- Injection vulnerabilities (SQL, command, prompt injection)
- Exposed secrets or credentials
- Insecure direct object references in the analysis API
- Supply-chain attacks via dependencies or container images

Out of scope:
- Denial of service via excessive uploads (mitigated by rate-limits and size limits)
- Issues in third-party SaaS (OpenAI, AWS) — report to them directly
- Social engineering / phishing

## Security Measures

See [`docs/SECURITY.md`](../docs/SECURITY.md) for a full description of the security architecture, including image scanning, secrets management, network policies, and responsible disclosure.
