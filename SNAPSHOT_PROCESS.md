# LCARS WebUI Release 1.0 Snapshot Process

## Snapshot Instructions

When creating snapshots for this repository:
1. All generated test artifacts, screenshots, and temporary files MUST be excluded from commits
2. The .gitignore file is configured to exclude:
   - /snapshots/
   - /historical/ 
   - /target/
   - /targets/

## Files to Ignore (Automatically Excluded)

The following directories and file patterns are automatically ignored by git:

- `*.png`
- `*.jpg` 
- `*.jpeg`
- `*.gif`
- `*.snap`
- `*.tar.gz`
- `/snapshots/`
- `/historical/`
- `/target/`
- `/targets/`

## Snapshot Creation Process

1. Run full test suite to ensure everything is in working order:
   ```
   cd lcars-ui/frontend
   npm run test:visual
   ```

2. Create snapshot with:
   ```
   # Create a new snapshot directory
   mkdir -p snapshots/release_1.0
   
   # Copy only source files and documentation (no generated artifacts)
   cp -r lcars-ui/docs/ snapshots/release_1.0/
   cp -r lcars-ui/src/ snapshots/release_1.0/
   cp lcars-ui/pyproject.toml snapshots/release_1.0/
   ```
   
3. Commit only source files and docs to git:
   ```
   git add .
   git commit -m "Release 1.0: Snapshot preparation"
   ```

## Version Control Best Practices

- Do not commit any generated test outputs or visual artifacts
- Keep development snapshots in local directories outside of the repo 
- Use semantic versioning for releases
- All snapshot commits should be focused on source code changes only