const routes = [
  { endpoint: "/userinfo_view:label", method: "get", action: "db.userinfo_view" },
  { endpoint: "/userinfo_create", method: "post", action: "db.userinfo_create" },
  { endpoint: "/userinfo_update", method: "post", action: "db.userinfo_update" },
  { endpoint: "/userinfo_remove", method: "post", action: "db.userinfo_remove" },
  { endpoint: "/userinfo_update_single", method: "post", action: "db.bio_update" },
  { endpoint: "/post_create", method: "post", action: "gpt.post_create" },
  { endpoint: "/post-update-status", method: "post", action: "db.post_update_status" },
  { endpoint: "/post-remove", method: "post", action: "gpt.remove_post" },
  { endpoint: "/post_view/:id", method: "get", action: "db.post_view" },
  { endpoint: "/posts-bulk-create", method: "get", action: "gpt.posts_bulk_create" },
  { endpoint: "/company-update", method: "post", action: "db.company_update" },
  { endpoint: "/companys-view", method: "get", action: "gpt.companys_view" },
  { endpoint: "/company-view/:id", method: "get", action: "gpt.company_view" },
  { endpoint: "/sitemap", method: "post", action: "gpt.sitemap" },
  { endpoint: "/sitemap-fetch", method: "post", action: "gpt.sitemap" },
  { endpoint: "/sitemap-crawl", method: "post", action: "gpt.sitemap" },
  // { endpoint: "/sitemap-crawl-board-links", method: "post", action: "gpt.sitemap_crawl_board_links" },
  { endpoint: "/sitemap-create-link", method: "post", action: "db.sitemap_create_link" },
  { endpoint: "/sitemap-remove-link", method: "post", action: "gpt.sitemap_remove_link" },
  // { endpoint: "/sitemap-update-link", method: "post", action: "gpt.sitemap_update_link" },
  { endpoint: "/extracts-create-for-post", method: "post", action: "gpt.extracts_create_for_post" },
  { endpoint: "/extract-create-for-post", method: "post", action: "gpt.extract_create_for_post" },
  { endpoint: "/extracts-view-for-post/:id", method: "get", action: "db.extracts_view_for_post" },
  { endpoint: "/extract-update", method: "post", action: "db.extract_update" },
  { endpoint: "/apply", method: "post", action: "rzecord_company.email_send" },
  { endpoint: "/search_company", method: "post", action: "db.search_company" },
  { endpoint: "/view-db-structure", method: "get", action: "viewDbStructure" },
  { endpoint: "/resume_generate", method: "post", action: "gpt.resume_generate" },
  { endpoint: "/generate_pdf", method: "post", action: "gpt.generate_pdf" },
  { endpoint: "/cover-letter-generate", method: "post", action: "gpt.cover_letter_generate" },
  { endpoint: "/email-generate", method: "post", action: "gpt.email_generate" },
  { endpoint: "/email-send", method: "post", action: "gpt.email_send" },
  { endpoint: "/apply", method: "post", action: "gpt.email_send" },
  { endpoint: "/extension-fill-form", method: "post", action: "gpt.extension_fill_form" },
  { endpoint: "/extension-post-fetch", method: "post", action: "db.extension_post_fetch" },
  { endpoint: "/extension-post_create", method: "post", action: "gpt.extension_post_create" },
  { endpoint: "/extension-ask-question", method: "post", action: "gpt.extension_ask_question" }
];

export { routes };