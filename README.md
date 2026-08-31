# VIBE_coding

## Claude Code plugin setup

`.claude/settings.json` declares two plugin marketplaces and enables one plugin
from each, so anyone opening this repo in Claude Code gets the same skill set
without running install commands by hand.

| Plugin | Marketplace | Source |
| --- | --- | --- |
| `superpowers` | `claude-plugins-official` | [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) |
| `mattpocock-skills` | `mattpocock` | [mattpocock/skills](https://github.com/mattpocock/skills) |

**superpowers** — Anthropic's curated methodology library: test-driven
development, systematic debugging, brainstorming, plan writing and execution,
subagent-driven development with code review, git worktrees, and skill authoring.

**mattpocock-skills** — Matt Pocock's engineering skills: spec and ticket flows,
domain modelling, codebase design, triage, code review, and the `grill-me`
interview loop.

Both are declared at project scope. Claude Code loads plugins at session start,
so a restart is needed after a fresh clone for the skills to register.

### Installing manually

If you would rather set this up outside the repo (user scope, available in every
project), run:

```
/plugin marketplace add anthropics/claude-plugins-official
/plugin install superpowers@claude-plugins-official

/plugin marketplace add mattpocock/skills
/plugin install mattpocock-skills@mattpocock
```

The marketplace must be added before the install; a plugin cannot be resolved
from a marketplace that is not yet configured.
