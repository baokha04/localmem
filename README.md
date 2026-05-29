# init-harness-experimental Skill

An agent skill that scaffolds and configures the Harness v0 operating environment in any target project directory using [hoangnb24/harness-experimental](https://github.com/hoangnb24/harness-experimental).

## Purpose

Harness v0 is an operating harness for agent-driven software development. It introduces a **durable SQLite database layer** and a **prebuilt Rust CLI** so that agents and humans can track feature classification, story validations, architectural decisions, and agent traces without manually editing markdown tables. It sets up:
- **`harness.db`** - The SQLite database storing intake classifications, stories status, decisions, traces, and backlog.
- **`scripts/harness`** - The repo-local entrypoint wrapping the Rust CLI binary (`scripts/bin/harness-cli`).
- **`AGENTS.md`** - A lightweight agent shim delegating to the CLI query tools and policy docs.
- **`docs/`** - Robust collaboration guidelines, feature risk categorization rules, and durable ADRs.
- **`scripts/schema/`** - Database migration schemas.
- **`.gitignore`** - Rules to prevent local database files and downloaded CLI binaries from being tracked in git.

This skill allows the agent to immediately bootstrap this complete operating framework in any project, ensuring that subsequent agent sessions are well-guided, predictable, and compliant with best engineering practices.

## Installation

This skill is pre-installed in the `.agents/skills/init-harness-experimental` directory. 

To activate and use this skill locally, ensure your agent has access to run bash commands, or symlink the skill files globally.

## Usage

You can trigger this skill by asking the agent to install or configure the harness.

### Command Line Examples

#### 1. Dry Run / Preview Changes
Verify what files will be created without modifying the disk:
```bash
bash .agents/skills/init-harness-experimental/scripts/install-harness.sh --directory ./target-project --dry-run
```

#### 2. Clean Installation (Safe Merge)
Install missing harness files and download the platform-specific prebuilt Rust Harness CLI:
```bash
bash .agents/skills/init-harness-experimental/scripts/install-harness.sh --directory ./target-project --yes --merge
```

#### 3. Update Existing and Refresh Agent Shim
Update existing harness files and refresh old manual `AGENTS.md` operating guides into the clean stable shim:
```bash
bash .agents/skills/init-harness-experimental/scripts/install-harness.sh --directory ./target-project --yes --merge --refresh-agent-shim
```

#### 4. Override Existing Harness
Back up existing files and replace them with fresh default harness templates:
```bash
bash .agents/skills/init-harness-experimental/scripts/install-harness.sh --directory ./target-project --yes --override
```

### Initializing the Database

After a successful installation in a target project directory:
```bash
# Move to the target project directory and initialize the SQLite database
cd ./target-project
bash scripts/harness init

# Seed or refresh the database from existing markdown states (TEST_MATRIX, decisions, backlog)
bash scripts/harness import brownfield
```

## Structure

```text
init-harness-experimental/
├── SKILL.md            # Skill specification and triggering rules
├── README.md           # This user-facing guide
├── AGENTS.md           # Lightweight stable agent shim template
├── .gitignore          # Default gitignore template ignoring harness.db and CLI binary
├── docs/               # Harness architecture, feature intake, and ADR templates
└── scripts/
    ├── install-harness.sh   # The scaffolding installer script
    ├── harness              # Repo-local thin shell wrapper for SQLite/Rust CLI commands
    └── schema/
        └── 001-init.sql     # Database initialization migration script
```

## Safety and Backups

The installer script is fully non-destructive by default. If a conflict occurs with protected files (`AGENTS.md`, `docs/`, or `scripts/`):
1. **Interactive mode**: Prompts you to merge, override, or stop.
2. **Non-interactive mode (`--yes`)**: Fails unless `--merge` or `--override` is explicitly passed.
3. **Backups**: If `--override` or `--force` is used, existing files are safely backed up to `./target-project/.harness-backup/` with a precise timestamp.
