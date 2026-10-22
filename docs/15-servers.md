# Servers

The `Sunucular` section on the homepage lists the RedRiverLab subdomains and the server behind each one.

| Subdomain | Provider | Region | Hardware | System |
|---|---|---|---|---|
| `oracle.redriverlab.me` | Oracle Cloud Always Free | eu-milan-1 | ARM A1, 2 OCPU, 12 GB | Ubuntu 26.04 |
| `google.redriverlab.me` | Google Cloud Always Free | us-central1 | e2-micro, 2 vCPU, 1 GB | Debian 13 |

## Notes

- The section is static HTML in `index.html`. It reuses the `projects-section` / `project-row` classes, so it needs no extra CSS or JavaScript.
- It uses its own ids (`servers`, `servers-title`) and does not touch `#status`, `#status-title`, `#status-message` or `#outage-duration`, which the failover duration counter depends on.
- Each subdomain is a separate site with its own status page; this section only links to them.
- To add a server, copy one `project-row` article, bump the number and update the count in `ALT ALAN ADLARI / NN`.
