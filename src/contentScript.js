'use strict';

import * as OTPAuth from "otpauth";

/**
 * Conditions for running:
 * 1. Domain is xfactor.rug.nl
 * 2. No error in page (leads to endless loop)
 */

let queryInputField = 'input[type="text"][name="nffc"]#nffc'
let queryNextButton = 'button[type="button"][name="loginButton2"]#loginButton2'

// Check if there is an authentication error
let errorPresent = !!document.querySelector('.error-text');
// Check domain
let domainCheck = (location.hostname == 'xfactor.rug.nl');
// Check if autocomplete is active
let autocompleteObject = await chrome.storage.local.get(["autocomplete"]);
let autocompleteActive = autocompleteObject.autocomplete == 'enabled';

console.log(!errorPresent && domainCheck && autocompleteActive);

if (!errorPresent && domainCheck && autocompleteActive) {
  // Obtain secret from storage
  chrome.storage.local.get(["secret"]).then((result) => {
    let secret = result.secret;
    // Create totp object
    let totp = new OTPAuth.TOTP({
      issuer: "RUG",
      label: "AzureDiamond",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret)
    });
    let token = totp.generate();

    // Fill input with generated token
    document.querySelector(queryInputField).value = token;

    // Click on "Next" button
    let nextButton = document.querySelector(queryNextButton);
    nextButton.click()
  });
}
