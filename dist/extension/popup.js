// popup.js

// console.log("popup.js: Loaded");

import { route, startScript, throttle, generate_resume, displayPdfText } from "./client.js";

// extension only fn
// client only localstorage vars:
// [postid, companyid, companyname, jobtitle,
//  postupload, questioninput, questionoutput]
window.loadFn = async () => {
  console.group("POPUP:load");

  // User Tab
  let userData = await startScript();
  handleNewUser(userData);
  if (!userData) {
    console.log("Ending. No userData.");
    console.groupEnd();
    return false;
  }
  window.userData = userData;

  // Fill Tab
  // Not needed

  // Q/A Tab
  let questioninput = localStorage.getItem("questioninput");
  let questionoutput = localStorage.getItem("questionoutput");
  if (questioninput) window.questioninput.value = questioninput;
  if (questionoutput) window.questionoutput.value = questionoutput;
  window.askquestion.addEventListener("click", askQuestion);

  //Load Tab
  window.postupload.addEventListener(
    "input",
    throttle(e => localStorage.setItem("postupload", e.target.value, ""), 500)
  );
  window.companyname.addEventListener("input", throttle(search_company, 500));
  window.uploadpost.addEventListener("click", window.post_create);
  window.postview.addEventListener("click", () => post_view(window.postid.value));
  window.clearall.addEventListener("click", clearAll);

  // Load Tab
  // Edit Tab
  // Create Tab
  let postupload = localStorage.getItem("postupload");
  let postData = await route(false, false, "postdata");
  populatePost(postData);
  if (postupload) window.postupload.value = postupload;
  if (!postData) {
    console.log("Ending. No postData.");
    console.groupEnd();
    return false;
  }

  let loadInfo = {
    userData,
    postData,
    postupload,
    questioninput,
    questionoutput
  };
  console.log("::", loadInfo);
  console.groupEnd();
};
window.onload = window.loadFn();

const handleNewUser = userData => {
  // console.log('handleNewUser', userData)
  let { openaikey, email } = userData;
  let newUser = !openaikey && !email;
  // console.log('newUser:', newUser, !openaikey, !email, {openaikey, email})
  if (newUser) {
    window.settingsuser.click();
    window.settingscontainer.firstChild.click();
  } else window.newuseralerts?.remove();
  const disabledElements = ["loadpost", "settingspost", "generatecontent", "fillformstab", "question"];
  disabledElements.forEach(tab => {
    const element = document.querySelector(`label[for="${tab}"]`);
    element.style = !newUser ? "" : "opacity: 0.5; cursor: not-allowed; pointer-events: none;";
    element.disabled = newUser;
  });
};

// evt set onload
const search_company = async e => {
  let valu = e?.target?.value;
  console.group("POPUP:search_company", valu);
  if (valu.length < 3) return;
  let data = await route({ postId: window.postid.value, companyName: valu }, "/search_company");
  if (data) {
    let container = window.matches;
    container.innerHTML = "<summary>matches</summary>";
    // Iterate through the list of companies and their posts
    data.map(company => {
      let deetail = document.createElement("details");
      let summary = document.createElement("summary");
      summary.innerHTML = company.companyName;
      deetail.appendChild(summary);
      // Iterate through each post of the company
      company.posts.map(post => {
        let job = document.createElement("div");
        job.style = "display: flex;";
        let btn = document.createElement("button");
        btn.innerHTML = "Go";
        job.appendChild(btn);
        btn.onclick = e => {
          deetail.removeAttribute("open");
          post_view(post.id);
        };
        let tex = document.createElement("span");
        tex.style = `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`;
        job.appendChild(tex);
        tex.innerHTML = " - " + post.jobTitle;
        deetail.appendChild(job);
      });
      container.appendChild(deetail);
    });
  }
  console.groupEnd();
};
function clearAll() {
  window.openaikey.value = "";
  window.companyname.value = "";
  window.jobtitle.value = "";
  window.postid.value = "";
  window.postupload.value = "";
  window.fillformsmessage.value = "";
  window.questioninput.value = "";
  window.questionoutput.value = "";
  window.newresume.value = "";
  let dash = window.dashlink;
  dash?.href && (dash.href = "http://localhost:3001/companys-view#detail-");
  let vars = ["postdata", "companyid", "resumepdftxt", "resumepdfurl", "companyname", "postid", "postupload", "fillformsmessage", "questioninput", "questionoutput", "jobtitle"];
  vars.map(item => localStorage.removeItem(item));
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// load.uploadpost.click > post_create > populatepost
// load[handleCompanyNameInpt, loadpostview].click  => postview => populatepost

async function handlePost(id, endpoint) {
  console.groupCollapsed("POPUP:", id, endpoint);
  let postData = await route(
    {
      postId: id || window.postid.value,
      postUpload: window.postupload.value
    },
    `/${endpoint}`,
    "postdata"
  );
  populatePost(postData);
  if (postData.text) localStorage.setItem(postData.text, "postupload");
  console.groupEnd();
  return postData;
}
window.post_create = async e => {
  handlePost(false, "post_create");
};
window.post_view = async id => handlePost(id, `post_view/${id || 0}`);

// called by [load, post_view, post_creat]
function populatePost(data) {
  console.groupCollapsed("popup:populatepost");
  console.log(data);
  if (!data) {
    console.groupEnd("popup:populatepost");
    return false;
  }
  let { company_id, id, companyName, jobTitle, text } = data;

  window.postid.value = id;
  let els = document.querySelectorAll(`input[name="postid"]`);
  els.forEach(el => (el.value = company_id));

  window.companyname.value = companyName;
  window.jobtitle.value = jobTitle;
  if (company_id) {
    let els = document.querySelectorAll(`input[name="companyid"]`);
    els.forEach(el => (el.value = company_id));
    window.dashlink.href = "http://localhost:3001/companys-view#detail-" + company_id;
  }
  window.postupload.value = text;

  // 'Create' tab
  function createCreateTab(meta) {
    console.log("createApplicationPanl", {
      meta
    });
    let container = window.generatecontentcontainer;
    const generateOptions = dataArray => dataArray.map(resObj => `<option value="${resObj.id}">${resObj.title}</option>`).join("");
    const setupDropdown = key => {
      console.log("CREATING DROPDOWN FOR:", { key, userData });
      const messageOptions = generateOptions(window.userData[key + "messages"]);
      const templateOptions = generateOptions(window.userData[key + "s"]);
      container.querySelector(`[name="${key}id"]`).innerHTML = templateOptions;
      const messageDropdown = container.querySelector(`[name="${key}messageid"]`);
      messageDropdown.innerHTML = messageOptions;
      messageDropdown.addEventListener("change", event => {
        const message = window[key + "messages"].find(msg => msg.id == event.target.value);
        container.querySelector(`[name="message${key}"]`).innerHTML = message.text;
      });
      container.querySelector(`[name="message${key}"]`).innerHTML = window.userData[key + "messages"][0]?.text || "";
    };
    setupDropdown("resume");
    setupDropdown("coverletter");
    // setupDropdown("email");
    // container.querySelector('[name="emailapplicationto"]').value = meta.emailApplicationTo || "";
    // container.querySelector('[name="emailapplicationsubjectline"]').value = meta.emailApplicationSubjectLine || "";
    container.querySelector('button[name="generateresume"]').onclick = e => generate_resume(e);
    // container.querySelector('button[name="generatecoverletter"]').onclick = e => generateCoverLetter(e);

    let latex = localStorage.getItem(`resumeLatex`) || "";
    // latex = JSON.parse(localStorage.getItem("resumetemplates"))[0].text;
    displayPdfText("resume", { newResume: latex }, false);

    let coverLetter = localStorage.getItem(`coverletterLatex`) || "";
    // displayPdfText("coverletter", { newCoverLetter: coverLetter });
    displayPdfText("coverletter", { newCoverLetter: latex }, false);
  }
  createCreateTab(data);

  data.resume && route({ newResume: data.resume || "", company_id, post_id: data.id + "", useSaved: true }, "generate_pdf", "resumepdfurl");

  document.querySelectorAll(`input[name="companyid"]`).forEach(companyContainer => {
    companyContainer.value = company_id;
  });
  document.querySelectorAll(`input[name="postid]"`).forEach(postContainer => {
    postContainer.value = id;
  });

  if (company_id) {
    window.companyid && (window.companyid.value = company_id);
    window.dashlink.href = "http://localhost:3001/companys-view#detail-" + company_id;
  }
  if (id) window.postid.value = id;
  if (companyName) window.companyname.value = companyName;
  if (jobTitle) window.jobtitle.value = jobTitle;
  if (text) window.postupload.value = text;

  console.groupEnd();
  return data;
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~sa
// TAB:Q/A  - chatGPT/queryDB
async function askQuestion(request) {
  console.log("Ask Question");
  localStorage.setItem("questioninput", window.questioninput.value);
  let questionInput = window.questioninput.value;
  // let companyId = parseInt(request.companyId) || 0;
  let postId = parseInt(window.postid.value) || 0;
  // post fetch to http://localhost:3001/fill-form with stringified inputOptions
  let data = {
    questionInput: questionInput,
    postId: postId
  };
  let resp = await route(data, "extension-ask-question", "questionoutput");
  window.questionoutput.value = resp.questionOutput;

  return data;
}
//bookmarkdeletefromhere
/*
//
//
*/

// event - selectForm
window.selectform.addEventListener("click", async () => {
  let resp = await sendMessage("selectForm");
  // console.log('Response from content script:', resp);
  return resp;
});

// event - fillForms
window.fillforms.addEventListener("click", () => {
  sendMessage("fillForms");
});

// Send message to content script
async function sendMessage(action) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query(
      {
        active: true,
        currentWindow: true
      },
      tabs => {
        if (tabs.length === 0) {
          reject(new Error("No active tab found."));
          return;
        }
        chrome.tabs.query(
          {
            active: true,
            currentWindow: true
          },
          function (tabs) {
            chrome.tabs.sendMessage(
              tabs[0].id,
              {
                action: action,
                companyName: window.companyname.value || "",
                jobTitle: window.jobtitle.value || "",
                // companyId: document.getElementById('companyId').value,
                postId: window.postid.value,
                // postExcerpt: document.getElementById('postExcerpt').value,
                postUpload: window.postupload.value,
                fillFormsMessage: window.fillformsmessage.value || "",
                // fillFormsOptions: document.getElementById('fillFormsOptions').value,
                questionInput: window.questioninput.value
              },
              function (response) {}
            );
          }
        );
      }
    );
  });
}

chrome.runtime.onMessage.addListener(function (data, sender, sendResponse) {
  console.log("data", data);
  if (data.postId) {
    window.postid.value = data.postId;
  }
  if (data.companyName) {
    window.companyname.value = data.companyName;
  }
  // askQuestion
  if (data.questionOutput) {
    window.questionoutput.value = data.questionOutput;
  }
});
