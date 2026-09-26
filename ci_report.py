"""
GitHub Actions reporting for the validators - a no-op anywhere else.

report() turns a validator's result into:
- one `::error` annotation per problem (shown on the workflow run and on
  the pull request's changed files), attached to the data file it's about;
- a section in the run's Summary page ($GITHUB_STEP_SUMMARY): a green tick
  with the OK line, or the list of problems.

Validators keep printing their normal output; this only adds to it.
"""
import os

MAX_LISTED = 50


def _escape(text):
    # Workflow-command data escaping (see GitHub's "workflow commands" docs).
    return str(text).replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")


def report(title, errors, ok_message, file_for=None, details=None):
    """`file_for(error)` returns the repo-relative file an error is about
    (or None); `details` is optional extra markdown for the summary."""
    if os.environ.get("GITHUB_ACTIONS") != "true":
        return
    for error in errors:
        path = file_for(error) if file_for else None
        location = f" file={path}," if path else " "
        print(f"::error{location}title={_escape(title)}::{_escape(error)}")

    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not summary_path:
        return
    lines = []
    if errors:
        lines.append(f"### ❌ {title} - {len(errors)} problem(s)\n")
        lines += [f"- {error}" for error in errors[:MAX_LISTED]]
        if len(errors) > MAX_LISTED:
            lines.append(f"- ...and {len(errors) - MAX_LISTED} more (see the log)")
    else:
        lines.append(f"### ✅ {title}\n")
        lines.append(ok_message)
    if details:
        lines += ["", details]
    with open(summary_path, "a", encoding="utf-8") as summary:
        summary.write("\n".join(lines) + "\n\n")
