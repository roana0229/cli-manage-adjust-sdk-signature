# Manage `AdjustSDK Signature` on CLI

Use https://github.com/puppeteer/puppeteer

## How to Use

```
yarn install
ADJUST_EMAIL='xxx' ADJUST_PASSWORD='xxx' ADJUST_APP_TOKEN='xxx' node cli-manage-adjust.js --app AppName --version AppVersion
```

a.g.

```
ADJUST_EMAIL='xxx' ADJUST_PASSWORD='xxx' ADJUST_APP_TOKEN='xxx' node cli-manage-adjust.js --app ExampleApp --version 1.0.0
# Create or find secret `ExampleApp#1.0.0`
```

- Require env
  - `ADJUST_EMAIL`: Adjust account email
  - `ADJUST_PASSWORD`: Adjust account password
  - `ADJUST_APP_TOKEN`: Adjust target app token
- Options
  - `--current`: Only show current secrets.
    - `ADJUST_EMAIL='xxx' ADJUST_PASSWORD='xxx' ADJUST_APP_TOKEN='xxx' node cli-manage-adjust.js --current`
  - `--disable`: Change to disable secret.
    - `ADJUST_EMAIL='xxx' ADJUST_PASSWORD='xxx' ADJUST_APP_TOKEN='xxx' node cli-manage-adjust.js --app AppName --version 1.0.0 --disable`
  - `--debug`: Save running screenshots and secrets as json.
    - `ADJUST_EMAIL='xxx' ADJUST_PASSWORD='xxx' ADJUST_APP_TOKEN='xxx' node cli-manage-adjust.js --app AppName --version 1.0.0 --debug`
