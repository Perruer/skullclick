# ekill

It's like [**xkill**](https://en.wikipedia.org/wiki/Xkill), but for annoying web pages instead.

Chrome and Firefox plugin for quickly getting rid of elements on a web page.

## Installation

- [Chrome web store](https://chrome.google.com/webstore/detail/ekill/lcgdpfaiipaelnpepigdafiogebaeedg?hl=en)
- [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/ekill/)

![Example](https://media.githubusercontent.com/media/rhardih/ekill/master/example.gif)

## Keyboard shortcut

By default **ekill** is toggled with *ctrl+shift+k*, but this can be modified at will.

Go to [chrome://extensions/shortcuts](chrome://extensions/shortcuts), find the item labeled "ekill" and set it to whatever is most convenient.


## Options

### Grudge (Experimental)

Turning this feature on, will let ekill hold a grudge against offending
elements.

By keeping a record of killed of elements on a per page basis, ekill will try
it's best to remove these elements on subsequent visits to the same page.

A rudimentary ui for toggling *Grudge*, as well as  listing and editing the hit
list, is included in the options page.

## License

MIT: http://rhardih.mit-license.org

## Changelog

**1.8**

- Changes the default hot-key from Ctrl+k to Ctrl+Shift+k.

**1.7**

- Adds a kill count badge to the extension icon.

**1.6**

- Adds the Grudge feature
- Adds options page to control Grudge
- Adds changelog notifications on version upgrades

**1.5**

- Adds light icons for Firefox dark theme.

**1.4**

- Adds support for Firefox

**1.1 - 1.3**

- Introduces ability to toggle on/off, as well as dismiss with Esc key
- Permissions narrowed to *activeTab* only
- Targets anything with *role=button*

**1.0**

- Initial version

## Support the project

SkullClick is free, open source, and has no ads or tracking. If it saves you
from annoying pop-ups, you can support its development:

- **Boosty:** https://boosty.to/mikio_kuroki/donate
- **USDT / TRX, TRON (TRC-20):** `TXUBW4e88SDTfrnJRKfbhYfFcggufbonc1`
- **USDT / USDC / ETH, Ethereum or any EVM network (ERC-20):** `0x1378491169064702786b2E5b58c6375776177E8A`
- **TON / USDT on TON:** `UQAhI7EKzoa-JuKOfv0ULMzA3FrmpxsDkXj8Qevwj2z1cMRN`

Send only on the network listed next to each address. Starring the repository
and reporting bugs also helps a lot.

## Based on ekill by René Hansen

SkullClick is a fork of [ekill](https://github.com/rhardih/ekill) by
[René Hansen](https://github.com/rhardih), released under the MIT License.
The original copyright notice is kept in [LICENSE](LICENSE).
