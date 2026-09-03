(function () {
  "use strict";

  var root = document.querySelector(".notes-sidebar-inner");
  if (!root) return;

  var input = root.querySelector(".notes-search");
  var results = root.querySelector(".notes-search-results");
  if (!input || !results) return;

  var index = null;
  var pending = null;
  var timer = null;

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      switch (ch) {
        case "&": return "&amp;";
        case "<": return "&lt;";
        case ">": return "&gt;";
        case '"': return "&quot;";
        case "'": return "&#39;";
        default: return ch;
      }
    });
  }

  function loadIndex() {
    if (index) return Promise.resolve(index);
    if (!pending) {
      pending = fetch(root.getAttribute("data-index-url"))
        .then(function (res) { return res.json(); })
        .then(function (data) { index = data || []; return index; })
        .catch(function () { index = []; return index; });
    }
    return pending;
  }

  function filter(query) {
    var q = query.toLowerCase();
    return index.filter(function (item) {
      var title = (item.t || "").toLowerCase();
      var chapter = (item.c || "").toLowerCase();
      var tags = (item.g || []).join(" ").toLowerCase();
      return title.indexOf(q) !== -1 || tags.indexOf(q) !== -1 || chapter.indexOf(q) !== -1;
    });
  }

  function render(items) {
    if (!items.length) {
      results.innerHTML = '<div class="notes-search-empty">No notes found</div>';
      return;
    }
    var html = "";
    items.forEach(function (item) {
      var tags = (item.g || []).map(function (tag) {
        return '<button type="button" class="notes-search-tag" data-tag="' +
          escapeHtml(tag) + '">#' + escapeHtml(tag) + "</button>";
      }).join("");
      html += '<a class="notes-search-item" href="' + escapeHtml(item.u) + '">' +
        '<span class="notes-search-title">' + escapeHtml(item.t) + "</span>" +
        (item.c ? '<span class="notes-search-chapter">' + escapeHtml(item.c) + "</span>" : "") +
        '<span class="notes-search-tags">' + tags + "</span>" +
        "</a>";
    });
    results.innerHTML = html;
  }

  function close() {
    root.classList.remove("notes-searching");
    results.hidden = true;
    results.innerHTML = "";
  }

  function run() {
    var query = input.value.trim();
    if (query.length < 2) {
      close();
      return;
    }
    loadIndex().then(function () {
      if (input.value.trim() !== query) return;
      render(filter(query));
      root.classList.add("notes-searching");
      results.hidden = false;
    });
  }

  input.addEventListener("input", function () {
    window.clearTimeout(timer);
    timer = window.setTimeout(run, 150);
  });

  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      var first = results.querySelector(".notes-search-item");
      if (first && !results.hidden) {
        window.location.href = first.getAttribute("href");
      }
    } else if (event.key === "Escape") {
      input.value = "";
      close();
      input.blur();
    }
  });

  results.addEventListener("click", function (event) {
    var tag = event.target.closest(".notes-search-tag");
    if (!tag) return;
    event.preventDefault();
    input.value = tag.getAttribute("data-tag");
    input.focus();
    run();
  });

  document.addEventListener("click", function (event) {
    if (!root.contains(event.target)) {
      close();
    }
  });
})();