## GBrain Search Guidance (configured by /sync-gbrain)
<!-- gstack-gbrain-search-guidance:start -->

This worktree is indexed in gbrain and pinned via `.gbrain-source`. Prefer
gbrain over Grep when you don't already know the exact string.

- Semantic / "where is X handled":  `gbrain search "<terms>"`
- Symbol definition:                `gbrain code-def <symbol>`
- All references:                   `gbrain code-refs <symbol>`
- Call graph:                       `gbrain code-callers|code-callees <symbol>`
- Past plans, retros, decisions:    `gbrain search "<terms>" --source gstack-brain-broom`

Grep still wins for exact strings, regex, and file globs.

Run `/sync-gbrain` after meaningful code changes.

Note: search is keyword-only until an embedding key is set. Ranking is
literal token overlap, not meaning. Symbol lookup is unaffected.

<!-- gstack-gbrain-search-guidance:end -->
