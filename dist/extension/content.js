// content.js
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log("content.js received message:", request);
  let action = request.action;
  let data = action === "fillForms" ? await fillForms(request) : action === "askQuestion" ? await askQuestion(request) : action === "selectForm" ? await selectForm(request) : { error: "Invalid action" };
  chrome.runtime.sendMessage({ action, ...data });
  return true;
});

// Non Iframes, highlight and onclick get inputs.
// For Iframes, Inspect iframe, clipboard paste command.

async function selectForm(request) {
  console.log("Select Form", request);
  const container = document.createElement("div");
  container.style = "position: fixed; bottom: 0; right: 0; z-index: 9999; padding: 10px; background: #000; color: #fff; border: none; cursor: pointer;";

  document.addEventListener("mouseover", highlightElement);
  document.addEventListener("mouseout", removeHighlight);
  document.addEventListener("click", changeBackgroundAndLog, true);

  let btn = document.createElement("button");
  btn.innerHTML = "Iframe Fn";
  btn.style = "position: fixed; bottom: 0; right: 0; z-index: 9999; padding: 10px; background: #000; color: #fff; border: none; cursor: pointer;";

  let log = document.createElement("div");
  log.style = "maxWidth:200px; margin-right: 200px; float:right; overflow:auto";
  function highlightElement(event) {
    event.target.style.border = "2px solid red";
  }
  function removeHighlight(event) {
    event.target.style.border = "";
  }

  function changeBackgroundAndLog(event) {
    console.log("CHANGE");
    // while (container.firstChild) { container.removeChild(container.firstChild); }
    let selected = event.target;
    let iframe = selected.tagName.toLowerCase() === "iframe" ? selected : selected.querySelector("iframe");
    if (iframe) {
      console.log("iframe");
      delete request.postupload;
      let req = JSON.stringify(request);
      log.innerHTML = `
        let text = document.querySelector('form').outerHTML; 
        fillForm = ${fillForm.toString()}; 
        fillFormsOptions = JSON.stringify(text, null, 2); 
        console.log('fillFormsOptions', fillFormsOptions); 
        // Correctly serialize 'req' for insertion into a template string
        let req = JSON.parse(\`${req.replace(/`/g, "\\`")}\`);
        fillForm({...JSON.parse(\`${req}\`), fillFormsOptions});
      `;
      navigator.clipboard.writeText(log.innerHTML);
    } else {
      fillForm({ ...request, selected: selected.outerHTML });
    }
    log.innerHTML = "Copied to Clipboard";
    container.appendChild(log);
    document.removeEventListener("mouseover", highlightElement);
    document.removeEventListener("mouseout", removeHighlight);
    document.removeEventListener("click", changeBackgroundAndLog, true);
    document.querySelectorAll("*").forEach(el => {
      if (el.style.border === "2px solid red") {
        el.style.border = "";
      }
    });
    event.target.style.background = "rgba(173, 216, 230, 0.5)";
    event.preventDefault();
    event.stopPropagation();
  }

  container.appendChild(btn);
  document.body.appendChild(container);
}

fillForm = window.fillForm = async function (request) {
  console.log("FILL FORM", request);
  let postId = parseInt(request.postId) || 0;
  let companyName = request.companyName;
  let jobName = request.jobName;
  let fillFormsMessage = request.fillFormsMessage || "";
  let fillFormsOptions = request.fillFormsOptions || false;

  // Prepare the query
  let url = "http://localhost:3001/extension-fill-form";
  let data = {
    fillFormsMessage: fillFormsMessage,
    postId: postId,
    companyName: companyName,
    jobName: jobName,
    fillFormsOptions: fillFormsOptions
  };

  // Fetch the data
  let resp = await fetch(url, { method: "POST", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } });
  response = await resp.json();
  fillFormsOptions = response.fillFormsOptions;

  // Populate the form
  fillFormsOptions.map(function (input) {
    // console.log('input:', input)
    let element = false;
    try {
      element = document.getElementById(input.getElementById);
    } catch (e) {}
    if (!element)
      try {
        element = document.querySelector('[name="' + input.name + '"]');
      } catch (e) {}
    if (!element) {
      console.log("Element Not Found", { element, input });
      return;
    }
    console.log("test", element, input.type, input); //, '\Q: ' + input.informationRequested, '\r\n A:  ' + input.value);
    if (input.value === "hidden") {
      return;
    }

    // list out the type of input types
    if (input.type === "file") {
    } else if (input.type === "text") {
      element.value = input.value;
    } else if (input.type === "textbox") {
      element.value = input.value;
    } else if (input.type === "textarea") {
      element.value = input.value;
    } else if (input.type === "email") {
      element.value = input.value;
    } else if (input.type === "radio") {
      if (!element.checked) {
        element.click();
      }
    } else if (input.type === "checkbox") {
      if (!element.checked) {
        element.click();
      }
    }
    const changeEvent = new Event("change", { bubbles: true });
    element.dispatchEvent(changeEvent);
    const event = new Event("input", { bubbles: true });
    element.dispatchEvent(event);
  });
};

async function fillForms(request) {
  console.log("Fill Form(s)");
  return fillForm(request);
}
