# Manage `AdjustSDK Signature` on CLI

Use https://github.com/puppeteer/puppeteer

## How to Use

```
yarn install
EMAIL='xxx' PASSWORD='xxx' APP_TOKEN='xxx' node cli-manage-adjust.js --app AppName --version AppVersion
```

a.g.

```
EMAIL='xxx' PASSWORD='xxx' APP_TOKEN='xxx' node cli-manage-adjust.js --app ExampleApp --version 1.0.0
# Create or find secret `ExampleApp#1.0.0`
```

- Require env
  - `EMAIL`: Adjust account email
  - `PASSWORD`: Adjust account password
  - `APP_TOKEN`: Adjust target app token
- Options
  - `--current`: Only show current secrets.
    - `EMAIL='xxx' PASSWORD='xxx' APP_TOKEN='xxx' node cli-manage-adjust.js --current`
  - `--disable`: Change to disable secret.
    - `EMAIL='xxx' PASSWORD='xxx' APP_TOKEN='xxx' node cli-manage-adjust.js --app AppName --version 1.0.0 --disable`
  - `--debug`: Save running screenshots and secrets as json.
    - `EMAIL='xxx' PASSWORD='xxx' APP_TOKEN='xxx' node cli-manage-adjust.js --app AppName --version 1.0.0 --debug`
