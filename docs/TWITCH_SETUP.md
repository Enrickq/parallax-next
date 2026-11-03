# Connect Twitch chat

Run the server on the same computer as the studio. The connector reads Twitch IRC over TLS; it never sends chat messages. With no Twitch configuration, PARALLAX starts in labeled simulation mode.

The commands below are for PowerShell. Stop an existing server with `Ctrl+C` before changing configuration. `.env.example` is a reference; the app does not load it automatically.

## Public read-only connection

Replace `your_channel` with the channel login, without `#` or a URL:

```powershell
$env:TWITCH_CHANNEL = 'your_channel'
$env:TWITCH_ANONYMOUS = '1'
node server.js
```

This is an explicit opt-in to the anonymous `justinfan` pattern implemented by [tmi.js](https://github.com/tmijs/tmi.js/blob/main/lib/ClientBase.js). PARALLAX implements its own connector with Node's standard library; tmi.js is a reference, not a dependency. This mode needs no token, reads public chat only and supplies no invented password. Anonymous availability is not guaranteed by Twitch; use authenticated access if it is unavailable.

The studio shows connected only after joining the configured room. The public state identifies this mode as `connectionType: "public-read-only"`.

## Use an existing user token

Obtain a token through [Twitch OAuth](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/) for the account that will read chat. The [IRC documentation](https://dev.twitch.tv/docs/chat/irc/) describes authentication. The reader uses `chat:read`; sending messages would require `chat:edit`, which PARALLAX does not use.

```powershell
$env:TWITCH_CHANNEL = Read-Host 'Twitch channel login'
$env:TWITCH_ANONYMOUS = '0'
$env:TWITCH_BOT_USERNAME = Read-Host 'Token owner / bot login'
$twitchToken = Read-Host 'Twitch user access token' -AsSecureString
$env:TWITCH_OAUTH_TOKEN = [System.Net.NetworkCredential]::new('', $twitchToken).Password
node server.js
```

Keep tokens out of Git, screenshots and recordings. After stopping the server, clear the value from that shell:

```powershell
Remove-Item Env:TWITCH_OAUTH_TOKEN -ErrorAction SilentlyContinue
$twitchToken = $null
```

## Authorize in a local browser

Register a **Confidential** Twitch application with the exact redirect `http://localhost:3000/auth/callback`. The helper uses Twitch's [implicit grant flow](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#implicit-grant-flow); it uses the public client ID without the client secret. Twitch's Public application type supports the device flow instead.

```powershell
$env:TWITCH_CHANNEL = 'your_channel'
$env:TWITCH_ANONYMOUS = '0'
$env:TWITCH_CLIENT_ID = Read-Host 'Twitch application public client ID'
node server.js
```

Open `http://localhost:3000/auth/twitch` and authorize `chat:read`. This flow does not need `TWITCH_BOT_USERNAME` or `TWITCH_OAUTH_TOKEN`. Use `localhost` throughout: authorization is bound to the exact origin and browser cookie. If `PORT` changes, register the matching callback port too.

The helper checks a single-use state and calls [Twitch token validation](https://dev.twitch.tv/docs/authentication/validate-tokens/) to verify app ID, owner, scope and expiry. Validation repeats at least hourly. The validated owner becomes the reader's login. Tokens remain in process memory, are removed from the callback URL and are not written to logs or disk. Restarting requires authorization again. The helper accepts requests only from the local computer.

## Verify the complete interaction

1. Wait for the studio's confirmed connection to the intended channel.
2. Open a round.
3. Send `!a`, then `!spark hope`, from Twitch's chat interface.
4. Confirm both contributions appear in the studio and OBS overlay.
5. Collapse the round and verify the world and history change.

For authenticated IRC, use a separate viewer account if sending through the same IRC connection: Twitch does not echo that connection's outgoing `PRIVMSG` back to itself. A browser message and the public anonymous reader are separate connections.

Simulation injection is disabled in either live mode, including while disconnected. A room join proves connectivity; accepted commands prove the complete chat path. Automated tests establish neither real viewer participation nor a completed live recording.