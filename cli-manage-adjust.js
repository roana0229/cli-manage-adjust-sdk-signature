const puppeteer = require('puppeteer');
const fs = require('fs');
const inquirer = require('inquirer');

const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const APP_TOKEN = process.env.APP_TOKEN;

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
  console.log(`${nowDateString()}> ${message}`);
}

const error = (message) => {
  console.log(`${nowDateString()} >`);
  console.error('==========ERROR==========');
  console.error(message);
  console.error('=========================');
}

const sc = async (page, name) => {
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
  log('WIP')
  // log('キャッシュ用のHTMLを保存')
  // var html = await page.evaluate(() => { return document.getElementsByTagName('html')[0].innerHTML }); 
  // await fs.writeFileSync('cache/disable_secret.html', html);

  let isSuccessToDisable = false
  return isSuccessToDisable
}

(async () => {
  log('アカウント情報をチェック');
  if (!(EMAIL && PASSWORD && APP_TOKEN)) {
    error('環境変数に`EMAIL`,`PASSWORD`,`APP_TOKEN`を設定してください');
    process.exit(1);
  }
  
  log('`cache`,`screenshots`ディレクトリを初期化');
  fs.rmdirSync('cache', { recursive: true })
  fs.mkdirSync('cache')
  fs.rmdirSync('screenshots', { recursive: true })
  fs.mkdirSync('screenshots')

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  log('Adjustのログイン画面を表示');
  await page.goto('https://dash.adjust.com/#/login');
  await page.waitForSelector('#email');
  await page.waitFor(1000);
  await sc(page, 'login');

  log('ログイン情報を入力');
  await page.type('#email', EMAIL);
  await page.type('#password', PASSWORD);
  await sc(page, 'login_input');

  log('ログイン実行');
  await page.keyboard.press('Enter');
  await page.waitForNavigation();
  await page.waitFor(1000);
  await sc(page, 'login_complete');

  log('SDKシグネイチャー画面を表示');
  await page.goto(`https://dash.adjust.com/#/setup/${APP_TOKEN}/secrets`);
  await page.waitFor(4000);
  await sc(page, 'secrets');

  log('無効なSDKシグネイチャーを表示');
  const showDisableSecretsToggleSelector = 'div>label>input[type="checkbox"]'
  const showDisableSecretsToggleText = await page.evaluate((selector) => {
    return document.querySelector(selector).parentNode.innerText;
  }, showDisableSecretsToggleSelector);
  if (!showDisableSecretsToggleText.includes('無効化されているアプリシークレットを表示')) {
    error('「無効化されているアプリシークレットを表示」が取得できませんでした');
    process.exit(1);
  }
  const disableShowSecretToggle = await page.$(showDisableSecretsToggleSelector);
  disableShowSecretToggle.click();
  await page.waitFor(1000);
  await sc(page, 'show_all_secrets');

  log('キャッシュ用のHTMLを保存')
  var html = await page.evaluate(() => { return document.getElementsByTagName('html')[0].innerHTML }); 
  await fs.writeFileSync('cache/all_secrets.html', html); 

  log('SDKシグネイチャーを取得')
  const secrets = await getSecrets(page);
  await fs.writeFileSync('cache/secrets.json', JSON.stringify(secrets, null, 2));

  const answer = await inquirer.prompt([
    {
      'type': 'list',
      'name': 'targetSecret',
      'message': 'どのシークレットを変更しますか?',
      'choices': secrets.map(s => s.name)
    },
    {
      'type': 'list',
      'name': 'mode',
      'message': 'どの操作を行いますか？',
      'choices': ['有効化', '無効化']
    }
  ])
  const targetSecret = secrets.filter(s => s.name === answer.targetSecret)[0]
  const toEnable = answer.mode === '有効化'
  if (targetSecret.isEnable === toEnable) {
    error(`'${answer.targetSecret}'は既に'${answer.mode}'されています`)
    process.exit(1);
  }

  if (toEnable) {
    log(`'${targetSecret.name}'を有効化`)
    const toEnableSecretResult = await toEnableSecret(page, targetSecret.name)
    if (!toEnableSecretResult) {
      error(`「'${targetSecret.name}'の有効化ボタン」が取得できませんでした`);
      process.exit(1);
    }

    log(`'${targetSecret.name}'を有効化に成功`)
    await page.waitFor(2000);
    await sc(page, 'change_to_enable');
  } else {
    log(`'${targetSecret.name}'を無効化`)
    const clickDisableSecretResult = await clickDisableSecret(page, targetSecret.name)
    if (!clickDisableSecretResult) {
      error(`「'${targetSecret.name}'の無効化ボタン」が取得できませんでした`);
      process.exit(1);
    }
    await page.waitForNavigation();

    const toDisableSecretResult = await toDisableSecret(page)
    if (!toDisableSecretResult) {
      error(`「'${targetSecret.name}'の無効化決定ボタン」が取得できませんでした`);
      process.exit(1);
    }

    log(`'${targetSecret.name}'を無効化に成功`)
    await page.waitFor(2000);
    await sc(page, 'change_to_disable');
  }

  log('更新後のSDKシグネイチャーを取得')
  await fs.writeFileSync('cache/secrets.json', JSON.stringify(await getSecrets(page), null, 2));

  await browser.close();
})();

// // デバッグ用のコード
// (async () => {
//   const browser = await puppeteer.launch();
//   const page = await browser.newPage();

//   var contentHtml = fs.readFileSync('cache/all_secrets.html', 'utf8');
//   var contentHtml = fs.readFileSync('cache/disable_secrets.html', 'utf8');
//   await page.setContent(contentHtml);

//   await browser.close();
// })();
