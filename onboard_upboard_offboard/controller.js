browser.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
    //if (temporary) return; // skip during development
    switch (reason) {
        case "install":
            {
                console.debug("Addon installed!");
                const url = browser.runtime.getURL("onboard_upboard_offboard/onboard_site/onboard.html");
                try {
                    await browser.tabs.create({ url });
                } catch (error) {
                    console.error(error);
                }
            }
            break;
        case "update":
            //TODO: add on update
            break;

    }
});

//TODO: add offboarding
//browser.runtime.setUninstallURL("");