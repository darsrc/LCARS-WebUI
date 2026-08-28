"""LCARS UI v4 — repository browser (enhanced Table showcase).

One page demonstrating the v4 Table capabilities end to end:

  * **Client-side operations with emitted events** — LCARS sorts, filters and
    paginates locally (``data_mode="client"``) while still notifying Python of
    every state change (``emit_state_changes=True``). Selecting or expanding a
    row emits a typed ``{"kind", "state"}`` action to ``action_id="repos"``.
  * **Linked *and* copyable names** — each repository name links to its page
    while a COPY button copies the exact ``owner/repo`` id.
  * **Controlled selected-row highlight** — the selection is driven from
    ``TableOptions.selection.selected_ids`` and stays stable across sorting,
    filtering and pagination.
  * **Expandable repositories with lazy-loaded child files** — expanding a repo
    emits an expansion event; the app fills in ``expanded_content`` (a nested
    compact file table) on demand and can show a loading or error+retry state.

Run:
    python examples/table_repositories/app.py
"""

from __future__ import annotations

import os

import lcars_ui as lcars
from lcars_ui import App, ui

# A tiny "backend": repositories and their (lazily fetched) file manifests.
REPOS: dict[str, dict[str, object]] = {
    "acme/widget": {
        "lang": "Python",
        "stars": 128,
        "files": [("main.py", "2.1 kB"), ("README.md", "0.8 kB")],
    },
    "acme/engine": {
        "lang": "Rust",
        "stars": 342,
        "files": [("lib.rs", "5.4 kB"), ("Cargo.toml", "0.3 kB")],
    },
    "hera/probe": {
        "lang": "Go",
        "stars": 57,
        "files": [("probe.go", "3.0 kB")],
    },
}

# File manifests already "fetched" get rich expanded content; the rest carry a
# loading or error affordance that the renderer reveals only once expanded. In a
# real app the expansion action would kick off the fetch and push an update that
# swaps `loading` for `expanded_content` (or `error` + a Retry that re-emits).
LOADED: set[str] = {"acme/widget"}
FAILED: set[str] = {"hera/probe"}


def _name_cell(repo_id: str) -> lcars.TableCell:
    # Linked *and* copyable: the name links to the repo page while COPY yields the
    # exact owner/repo id, even though the visible label is just the repo name.
    return lcars.TableCell(
        value=repo_id,
        display=repo_id.split("/")[-1],
        link=lcars.LinkSpec(href=f"https://example.com/{repo_id}", target="_blank"),
        copyable=True,
        copy_value=repo_id,
        status="ok",
    )


def _repo_row(repo_id: str) -> lcars.TableRow:
    info = REPOS[repo_id]
    row = lcars.TableRow(
        id=repo_id,
        cells=[_name_cell(repo_id), info["lang"], info["stars"]],
    )
    if repo_id in LOADED:
        files = info["files"]  # type: ignore[assignment]
        row.expanded_content = [
            lcars.TableDetailText(text=f"{info['lang']} · {info['stars']} stars", tone="muted"),
            lcars.TableDetailTable(
                headers=["File", "Size"],
                rows=[
                    lcars.TableRow(id=f"{repo_id}:{name}", cells=[name, size])
                    for name, size in files
                ],
            ),
        ]
    elif repo_id in FAILED:
        row.error = "Could not fetch file manifest."
    else:
        row.loading = True
    return row



app = App()


def _register_pages() -> None:
    app.config("Repository Browser", subtitle="Enhanced Table Showcase")

    @app.page("Repositories", id="repos", layout="console")
    def repos() -> None:
        # `state` carries the persisted selection/expansion on each rebuild; an app
        # can read it to drive side panels or decide what to fetch.
        ui.table(
            [_repo_row(repo_id) for repo_id in REPOS],
            title="Repositories",
            id="repos",
            options=lcars.TableOptions(
                columns=[
                    lcars.TableColumn(key="name", label="Repository", sortable=True, filter="text"),
                    lcars.TableColumn(key="lang", label="Language", sortable=True, filter="select"),
                    lcars.TableColumn(
                        key="stars", label="Stars", value_type="number", sortable=True, align="end"
                    ),
                ],
                # Client does the data work; Python is still told about state changes.
                data_mode="client",
                emit_state_changes=True,
                # Single, controlled selection with click-to-select whole rows.
                selection=lcars.TableSelection(mode="single", selected_ids=["acme/engine"]),
                row_click_select=True,
                expandable=True,
                density="compact",
                sticky_header=True,
                interaction=lcars.InteractionOptions(action_id="repos"),
            ),
        )




_register_pages()

if __name__ == "__main__":

    app.serve(
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8077")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") != "0",
    )
