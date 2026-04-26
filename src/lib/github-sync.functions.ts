import { createServerFn } from "@tanstack/react-start";

export type GithubSyncStatus = {
  connected: boolean;
  owner: string | null;
  repo: string | null;
  branch: string | null;
  lastCommit: {
    sha: string;
    shortSha: string;
    message: string;
    author: string;
    date: string;
    url: string;
  } | null;
  lastPush: {
    date: string;
    actor: string | null;
  } | null;
  fetchedAt: string;
  error: string | null;
};

export const getGithubSyncStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<GithubSyncStatus> => {
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;
    const fetchedAt = new Date().toISOString();

    const base = {
      connected: false,
      owner: owner ?? null,
      repo: repo ?? null,
      branch: null,
      lastCommit: null,
      lastPush: null,
      fetchedAt,
    };

    if (!owner || !repo) {
      return { ...base, error: "GITHUB_OWNER or GITHUB_REPO not configured" };
    }
    if (!token) {
      return { ...base, error: "GITHUB_TOKEN not configured" };
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "lovable-github-sync",
    };

    try {
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      if (!repoRes.ok) {
        return {
          ...base,
          error: `GitHub repo fetch failed (${repoRes.status})`,
        };
      }
      const repoData = (await repoRes.json()) as { default_branch: string; pushed_at: string };
      const branch = repoData.default_branch;

      const commitsRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits/${branch}`,
        { headers },
      );
      if (!commitsRes.ok) {
        return { ...base, branch, error: `Commit fetch failed (${commitsRes.status})` };
      }
      const commit = (await commitsRes.json()) as {
        sha: string;
        html_url: string;
        commit: { message: string; author: { name: string; date: string } };
        author?: { login?: string } | null;
      };

      // Try to get most recent push event for actor info (best-effort).
      let pushActor: string | null = null;
      try {
        const eventsRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/events?per_page=20`,
          { headers },
        );
        if (eventsRes.ok) {
          const events = (await eventsRes.json()) as Array<{
            type: string;
            actor?: { login?: string };
          }>;
          const push = events.find((e) => e.type === "PushEvent");
          pushActor = push?.actor?.login ?? null;
        }
      } catch {
        // ignore
      }

      return {
        connected: true,
        owner,
        repo,
        branch,
        lastCommit: {
          sha: commit.sha,
          shortSha: commit.sha.slice(0, 7),
          message: commit.commit.message.split("\n")[0],
          author: commit.commit.author?.name ?? "unknown",
          date: commit.commit.author?.date ?? "",
          url: commit.html_url,
        },
        lastPush: {
          date: repoData.pushed_at,
          actor: pushActor,
        },
        fetchedAt,
        error: null,
      };
    } catch (err) {
      return {
        ...base,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  },
);