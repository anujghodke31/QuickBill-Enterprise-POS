# Security Policy
This document outlines security procedures and policies for the QuickBill Enterprise POS system.

## Supported Versions
| Version | Supported          |
| ------- | ------------------ |
| v2.0.x  | :white_check_mark: |
| v1.0.x  | :x:                |

## Reporting a Vulnerability
We take system security seriously as this software handles enterprise transactions. 
If you discover a vulnerability, please **DO NOT** file a public GitHub issue. 

Please email the detailed report to `security@yourdomain.com`. 

**SLA:** You will receive a non-automated response acknowledging the receipt within 24 hours. The fix timeline will depend on the severity of the report, but critical patches are deployed within 48 hours.

## Best Practices (What NOT to do)
- **DO NOT** commit your `.env` variables or raw API keys.
- **DO NOT** remove the Helmet or Rate-Limiting middlewares from production routes.
- **DO NOT** execute brute force / penetration testing tools against production networks without prior written approval.
