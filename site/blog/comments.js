const comments = document.querySelector("#comments");
const list = comments.querySelector("#comment-list");
const status = comments.querySelector("#comment-status");
const more = comments.querySelector("#more-comments");
const thread = `https://github.com/Hsch22/Hsch22.github.io/issues/${comments.dataset.issue}`;
const endpoint = `https://api.github.com/repos/Hsch22/Hsch22.github.io/issues/${comments.dataset.issue}/comments`;
const dates = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
const shown = new Set();
let page = 1;

function renderComment(comment) {
  const entry = document.createElement("li");
  const header = document.createElement("div");
  const author = document.createElement("strong");
  author.textContent = comment.user?.login ?? "Deleted account";
  const permalink = document.createElement("a");
  permalink.href = `${thread}#issuecomment-${comment.id}`;
  const date = document.createElement("time");
  date.dateTime = comment.created_at;
  date.textContent = dates.format(new Date(comment.created_at));
  permalink.append(date);
  header.append(author, permalink);
  const body = document.createElement("p");
  body.textContent = comment.body_text;
  entry.append(header, body);
  return entry;
}

async function loadComments() {
  more.disabled = true;
  status.textContent = "Loading comments…";
  try {
    const response = await fetch(`${endpoint}?per_page=30&page=${page}`, {
      headers: { Accept: "application/vnd.github.text+json" },
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const entries = await response.json();
    const fragment = document.createDocumentFragment();
    const added = [];
    for (const comment of entries) {
      if (comment.minimized || shown.has(comment.id)) continue;
      fragment.append(renderComment(comment));
      added.push(comment.id);
    }
    list.append(fragment);
    for (const id of added) shown.add(id);
    const hasNext = (response.headers.get("Link") ?? "").includes('rel="next"');
    more.hidden = !hasNext;
    more.textContent = "Load more comments";
    status.textContent =
      shown.size || hasNext ? "" : "Be the first to leave a comment.";
    page++;
  } catch {
    status.textContent =
      "Comments could not be loaded. You can read the thread on GitHub.";
    more.textContent = "Try again";
    more.hidden = false;
  } finally {
    more.disabled = false;
  }
}

more.addEventListener("click", loadComments);
const arrival = new IntersectionObserver(
  (entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      arrival.disconnect();
      loadComments();
    }
  },
  { rootMargin: "360px" },
);
arrival.observe(comments);
