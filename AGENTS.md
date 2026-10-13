# Conventions for agents

## Code style — human-readable, never minified (owner's rule)

All code in this repo is written for a human reader — the owner reads it.

- Never minify, compress, or golf code. No cramming multiple statements or expressions onto one line to save space, no single-letter names outside tiny loop counters.
- Use descriptive names for variables, functions, and files.
- Keep normal formatting: indentation, a line break between logical steps, blank lines between sections.
- Comment anything non-obvious — say *why*, not what the code already says.
- A build step may emit a bundled artifact, but the committed source always stays readable.

## Repo rules

- Never commit passwords, API keys, or tokens.
