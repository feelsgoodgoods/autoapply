// console.log("dbroutes.js: Loaded");

let misc = false;
if (window) {
  misc = await import("./misc.js");
} else {
  require("dotenv").config();
  misc = await import("../utils/misc.js");
}
let queryDb = misc.queryDb;

import { dbutils } from "./dbgptutils.js";
import { pup } from "./puproutes.js";

//~~~~ User Info
//
async function userinfo_view(body) {
  // console.group("db:userinfo_view");
  let { label } = body;
  // console.log("DB:userinfo_view: ", body);
  let str = `SELECT id, text, title FROM userinfo WHERE label = ? ORDER BY id DESC`;
  let rows = await queryDb(str, [label]);
  // console.log("userinfo_view:received:", { label, rows });
  // console.groupEnd();
  return { status: "success", data: rows };
}

//
async function userinfo_create(body) {
  console.group("db:userinfo_create", body);
  let { label, text, title } = body;
  let existingRecord = await queryDb("SELECT id FROM userinfo WHERE title = ? and label=?", [title, label]);
  if (!existingRecord.length) {
    // console.log('Inserting')
    const insertSql = `INSERT INTO userinfo (text, title, label) VALUES (?, ?, ?)`;
    existingRecord = await queryDb(insertSql, [text, title, label]);
  } else {
    console.log("Record not added");
  }
  return { status: "success", data: existingRecord };
}

//
async function userinfo_update_single(body) {
  console.group("db:userinfo_update_single", body);
  let { fullname, bio, openaikey } = body;
  let data = false;
  let label = (fullname && "fullname") || (bio && "bio") || (openaikey && "openaikey");
  let value = fullname || bio || openaikey;
  //  console.log("DB:USERINFO_UPDATE_SINGLE", body);
  const existingRecord = await queryDb("SELECT id FROM userinfo WHERE label = ?", [label]);
  if (!existingRecord.length) {
    console.log(":INSERT:");
    const insertSql = `INSERT INTO userinfo (text, title, label) VALUES (?, ?, ?)`;
    data = await queryDb(insertSql, [value, label, label]);
    // console.log(`${label} inserted successful.`);
  } else {
    console.log(":UPDATE", body, { existingRecord });
    const updateSql = `UPDATE userinfo SET text = ? WHERE label = ?`;
    data = await queryDb(updateSql, [value, label]);
    console.log(`${label} updated successfully`);
  }
  return { status: "success", data };
}

//
async function userinfo_update(body) {
  console.group("db:userinfo_update");
  let { userinfo_id, text } = body;
  console.log("DB:USERINFO_UPDATE: ", body);
  let id = parseInt(userinfo_id);
  // Check if the record exists
  const checkSql = `SELECT id FROM userinfo WHERE id = ?`;
  const record = queryDb(checkSql, [id]);
  // change to queryDb
  if (!record) {
    console.error(`No record found with id: ${id}`);
    return { status: "success", error: `No record found with id: ${id}` };
  }
  const updateSql = `UPDATE userinfo SET text = ? WHERE id = ?`;
  await queryDb(updateSql, [text, id]);
  return {
    status: "success"
  };
}

//
async function userinfo_remove(body) {
  console.group("db:userinfo_remove");
  let { userinfo_id } = body;
  console.log(body);
  let id = parseInt(userinfo_id);
  let data = await queryDb(`DELETE FROM userinfo WHERE id = ?;`, [id]);
  console.groupEnd();
  return {
    status: "success",
    id
  };
}

//~~~~ Basics

// view the post

// document post_view. who calls it, what it returns and why.
// metadata and stuff is all fckd u.

async function post_view(body) {
  console.groupCollapsed("db:post_view", body);
  let { id } = body;
  const post = await queryDb("SELECT * FROM posts WHERE id = ?", [id]);
  console.log("111", { post });
  if (!post.length) return { status: "success", data: [] };
  const company = await queryDb("SELECT companyName FROM companies WHERE id = ?", [post[0].company_id]);
  post[0].companyName = company[0].companyName;
  console.groupEnd();
  return { status: "success", data: post[0] };
}
//
async function post_update_status(body) {
  console.group("db:post_update_status");
  let { company_id, post_id, jobStatus, force } = body;
  status = parseInt(jobStatus);
  post_id = parseInt(post_id);
  company_id = parseInt(company_id);
  console.log("post_update_status", body, status, post_id, company_id, force);
  const record = queryDb(`SELECT id FROM posts WHERE id = ?`, [post_id]);
  if (record) {
    await queryDb(`UPDATE posts SET status = ? WHERE id = ?`, [status, post_id]);
  }
  console.groupEnd();
  return {
    status: "success",
    data: { company_id, post_id, status }
  };
}

// If new websiteUrl then fetch sitemap.txt
//puppeeteer
async function company_update(params) {
  console.group("db:company_update");
  let { company_id, status, websiteUrl } = params;
  let links;

  try {
    status = parseInt(status);
    company_id = parseInt(company_id);
    const record = queryDb(`SELECT id FROM companies WHERE id = ?`, [company_id]);
    if (!record) {
      console.error(`No record found with id: ${company_id}`);
      return {
        status: "failure",
        params: { company_id: false, status: false, links: false }
      };
    }

    await queryDb(`UPDATE companies SET status = ?, websiteUrl = ? WHERE id = ?`, [status, websiteUrl, company_id]);
    links = await queryDb("SELECT * FROM sitemaps WHERE company_id = ?", [company_id]);
    if (!links.find(link => link.link === websiteUrl)) {
      links = (await pup.sitemap(company_id, "sitemap")).links;
    }
    console.groupEnd();
    return {
      status: "success",
      params: { company_id, status, links }
    };
  } catch (error) {
    console.error("Error updating record:", error.message);
    return {
      status: "failure",
      params: { company_id, status, links }
    };
  }
}

//~~~~ Sitemap

// Does not grab link Text
async function sitemap_create_link(body) {
  console.group("db:sitemap_create_link");
  const { company_id, link, generic, specific, board } = body;
  console.log("sitemap_create_link", body);
  const existingRecord = await queryDb("SELECT id FROM sitemaps WHERE link = ?", [link]);
  if (!existingRecord.length) {
    const insertSql = `INSERT INTO sitemaps (company_id, link, generic, specific, board) VALUES (?, ?, ?, ?, ?)`;
    await queryDb(insertSql, [company_id, link, generic, specific, board]);
    console.log("Sitemap record inserted successfully for link:", link);
  } else {
    console.log("Sitemap record already exists for link:", link);
  }
  links = await queryDb("SELECT * FROM sitemaps WHERE company_id = ?", [company_id]);
  console.groupEnd();
  return { status: "success", links };
}

async function sitemap_remove_link(body) {
  console.group("db:sitemap_remove_link");
  let { id } = body;
  await queryDb(`DELETE FROM sitemaps WHERE id = ?;`, [id]);
  console.groupEnd();
  return {
    status: "success",
    params: { id }
  };
}

//~~~~ Post

async function extracts_view_for_post(id) {
  console.group("db:extracts_view_for_post");
  let post_id = parseInt(id.split("_")[1]);
  if (!parseInt(post_id)) {
    console.log("post_id=FALSE");
    return false;
  }
  extracts = await queryDb("SELECT * FROM extracts WHERE post_id = ?", [post_id]);
  console.groupEnd();
  return { status: "success", extracts };
}

// User hit 'Save Changes' on edit page
async function extract_update(body) {
  console.group("db:extract_update");
  let { extract_id, toggleUse, fromUrlLbl, originalText, ...extractDetails } = body;
  console.log("extract_update - ", {
    fromUrlLbl,
    extract_id,
    toggleUse,
    extractDetails
  });
  extract = Object.fromEntries(Object.entries(extractDetails).map(([k, v]) => [k, v.includes("\n") ? v.split("\n") : !v ? [] : [v]]));
  let status = toggleUse === "on" ? 1 : 0;
  console.log("toggleUse - ", { extract, fromUrlLbl, status, extract_id });
  // check if extract exists
  const record = await queryDb(`SELECT id FROM extracts WHERE id = ?`, [extract_id]);
  console.log("record", record);
  // Update the sitemap
  if (record.type != "post") {
    await queryDb(`UPDATE sitemaps SET text = ? WHERE id = ?`, [originalText, extract_id]);
  }
  await queryDb(`UPDATE extracts SET status = ?, extract = ?, text = ? WHERE id = ?`, [status, JSON.stringify(extract), originalText, extract_id]);
  console.groupEnd();
  return { status: "success", extract: { extract_id, status } };
}

//~~~~ Resume

async function extension_post_fetch(body) {
  console.group("db:extension_post_fetch");
  let { postId, companyId, companyName, jobTitle, userMessage } = body;
  let post = false;

  if (postId) {
    post = (await queryDb("SELECT * FROM posts WHERE id = ?", [postId]))[0];
    if (!post) {
      console.log("extension_post_fetch FAILED FOR POST:", postId);
    }
    // console.log('locate_post by id', { post })
  }
  if (!post && companyName) {
    // Get all companyies where company name is like companyName
    let company = await queryDb("SELECT * FROM companies WHERE companyName LIKE ?", [`%${companyName}%`]);
    if (!company.length) {
      console.log("extension_post_fetch FAILED FOR COMPANY: ", companyName);
    }
    let potential_posts = await company.map(async company => {
      let post = false;
      if (jobTitle) {
        let post = await queryDb("SELECT * FROM posts WHERE jobTitle LIKE ? AND company_id = ?", [`%${jobTitle}%`, company.id]);
        post = post.length ? post : false;
        if (!post) {
          console.log("JOB NOT FOUND LOOKING FOR", jobTitle);
        }
      }
      if (!post) {
        post = await queryDb("SELECT * FROM posts WHERE company_id = ?", [company.id]);
      }
      return post;
    });
    potential_posts = (await Promise.all(potential_posts)).flat();
    console.log("potential_posts", potential_posts);
    if (potential_posts.length) {
      post = potential_posts[0];
    }
  }
  if (post) {
    console.log("lookatthis!", post);
    postId = post.id;
    companyId = post.company_id;
    jobTitle = post.jobTitle;
    companyName = (await queryDb("SELECT companyName FROM companies WHERE id = ?", [companyId]))[0].companyName;
  }
  console.groupEnd();
  // console.log('locate_post', { postId, companyId, companyName, jobTitle })
  return {
    status: "success",
    companyId,
    postId,
    companyName,
    jobTitle,
    userMessage
  };
}

//DBFN // match where company name is substring of companyName
async function search_company(body) {
  let { companyName } = body;
  if (!companyName) {
    return { status: "failure" };
  }
  let companies = await queryDb("SELECT * FROM companies WHERE companyName LIKE ?", [`%${companyName}%`]);

  companies = await companies.map(async company => {
    // retrieve all posts for company
    company.posts = await queryDb("SELECT id, jobTitle FROM posts WHERE company_id = ?", [company.id]);
    return company;
  });
  companies = await Promise.all(companies);
  return { status: "success", data: companies };
}

//~~~~

async function getpostcreate(jobPost) {
  console.group("db:getpostcreate");
  const existingPost = await queryDb("SELECT id, company_id FROM posts WHERE text = ?", [jobPost]);
  const badPost = await queryDb("SELECT id FROM junk WHERE text = ?", [jobPost]);
  console.groupEnd();
  return { existingPost, badPost };
}

async function generate_pdf(body) {
  let latexCode = false; //"\\documentclass{article}\\begin{document}Hedddddddllol, World!\\end{document}";
  let url = "https://api.charleskarpati.com/resumes/compile" || "http://localhost/compile";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ latex: latexCode || body.newResume || body.newCoverLetter })
  });
  return response;
}

//~~~~

let db = {
  generate_pdf,
  userinfo_create,
  userinfo_view,
  userinfo_update,
  userinfo_remove,
  post_view,
  userinfo_update_single,
  search_company,
  ...dbutils
};

export { db };
