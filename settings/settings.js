const indicator = document.querySelector("#permission-indicator");
const switcher = document.querySelector("#permission-switcher");
var allUrlPermission;

async function hasAllUrlPermission() {
    let response = await browser.permissions.getAll();
    return response.origins.includes('<all_urls>');
}

async function render() {
    if (await hasAllUrlPermission()) {
        indicator.textContent = "granted";
        indicator.classList = "granted";
        switcher.textContent = "Revoke permissions";
        allUrlPermission = true;
    } else {
        indicator.textContent = "not granted";
        indicator.classList = "not-granted";
        switcher.textContent = "Request permissions";
        allUrlPermission = false;
    }
}

switcher.addEventListener("click", () => {
    const permissionsToModify = {
        origins: ["<all_urls>"],
    }
    //Would love to just do an async call of hasAllUrlsPermission, 
    //but then we can't be considered user input anymore and therefore 
    //can't change permissions.
    if (allUrlPermission) {
        browser.permissions.remove(permissionsToModify).then(() => {
            render();
        });
    } else {
        browser.permissions.request(permissionsToModify).then(() => {
            render();
        });
    }
});

render();