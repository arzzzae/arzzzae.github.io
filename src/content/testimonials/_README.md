## Testimonials (currently empty by design)

The testimonials section is **hidden** while this folder has no entries.

The collection loader only picks up files matching `**/[^_]*.md`, so this
`_README.md` (leading underscore) is ignored and never rendered.

To add a testimonial and automatically reveal the section, create a file like
`jane-doe.md` here:

```md
---
author: Jane Doe
title: Engineering Manager
company: Acme Corp
order: 0
---

RJ was a fantastic engineer to work with...
```
