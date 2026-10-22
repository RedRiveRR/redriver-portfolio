# Projects list

The `Projeler` section lists the account's public repositories (not private, not forks, not archived), sorted by stars and then by last push, top six.

## Data source

1. `/repos.json` - a snapshot committed to this repository. It is shown first, so the list never depends on GitHub's anonymous API limit.
2. `https://api.github.com/users/<username>/repos` - queried from the visitor's browser right after, and used to refresh the list.

If the live request fails (for example `GitHub API 403` because the visitor's IP used up the anonymous 60 requests/hour limit, which is shared by everyone behind the same address), the snapshot stays on screen. If there is no snapshot either, the page shows the "yuklenemedi" message with a link to the GitHub profile.

`/repos.json` is a static `.json` file, so the failover Worker also serves it from this site (`ASSET_EXTENSION` includes `json`).

## Refreshing the snapshot

The snapshot is only a fallback, so it can lag behind; visitors whose request succeeds always see the live list. To refresh it:

```bash
gh api "users/RedRiveRR/repos?per_page=100&sort=updated&type=owner" \
  --jq '[.[] | {name,description,language,stargazers_count,html_url,private,fork,archived,pushed_at,updated_at}]' > repos.json
```

Commit `repos.json` through a pull request like any other change.
