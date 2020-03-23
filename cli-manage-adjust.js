'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const APP_TOKEN = process.env.APP_TOKEN;

const ARGV = require('minimist')(process.argv.slice(2));
const IS_DEBUG = ARGV['debug'] || false;

var screenshotsCount = 0

const nowDateString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1);
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const secounds = date.getSeconds();
  return `${year}/${month}/${day} ${hours}:${minutes}:${secounds}`
}

const log = (message) => {
  process.stderr.write(`${nowDateString()}> ${message}\n`);
}

const error = (message) => {
  console.error('==========ERROR==========');
  console.error(message);
  console.error('=========================');
  process.exit(1);
}

const outputResult = (message) => {
  console.log(message)
}

const sc = async (page, name) => {
  if (!IS_DEBUG) return;

  const fileName = `${screenshotsCount}_${name}.png`;
  screenshotsCount += 1;
  log(`take screenshots: ${fileName}`);
  await page.screenshot({path: `screenshots/${fileName}`, fullPage: true});
}

const getSecrets = async (page) => {
  const secretElements = await page.$$('span.raw-secret')
  let secrets = []
  for (const row of secretElements) {
    const parent = (await row.$x('..'))[0];
    const parent2 = (await parent.$x('..'))[0];

    const className = await (await (await parent2.$('.secret-status')).getProperty('className')).jsonValue()
    const isEnable = className.includes('enable')

    const secretValue = await (await (await parent.$('.secret-value')).getProperty('textContent')).jsonValue();
    const secretName = secretValue.replace(/\n\s+/g, '')
    const rawSecret = await (await (await parent.$('.raw-secret')).getProperty('textContent')).jsonValue();
    const secretInfo = rawSecret.match(/\((\d+), (\d+), (\d+), (\d+), (\d+)\)/).slice(1)
    secrets.push({
      isEnable: isEnable,
      name: secretName,
      version: secretInfo[0],
      secret1: secretInfo[1],
      secret2: secretInfo[2],
      secret3: secretInfo[3],
      secret4: secretInfo[4]
    });
  }
  return secrets
}

const newSecret = async (page, secretName) => {
  await (await page.$('a[href$="/secrets/create"]')).click();
  await page.waitForSelector('#name');
  await page.waitFor(1000);
  await page.type('#name', secretName);
  page.keyboard.press('Enter');
  await page.waitForNavigation();
  await page.waitFor(1000);
}

const toEnableSecret = async (page, targetSecretName) => {
  let isSuccessToEnable = false
  const secretElements = await page.$$('span.raw-secret')
  for (const row of secretElements) {
    const parent = (await row.$x('..'))[0];
    const parent2 = (await parent.$x('..'))[0];

    const className = await (await (await parent2.$('.secret-status')).getProperty('className')).jsonValue()
    const isEnable = className.includes('enable')

    const secretValue = await (await (await parent.$('.secret-value')).getProperty('textContent')).jsonValue();
    const secretName = secretValue.replace(/\n\s+/g, '')
    if (!isEnable && secretName === targetSecretName) {
      await (await parent2.$('a[title="有効化"]')).click()
      isSuccessToEnable = true
      break
    }
  }
  return isSuccessToEnable
}

const clickDisableSecret = async (page, targetSecretName) => {
  let isClickToDisable = false
  const secretElements = await page.$$('span.raw-secret')
  for (const row of secretElements) {
    const parent = (await row.$x('..'))[0];
    const parent2 = (await parent.$x('..'))[0];

    const className = await (await (await parent2.$('.secret-status')).getProperty('className')).jsonValue()
    const isEnable = className.includes('enable')

    const secretValue = await (await (await parent.$('.secret-value')).getProperty('textContent')).jsonValue();
    const secretName = secretValue.replace(/\n\s+/g, '')
    if (isEnable && secretName === targetSecretName) {
      await (await parent2.$('a[title="無効化"]')).click()
      isClickToDisable = true
      break
    }
  }
  return isClickToDisable
}

const toDisableSecret = async (page) => {
  let isSuccessToDisable = false

  const disableButtonSelector = 'div>div>button'
  const disableButtonText = await page.evaluate((selector) => {
    return document.querySelector(selector).innerText;
  }, disableButtonSelector);

  if (disableButtonText == '無効化') {
    const disableButton = await page.$(disableButtonSelector);
    disableButton.click();
    await page.waitFor(1000);
    if (IS_DEBUG) await sc(page, 'change_to_disable_click_1');
    await (await page.$('a[title="OK"]')).click();
    await page.waitFor(1000);
    if (IS_DEBUG) await sc(page, 'change_to_disable_click_2');
    await page.waitForNavigation();

    isSuccessToDisable = true
  }

  return isSuccessToDisable
}

(async () => {
  log('Check Adjust account');
  if (!(EMAIL && PASSWORD && APP_TOKEN)) {
    error('Require env: `EMAIL`,`PASSWORD`,`APP_TOKEN`');
  }
  if (!ARGV['current'] && !(ARGV['app'] && ARGV['version'])) {
    error('Require `--app,--version` (a.g. `node cli-manage-adjust.js --app YourAppName --version YourAppVersion`)');
  }

  const targetSecretName = `${ARGV['app']}#${ARGV['version']}`;
  const changeToDisableMode = ARGV['disable'] || false;
  const showCurrentOnly = ARGV['current'] || false;

  if (IS_DEBUG) {
    log('Initialize `cache`,`screenshots` directory');
    fs.rmdirSync('cache', { recursive: true })
    fs.mkdirSync('cache')
    fs.rmdirSync('screenshots', { recursive: true })
    fs.mkdirSync('screenshots')
  }

  const browser = await puppeteer.launch({
    args: ['--lang=ja,en-US,en']
  });
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(2 * 60 * 1000);

  log('Open https://dash.adjust.com/');
  page.goto('https://dash.adjust.com/');
  await page.waitForSelector('#email');
  await page.waitFor(1000);
  await sc(page, 'login');

  log('Input account email and password');
  await page.type('#email', EMAIL);
  await page.type('#password', PASSWORD);
  await sc(page, 'login_input');

  log('Now login ...');
  page.keyboard.press('Enter');
  await page.waitForNavigation();
  await page.waitFor(1000);
  await sc(page, 'login_complete');
  log('Login completed.');

  log('Open https://dash.adjust.com/#/setup/APP_TOKEN/secrets');
  page.goto(`https://dash.adjust.com/#/setup/${APP_TOKEN}/secrets`);
  await page.waitForNavigation();
  await page.waitFor(4000);
  await sc(page, 'secrets');

  log('Change to visible all secrets');
  const showDisableSecretsToggleSelector = 'div>label>input[type="checkbox"]';
  const showDisableSecretsToggleText = await page.evaluate((selector) => {
    return document.querySelector(selector).parentNode.innerText;
  }, showDisableSecretsToggleSelector);
  if (!showDisableSecretsToggleText.includes('無効化されているアプリシークレットを表示')) {
    error('Can\'t get html element \'無効化されているアプリシークレットを表示\'');
  }
  const disableShowSecretToggle = await page.$(showDisableSecretsToggleSelector);
  disableShowSecretToggle.click();
  await page.waitFor(1000);
  await sc(page, 'show_all_secrets');

  log('Get all secrets');
  const secrets = await getSecrets(page);
  await fs.writeFileSync('cache/secrets.json', JSON.stringify(secrets, null, 2));
  log(`Show currrent Adjust SDK Signature\n====================\n${secrets.map(s => `${s.name} (enable: ${s.isEnable})`).join('\n')}\n====================`);

  if (showCurrentOnly) {
    process.exit(0);
  }

  log(`${changeToDisableMode ? 'Change to disable' : 'Find or get'} secret '${targetSecretName}'`);

  const targetSecretOnAdjust = secrets.filter(s => s.name === targetSecretName)[0];
  let changedSecret = false;

  if (changeToDisableMode) {
    if (targetSecretOnAdjust) {
      log(`Find secret '${targetSecretName}'`)
      if (targetSecretOnAdjust.isEnable) {
        log(`Change to disable secret '${targetSecretName}'`);

        const clickDisableSecretResult = await clickDisableSecret(page, targetSecretName);
        if (!clickDisableSecretResult) {
          error(`Can't get html element 'disable button'`);
        }
        await page.waitForNavigation();
    
        const toDisableSecretResult = await toDisableSecret(page);
        if (!toDisableSecretResult) {
          error(`Can't get html element 'confirm disable button'`);
        }

        changedSecret = true;
      } else {
        log(`Already disabled secret '${targetSecretName}'`);
      }
    } else {
      error(`Can't find secret '${targetSecretName}'`);
    }
  } else {
    if (targetSecretOnAdjust) {
      log(`Find secret '${targetSecretName}'`);
      if (!targetSecretOnAdjust.isEnable) {
        log(`Change to enable secret '${targetSecretName}'`);
        const toEnableSecretResult = await toEnableSecret(page, targetSecretName);
        if (!toEnableSecretResult) {
          error(`Can't get html element 'enable button'`);
        }

        changedSecret = true;
      }
      outputResult(JSON.stringify(targetSecretOnAdjust));
    } else {
      log(`Can't find secret '${targetSecretName}'`);
      log(`Create new secret '${targetSecretName}'`);
      await newSecret(page, targetSecretName);

      const updatedSecrets = await getSecrets(page);
      const createdSecret = updatedSecrets.filter(s => s.name === targetSecretName)[0];

      if (createdSecret) {
        outputResult(JSON.stringify(createdSecret));
        changedSecret = true;
      } else {
        error(`Can't create new secret`)
      }
    }
  }

  if (changedSecret) {
    await page.waitFor(2000);
    const updatedSecrets = await getSecrets(page);
    await fs.writeFileSync('cache/updatedSecrets.json', JSON.stringify(updatedSecrets, null, 2));
    log(`Show updated Adjust SDK Signature\n====================\n${updatedSecrets.map(s => `${s.name} (enable: ${s.isEnable})`).join('\n')}\n====================`)
  }

  log('All completed')

  await browser.close();
})().catch(err => {
  console.error(err.stack || err)
  process.exit(1)
});