# Workshop Presentation Ideas

Talking points, narrative beats, and insights to weave into the
workshop presentation. Collected during the reference implementation.

---

## Software design principles applied to SDLC

Most developers would never hardcode a database driver into their
business logic — they'd use an interface, a repository pattern, a
provider. Yet the same developers hardcode GitLab CI, Docker, Cypress,
and Express into their development lifecycle without a second thought.
The process and the tooling are fused. Changing one means rewriting
the other.

Methodology M applies the same design principles we use in code to
the SDLC itself:

- **Separation of concerns** — the methodology defines strategy
  (compose, integrate, gate, merge); plugins provide implementation
  (Docker, GitLab, Cypress)
- **Dependency inversion** — capabilities depend on abstractions
  (compose plugin interface), not concretions (docker-compose.yml)
- **Interface-driven design** — Story Zero captures plugin choices;
  capabilities call plugins by interface, not by name
- **Open/closed** — the methodology is closed for modification (the
  lifecycle phases don't change) but open for extension (new plugins
  for new platforms)

The craft shouldn't stop at the code boundary. If your architecture
is pluggable but your process is hardwired, you've only solved half
the problem.
