'use strict';

import './popup.css';
import * as OTPAuth from "otpauth";
import qrcodeParser from "qrcode-parser";

(function () {
  // Update secret to Chrome's user storage
  const saveSecretToStorage = (secret) => {
    chrome.storage.local.set({ secret: secret });
  };

  // Update autocomplete preference to Chrome's user storage
  const saveAutocompleteToStorage = (state) => {
    state ? chrome.storage.local.set({ autocomplete: 'enabled' }) : chrome.storage.local.set({ autocomplete: 'disabled' });
  };

  // Set the value of the Secret input field equal to the secret in storage
  const setInputFromStorage = () => {
    chrome.storage.local.get(["secret"]).then((result) => {
      // Check if user has a defined secret key in storage
      if (result.secret === undefined || result.secret === '') {
        document.getElementById('no-key').style.display = 'block';
        // Empty field and make it visible
        document.getElementById('mfa-secret').value = '';
        document.getElementById('mfa-secret').type = "text";
        document.getElementById('mfa-hide').textContent = "🔒";
        document.getElementById('mfa-hide').title = chrome.i18n.getMessage("hide_secret_key");
        // Hide autocomplete-toggle and token-output
        document.getElementById('autocomplete-toggle').style.display = 'none';
        document.getElementById('token-output').style.display = 'none';
      } else {
        document.getElementById('mfa-secret').value = result.secret;
        // Hide #no-key div
        document.getElementById('no-key').style.display = 'none';
      }
    });
  };

  // Set the value of the autocomplete input field equal to the secret in storage
  // Set the button accordingly
  const setAutocompleteFromStorage = () => {
    chrome.storage.local.get(["autocomplete"]).then((result) => {
      // Without value in storage, default value = ON
      if (result.autocomplete === undefined) {
        saveAutocompleteToStorage(true);
        result.autocomplete = 'enabled';
      }
      // Set text input field
      document.getElementById('mfa-autocomplete').value = chrome.i18n.getMessage(result.autocomplete);
      // Set text on toggle button
      if (result.autocomplete == 'enabled') {
        document.getElementById('mfa-autocomplete-toggle').textContent = chrome.i18n.getMessage('deactivate');
      } else if (result.autocomplete == 'disabled') {
        document.getElementById('mfa-autocomplete-toggle').textContent = chrome.i18n.getMessage('activate');
      }
    });
  };

  // Generate token and place it in output field
  const generateTokeninOutputField = () => {
    // Take secret from input area
    let secret = document.getElementById('mfa-secret').value;

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
    // Place token in output field
    document.getElementById('mfa-code-output').value = token;
  }

  // Processes the string resulted from the QR code reading
  // E.g., otpauth://totp/RUG:WORKSPACE%XXXXXXXXXX?secret=XXXXXXXXXXXXXXXX&issuer=RUG
  const processDecodedQR = (s) => {
    const regexp = /otpauth:\/\/totp\/[\w:%]*\?secret=([\w\d]*)&issuer=[\w]*/g;
    return [...s.matchAll(regexp)][0][1]
  };

  const configureInternationalisation = () => {
    document.querySelectorAll('[data-locale]').forEach(elem => {
      elem.innerText = chrome.i18n.getMessage(elem.dataset.locale)
    })
  }

  /** 
   * When opening pop-up:
   * 1. set value of input to secret from browser storage
   * 2. get from storage the value of autocomplete user preference
   * 2. generate new code in output field every 1 second
   * */
  setInputFromStorage();
  setAutocompleteFromStorage();
  setInterval(() => generateTokeninOutputField(), 1000)

  // Save secret to storage when pressing "Save" button
  document.getElementById('mfa-save').addEventListener('click', () => {
    let secret = document.getElementById('mfa-secret').value;
    saveSecretToStorage(secret);
  });

  // Regenerate codes in output field when "Generate" button pressed
  document.getElementById('mfa-generate').addEventListener('click', () => generateTokeninOutputField());

  // Handle hide button toggle function
  document.getElementById('mfa-hide').addEventListener('click', () => {
    let mfaSecret = document.getElementById('mfa-secret');
    let mfaHide = document.getElementById('mfa-hide');
    if (mfaSecret.type === "password") {
      mfaSecret.type = "text";
      mfaHide.textContent = "🔒";
      mfaHide.title = chrome.i18n.getMessage("hide_secret_key");
    } else if (mfaSecret.type === "text") {
      mfaSecret.type = "password";
      mfaHide.textContent = "👁️‍🗨️";
      mfaHide.title = chrome.i18n.getMessage("make_secret_key_visible");
    }
  });

  // Handle autocomplete toggle button
  document.getElementById('mfa-autocomplete-toggle').addEventListener('click', () => {
    // Get value of autocomplete from storage
    chrome.storage.local.get(["autocomplete"]).then((result) => {
      if (result.autocomplete == 'enabled') {
        // Disable autocomplete
        saveAutocompleteToStorage(false);
        document.getElementById('mfa-autocomplete').value = chrome.i18n.getMessage('disabled'); // Set input field value
        document.getElementById('mfa-autocomplete-toggle').textContent = chrome.i18n.getMessage('activate'); // Set button label
      } else if (result.autocomplete == 'disabled') {
        // Enable autocomplete
        saveAutocompleteToStorage(true);
        document.getElementById('mfa-autocomplete').value = chrome.i18n.getMessage('enabled'); // Set input field value
        document.getElementById('mfa-autocomplete-toggle').textContent = chrome.i18n.getMessage('deactivate'); // Set button label
      }
    });
  });

  // Handle copy button function
  document.getElementById('mfa-copy').addEventListener('click', () => {
    let mfaCodeOutput = document.getElementById('mfa-code-output');
    // Use Clipboard API
    navigator.permissions.query({ name: "clipboard-write" }).then((result) => {
      if (result.state === "granted" || result.state === "prompt") {
        navigator.clipboard.writeText(mfaCodeOutput.value).then(() => {
          document.getElementById('mfa-copy').textContent = '✅';
          document.getElementById('mfa-copy').title = chrome.i18n.getMessage("copied_success");
        }, () => {
          document.getElementById('mfa-copy').textContent = '❌';
          document.getElementById('mfa-copy').title = chrome.i18n.getMessage("copied_error");
        });
      }
    });
  })

  // Handle accepting PNGs, decode QR and set new secret
  const fileSelector = document.getElementById('file-selector');
  fileSelector.addEventListener('change', (event) => {
    const file = event.target.files[0];
    qrcodeParser(file).then((s) => {
      let secret = processDecodedQR(s)
      saveSecretToStorage(secret);
      setInputFromStorage();
      // Show again autocomplete-toggle and token-output (because they were hidden)
      document.getElementById('autocomplete-toggle').style.display = 'block';
      document.getElementById('token-output').style.display = 'block';
      // Hide mfa-secret
      document.getElementById('mfa-secret').type = "password";
      document.getElementById('mfa-hide').textContent = "👁️‍🗨️";
      document.getElementById('mfa-hide').title = chrome.i18n.getMessage("make_secret_key_visible");
    });
  });


  // Handle showing time until token reset
  setInterval(() => {
    let secondsLeft = 30 - (new Date().getSeconds() % 30);
    document.getElementById('mfa-generate').textContent = '🕒 ' + secondsLeft;
  }, 200);

  configureInternationalisation();

})();
