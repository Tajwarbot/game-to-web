# Contributing

Thanks for improving G2W.

## What fits

- A new reference built from a real port: a measured failure, a working approach,
  a concrete number.
- A correction to an existing reference where the behaviour changed.
- A clearer example of the output at a checkpoint.

## What does not

- Guesses, marketing language, or speculative features.
- Code that defeats DRM or redistributes proprietary game assets.
- Real AppIds, endpoints, passwords or other secrets.

## Rules

1. Keep the six phases and their checkpoints in `SKILL.md`.
2. Keep the writing plain and specific. No long dashes, no filler.
3. Put detail in `references/`, not in the main skill body.
4. Say how you verified a claim, in one line, at the bottom of the reference.

## Adding a reference

1. Add `references/NN-short-name.md` with a title and a short scope line.
2. Link it from the table in `SKILL.md` and from `README.md`.
3. Keep it under about 300 lines. Dense beats long.

## Checks before a pull request

- `SKILL.md` frontmatter still has a `name` that matches the folder.
- No secrets: scan for UUIDs, keys, tokens, emails and internal URLs.
- No em dashes or en dashes in the README.
- Links in the README and `SKILL.md` point at files that exist.
