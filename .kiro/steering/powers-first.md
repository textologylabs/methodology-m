---
inclusion: always
---

# Powers First — Mandatory Activation Rule

When a user references a power by name (e.g. "using M Power", "with m-power",
"use X power"), you MUST activate that power via `kiroPowers action=activate`
BEFORE doing anything else — no reading capability files from disk, no
exploring the power's folder structure, no manual file reads.

The activation response gives you everything you need: documentation, available
tools, and steering files. Only after activation should you proceed with the
requested capability.

**Never bypass activation by reading power files directly from disk.**

This rule is always active. No exceptions.
