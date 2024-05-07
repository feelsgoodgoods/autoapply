// console.log("sharedClient.js: Loaded");
window.runningInBrowser = typeof window !== "undefined" && window.document;
let isChromeExtension = window.chrome && chrome.runtime && true;
import { route, showToast } from "./router.js";

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

//~~~~~~ Onstart

// Shared Start Script. Called From/ Calls window.loadFn
//
// Retrieve from Db and SET into LOCALSTORAGE [email, name, openaikey, bio, res/cl/email stuff]
// Sets EVT LISTENERS on their associated inputs
//
async function startScript() {
  console.groupCollapsed(":client:load:"); //groupCollapsed
  console.log(Date());
  let w = window;

  // get
  let email = (await localStorage.getItem("email")) || false;
  let name = await route(false, "/userinfo_view/fullname", "fullname", arr => arr[0]?.text || "");
  let key = await route(false, "/userinfo_view/openaikey", "openaikey", arr => arr[0]?.text || "");
  let bio = await route(false, "/userinfo_view/bio", "bio", arr => arr[0]?.text || "");

  // set
  w.fullname.value = name;
  w.openaikey.value = key;
  w.bio.value = bio;

  // listen
  let throt = (e, name) => throttle(e => (e.preventDefault(), route(e, "/userinfo_update_single", name)), 500);
  w.openaikey.addEventListener("input", e => {
    throt(e, "openaikey");
    // setTimeout(startScript, 1000);
    setTimeout(window.loadFn, 1000);
  });

  w.fullname.addEventListener("input", throt("fullname"));
  w.openaikey.addEventListener("input", throt("bio"));
  document.querySelector("button[name='updatebio']").onclick = throt("bio");

  // New Users
  let isUser = key || email;
  if (!isUser) return false;

  // get
  const sortDefaultFirst = arr => (arr?.length < 2 && arr) || arr.sort((a, b) => (a.title.toLowerCase() === "default" ? -1 : b.title.toLowerCase() === "default" ? 1 : a.title.localeCompare(b.title)));
  let resumes = await route(false, "/userinfo_view/resumetemplates", "resumetemplates", sortDefaultFirst);
  let resumemessages = await route(false, "/userinfo_view/resumemessages", "resumemessages", sortDefaultFirst);
  let coverletters = await route(false, "/userinfo_view/coverlettertemplates", "coverlettertemplates", sortDefaultFirst);
  let coverlettermessages = await route(false, "/userinfo_view/coverlettermessages", "coverlettermessages", sortDefaultFirst);
  let emails = await route(false, "/userinfo_view/emailtemplates", "emailtemplates", sortDefaultFirst);
  let emailmessages = await route(false, "/userinfo_view/emailmessages", "emailmessages", sortDefaultFirst);

  //
  // set              USERINFO TEMPLATE
  // listen on:       [upload, display]
  // of each of type: [template, message]
  // for each lbl:    [resume, coverletter, email]
  //
  let createUploadPanel = lbl => {
    // Prep the template
    let div = document.createElement("div");
    let template = window.userinfotemplate.content.cloneNode(true);
    div.innerHTML = template.firstElementChild.outerHTML.replace(/{{{replace}}}/g, lbl);
    div.querySelectorAll(`button`).forEach(btn => (btn.onclick = userinfo_upload));
    div.querySelector('summary[name="templates"]').onclick = e => userinfo_list("template", lbl);
    div.querySelector('summary[name="messages"]').onclick = e => userinfo_list("message", lbl);
    window.biocontainer.insertAdjacentElement("afterend", div);
  };
  ["resume", "coverletter", "email"].map(t => createUploadPanel(t));

  let userinfo = {
    email,
    fullname: name,
    openaikey: key,
    bio,
    resumes,
    resumemessages,
    coverletters,
    coverlettermessages,
    emails,
    emailmessages
  };
  console.groupEnd();
  return userinfo;
}

function throttle(func, limit) {
  let lastFunc;
  let lastRan;
  return function () {
    const context = this;
    const args = arguments;
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function () {
        if (Date.now() - lastRan >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - Date.now() - lastRan);
    }
  };
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

//~~~~~~ User

// Upload new [resume, coverletter, email]
async function userinfo_upload(e) {
  console.group("CLIENT:USERINFO_UPLOAD:"); // ~~~~~~~~~~~~~~~~~~~~~~~~~~~
  e.preventDefault();
  let clicked = e.target.form.querySelector("[name='label']").value; //lbl+s = resumes
  let contents = await route(e, "/userinfo_create", clicked);
  let summaries = document.querySelectorAll('summary[name="uploadedTemplates"]');
  summaries.forEach(summary => {
    let details = summary.closest("details");
    if (details.open) summary.click();
  });
  console.groupEnd();
}

// Onclick: Display the lbl: [resume, coverletter, email] list of type:[template, message]
// Attaches Onclick evt [update, remove]
async function userinfo_list(type, lbl) {
  console.group("CLIENT:USERINFO_LIST:"); // ~~~~~~~~~~~~~~~~~~~~~~~~~~~
  let label = `${lbl}${type}s`;
  let records = await route(false, false, label);
  console.log({ label, records });
  let cid = lbl + "" + type + "uploads";
  let container = document.getElementById(cid);
  container.innerHTML = "";

  // List out templates or messages
  records?.map(resumeObj => {
    // console.log("CLIENT:USERINFO_LIST:Set:Onclick:For:")//, { lbl, type }, resumeObj); // ~~~~~~~~~~~~~~~~~~~~~~~~~~~

    // Clone the 'update' template
    const template = window.userinfoupdatetemplate.content.cloneNode(true);
    let div = document.createElement("div");
    div.innerHTML = template.firstElementChild.outerHTML.replace(/replaceThis/g, lbl);

    // Set values
    let { id, text, title } = resumeObj;
    div.querySelector("summary").innerHTML = title;
    div.querySelector("details").id = lbl + "-" + id;
    div.querySelector(`[name="title"]`).value = title;
    div.querySelector(`[name="userinfoid"]`).value = id;
    div.querySelector(`[name="label"]`).value = label;
    div.querySelector(`[name="text"]`).innerHTML = text;
    div.querySelector('button[name="update"]').onclick = userinfo_update;
    div.querySelector('button[name="remove"]').onclick = userinfo_remove;
    container.appendChild(div);
  });
  console.groupEnd();
}

function stopprop(e) {
  e.preventDefault();
  e.stopPropagation();
}

function userinfo_remove(e) {
  stopprop(e);
  route(e, "/userinfo_remove") && e.target.form.parentElement.remove();
}

function userinfo_update(e) {
  e.preventDefault();
  e.stopPropagation();
  console.log("clciked");
  route(e, "/userinfo_update");
}
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

//~~~~~~~ Create

//
// onstart - fill supplementalurls, instructionstoapplicant, applicationurlval,
// fills [companyid, postid]
//

//
async function generate_resume(event) {
  console.group(":generateResume:Using: ", event.target.form);
  event.preventDefault(event);
  let startTime = new Date().getTime();
  let data = await route(event, "/resume_generate");

  let endTime = new Date().getTime();
  let lapse = endTime - startTime;
  let lapseInSeconds = (lapse / 1000).toFixed(2);
  console.log(`Operation took ${lapseInSeconds} seconds`);
  display_pdf_text("resume", data);
  console.groupEnd();
}

async function generatepdf(lbl, body, generatePdf) {
  console.log("generate_pdf", body);
  let jobPostContainer = document.getElementById(`post-${body.company_id}-${body.post_id}`);
  if (!jobPostContainer) {
    jobPostContainer = window.generatecontentcontainer;
    // data = JSON.parse(localStorage.getItem("postData")) || {};
  }
  async function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.readAsDataURL(blob);
    });
  }
  let url;
  if (generatePdf || !localStorage.getItem(`${lbl}PdfUrl`)) {
    try {
      let blob = await route(body, "/generate_pdf", "POST_BLOB", false);
      if (blob) {
        let base64 = await blobToBase64(blob);
        localStorage.setItem(`${lbl}PdfUrl`, base64);
        url = URL.createObjectURL(blob);
      }
    } catch (error) {
      console.error("Failed to generate or fetch PDF: ", error);
      return;
    }
  } else {
    let base64 = localStorage.getItem(`${lbl}PdfUrl`);
    let byteString = atob(base64.split(",")[1]);
    let mimeString = base64.split(",")[0].split(":")[1].split(";")[0];
    let ia = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    let blob = new Blob([ia], { type: mimeString });
    url = URL.createObjectURL(blob);
  }

  return url;
}

// Also attaches [Download, Refresh] event listeners.
async function display_pdf_text(lbl, body, generatePdf = true) {
  console.log(":display_pdf_text:", body);
  let { company_id, post_id, newResume, newCoverLetter } = body;
  let newText = lbl === "resume" ? newResume : newCoverLetter;
  let jobPostContainer = document.getElementById(`post-${company_id}-${post_id}`) || window.generatecontentcontainer;

  // Save the text
  localStorage.setItem(`${lbl}Latex`, newText);

  // Display the text
  let genText = jobPostContainer.querySelector(`[name="new${lbl}"]`);
  genText.value = newText;
  /*
  let generate_pdf = async () => {
    console.log("generate_pdf", body); 

    let pdfUrl = URL.createObjectURL(blob);
    let preview = jobPostContainer.querySelector(`[name="preview${lbl}"]`);
    preview.src = pdfUrl;
    preview.style.display = "inline-block";
    // localStorage.setItem(`${lbl}PdfUrl`, pdfUrl);
    return pdfUrl;
  };  */

  let url = await generatepdf(lbl, body, generatePdf);

  console.log("yay", body, url);

  // lbl === "resume" ?
  if (url) {
    jobPostContainer.querySelector(`[name='preview${lbl}']`).src = url;
    jobPostContainer.querySelector(`[name='refresh${lbl}']`).style.display = "inline-block";
    jobPostContainer.querySelector(`[name='download${lbl}']`).style.display = "inline-block";
    jobPostContainer.querySelector(`[name='preview${lbl}']`).style.display = "inline-block";
    // let link = window.resumePdfLink
  }

  let downloadPdf = () => {
    let a = document.createElement("a");
    a.href = jobPostContainer.querySelector(`[name="preview${lbl}"]`).src;
    a.download = `${lbl}-${window.name}-${company_id}-${post_id}.pdf`;
    a.click();
  };

  // Event Listener - Refresh
  let refreshBtn = jobPostContainer.querySelector(`[name="refresh${lbl}"]`);
  refreshBtn.onclick = event => {
    event.preventDefault();
    display_pdf_text(lbl, {}, true);
  };

  // Event Listener - Download
  let downloadBtn = jobPostContainer.querySelector(`[name="download${lbl}"]`);
  downloadBtn.onclick = event => {
    event.preventDefault();
    downloadPdf();
  };
}

export { route, showToast, throttle, startScript, generate_resume, display_pdf_text as displayPdfText };
