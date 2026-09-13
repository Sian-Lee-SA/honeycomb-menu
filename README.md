# Honeycomb Menu NG for Home Assistant

Enhanced fork of [Sian-Lee-SA/honeycomb-menu](https://github.com/Sian-Lee-SA/honeycomb-menu) with flexible 18-slot layouts, an optional center button, shared styling, nested menus, and soft/hard slot positioning.

Honeycomb Menu NG is a **Home Assistant dashboard module**, not a standalone card. It can be attached to Lovelace cards through `fire-dom-event` and opens a floating menu made from hexagonal buttons.

> Current NG features are focused on flexible layouts, styling and menu interaction while keeping backwards compatibility with existing Honeycomb Menu YAML where possible.

## Highlights

- Up to **18 ring buttons** plus an optional center button
- **6-slot inner ring** and **12-slot outer ring**
- Automatic ring selection based on button count
- Soft and hard slot positioning
- Automatic center button using the Honeycomb entity
- Configurable center-button contrast with `center_brightness`
- Global `button_defaults` styling
- `empty_slots: visible|hidden`
- Nested Honeycomb menus
- Existing template and XY-pad support
- Legacy `position` support

## Requirements

Honeycomb Menu NG is designed to use [custom:button-card](https://github.com/custom-cards/button-card) for its menu buttons.

Install `button-card` before using Honeycomb Menu NG.

## Installation

### HACS — recommended

1. Open **HACS** in Home Assistant.
2. Open **Custom repositories**.
3. Add:

   ```text
   https://github.com/NicolaiTandrup/honeycomb-menu-ng
   ```

4. Select **Dashboard** as the repository type.
5. Install **Honeycomb Menu NG**.
6. Reload the browser after installation or update.

The resource should normally be:

```text
/hacsfiles/honeycomb-menu-ng/honeycomb-menu-ng.js
```

with resource type:

```text
JavaScript module
```

### Manual installation

Download `honeycomb-menu-ng.js` from the latest release and place it somewhere below `/config/www/`.

For example:

```text
/config/www/honeycomb-menu-ng/honeycomb-menu-ng.js
```

Then add the Lovelace resource:

```yaml
resources:
  - url: /local/honeycomb-menu-ng/honeycomb-menu-ng.js
    type: module
```

## Quick start

Honeycomb Menu NG is opened using `fire-dom-event`.

```yaml
type: button
entity: light.kitchen
name: Kitchen
hold_action:
  action: fire-dom-event
  honeycomb_menu:
    entity: light.kitchen
    buttons:
      - icon: mdi:lightbulb-on-outline
        tap_action:
          action: call-service
          service: light.turn_on
          service_data:
            entity_id: light.kitchen

      - icon: mdi:lightbulb-off-outline
        tap_action:
          action: call-service
          service: light.turn_off
          service_data:
            entity_id: light.kitchen

      - icon: mdi:information-outline
        tap_action:
          action: more-info
```

The same pattern can be used from `picture-elements`, `custom:button-card`, Mushroom cards, or other Lovelace cards that support `fire-dom-event` actions.

## Layout model

Honeycomb Menu NG has two physical button rings:

- **Slots 1–6**: inner ring
- **Slots 7–18**: outer ring
- **Center button**: separate from slot numbering

Approximate slot layout:

```text
                 9    10    11
             8      2    3      12

          7      1   CENTER  4      13

            18      6    5      14
                17   16   15
```

### Automatic ring selection

Without hard-slot overrides, the active ring layout is selected from the number of resolved buttons:

| Buttons | Active layout |
|---:|---|
| 1–6 | Inner ring |
| 7–12 | Outer ring |
| 13–18 | Inner + outer ring |

A hard slot can force its physical ring to be active even when the button count would normally select another layout.

## Empty slots

By default, unused positions in active rings remain visible:

```yaml
empty_slots: visible
```

To show only configured buttons:

```yaml
empty_slots: hidden
```

Only slots belonging to active rings are affected.

## Center button

The center button is enabled automatically unless explicitly disabled.

By default it:

- uses the Honeycomb menu `entity`
- inherits `active`
- uses `autoclose: true`
- opens `more-info` when tapped

### Override the center button

```yaml
honeycomb_menu:
  entity: light.kitchen
  center_button:
    icon: mdi:lightbulb-group
    tap_action:
      action: toggle
```

### Disable the center button

```yaml
center_button: false
```

### Center brightness

When the center button inherits its background from `button_defaults`, Honeycomb Menu NG makes it slightly lighter so the center is visually distinct.

The default is:

```yaml
center_brightness: 15
```

This means a 15% lightness boost where the inherited background color can be parsed. If the color cannot be parsed, a brightness filter is used as fallback.

Set it to `0` to disable the automatic contrast:

```yaml
center_brightness: 0
```

Or increase it:

```yaml
center_brightness: 25
```

If `center_button` defines its own background color, that explicit background wins and the automatic center adjustment is not applied.

## Global button defaults

Use `button_defaults` to apply common configuration to all ring buttons without repeating it on every button.

```yaml
honeycomb_menu:
  entity: light.kitchen
  button_defaults:
    styles:
      card:
        - background: rgba(110, 110, 110, 0.65)
        - border: 1px solid rgba(255, 255, 255, 0.12)
  buttons:
    - icon: mdi:lightbulb-on-outline
      tap_action:
        action: toggle

    - icon: mdi:lightbulb-off-outline
      tap_action:
        action: call-service
        service: light.turn_off
        service_data:
          entity_id: light.kitchen
```

A button can override any default locally:

```yaml
- icon: mdi:lightbulb-group
  styles:
    card:
      - background: rgba(150, 150, 150, 0.70)
```

## Slot positioning

### Automatic positioning

If no `slot` or legacy `position` is supplied, buttons are assigned to the first free position in the active layout.

```yaml
buttons:
  - icon: mdi:lightbulb
  - icon: mdi:fan
  - icon: mdi:door
```

### Soft slots — default

`slot` is a **preference** by default.

```yaml
- slot: 9
  icon: mdi:lightbulb
```

If the requested physical slot belongs to an active ring, the button stays there.

If that ring is not active, the requested slot is mapped to the corresponding position in the active ring. If the preferred position is already occupied, Honeycomb Menu NG moves clockwise to the first free position.

Examples:

- 5 buttons + soft `slot: 7` → inner slot 1
- 9 buttons + soft `slot: 9` → physical outer slot 9
- 14 buttons + soft `slot: 9` → physical slot 9

### Hard slots

Use `slot_mode: hard` when the physical position must not move.

```yaml
- slot: 9
  slot_mode: hard
  icon: mdi:lightbulb
```

Hard slots:

- always use the exact physical slot
- can force inner and/or outer rings to become active
- are never moved to resolve a conflict

If two hard buttons request the same physical slot, the first one wins and a warning is written to the browser console.

### Legacy `position`

The original `position` option remains supported for backwards compatibility and behaves as an absolute physical/index position.

```yaml
- position: 0
  icon: mdi:lightbulb
```

For new configurations, prefer `slot` and `slot_mode`.

## Nested Honeycomb menus

A Honeycomb button can open another Honeycomb menu by using `fire-dom-event` in its own action.

```yaml
buttons:
  - icon: mdi:menu-right
    tap_action:
      action: fire-dom-event
      honeycomb_menu:
        entity: light.kitchen
        buttons:
          - icon: mdi:lightbulb-on-outline
            tap_action:
              action: call-service
              service: light.turn_on
              service_data:
                entity_id: light.kitchen

          - icon: mdi:lightbulb-off-outline
            tap_action:
              action: call-service
              service: light.turn_off
              service_data:
                entity_id: light.kitchen
```

The currently open Honeycomb menu is closed when the nested menu opens.

## Example: picture-elements

```yaml
type: picture-elements
image:
  media_content_id: media-source://image_upload/your-image-id
  media_content_type: image/png

elements:
  - type: state-icon
    entity: light.kitchen
    style:
      left: 20%
      top: 20%
    tap_action:
      action: toggle
    hold_action:
      action: fire-dom-event
      honeycomb_menu:
        entity: light.kitchen
        autoclose: true
        active: true
        empty_slots: hidden
        center_brightness: 15

        button_defaults:
          styles:
            card:
              - background: rgba(170, 95, 95, 0.72)
              - border: 1px solid rgba(255, 255, 255, 0.12)

        center_button:
          icon: mdi:lightbulb-group
          tap_action:
            action: more-info

        buttons:
          - icon: mdi:lightbulb-on-outline
            tap_action:
              action: call-service
              service: light.turn_on
              service_data:
                entity_id: light.kitchen

          - slot: 3
            icon: mdi:lightbulb-off-outline
            tap_action:
              action: call-service
              service: light.turn_off
              service_data:
                entity_id: light.kitchen

          - icon: mdi:dots-horizontal
            tap_action:
              action: more-info
```

## Honeycomb menu options

| Option | Values | Default | Description |
|---|---|---|---|
| `entity` | entity ID | `null` | Primary entity used by the menu and inherited by buttons |
| `buttons` | list | `[]` | Ring button definitions |
| `active` | boolean / template | `false` | Enables active styling based on entity state or template result |
| `autoclose` | boolean | `true` | Default close behaviour after a button action |
| `audio` | URL/path | `false` | Default audio played when a button is tapped |
| `xy_pad` | object | `null` | Optional XY control pad |
| `size` | integer | `225` | Overall Honeycomb size |
| `spacing` | integer | `2` | Padding between Honeycomb items |
| `variables` | object | `{}` | Variables available to Honeycomb templates |
| `animation_speed` | integer (ms) | `100` | Delay increment between button animations |
| `button_defaults` | object | `{}` | Shared configuration merged into ring buttons |
| `empty_slots` | `visible` / `hidden` | `visible` | Controls empty positions in active rings |
| `center_button` | object / `false` | `{}` | Center button override, or `false` to disable it |
| `center_brightness` | number | `15` | Automatic center-background lightness boost in percent |

## Button options

Ring buttons use `custom:button-card` by default, so most button-card options can be passed through.

| Option | Values | Default | Description |
|---|---|---|---|
| `type` | card type | `custom:button-card` | Underlying Lovelace card used inside the hex |
| `entity` | entity ID | menu entity | Entity used by the button |
| `icon` | icon | — | Icon shown by the button |
| `show` | boolean / template | `true` | Whether the button is available |
| `active` | boolean / template | menu `active` | Per-button active override |
| `autoclose` | boolean | menu `autoclose` | Per-button autoclose override |
| `audio` | URL/path | menu `audio` | Per-button audio override |
| `slot` | `1–18` | — | Preferred or physical slot depending on slot mode |
| `slot_mode` | `soft` / `hard` | `soft` | Soft preference or hard physical placement |
| `position` | integer | — | Legacy absolute/index placement |
| `tap_action` | action | — | Tap action |
| `hold_action` | action | — | Hold action |
| `double_tap_action` | action | — | Double-tap action |

Additional options supported by the underlying card can also be supplied.

## XY Pad

The optional XY pad can execute services based on X and/or Y movement.

Typical uses include:

- light brightness
- hue or color changes
- blinds and covers
- relative volume or other service values

```yaml
honeycomb_menu:
  entity: light.kitchen
  xy_pad:
    repeat: 500
    y:
      invert: true
      service: light.turn_on
      data:
        entity_id: entity
        brightness_step_pct: 'HCJS: return variables.y_percentage / 10;'
```

### XY Pad options

| Option | Values | Default | Description |
|---|---|---|---|
| `repeat` | integer (ms) / `false` | `false` | Repeat service calls while the pad remains active |
| `on_release` | boolean | `false` | Only call the service when the pad is released |
| `x` | object | `null` | X-axis configuration |
| `y` | object | `null` | Y-axis configuration |

### XY axis options

| Option | Values | Default | Description |
|---|---|---|---|
| `invert` | boolean | `false` | Reverse positive and negative direction |
| `service` | service | — | Service to call |
| `data` / `service_data` | object | — | Service payload; supports Honeycomb templating |

The XY pad exposes:

```text
variables.x
variables.y
variables.x_percentage
variables.y_percentage
```

## Templating

Honeycomb Menu keeps the original templating system.

### HCJS

```yaml
active: 'HCJS: return entity.state === "on";'
```

### Triple-bracket JavaScript

`custom:button-card` configuration can continue to use button-card JavaScript templates where supported:

```yaml
name: >
  [[[
    return entity.state;
  ]]]
```

### Template literal syntax

```yaml
brightness_step_pct: '${variables.y_percentage}'
```

The literal word `entity` in Honeycomb service data is replaced with the Honeycomb menu entity.

## Honeycomb templates and variables

Existing Honeycomb templates remain supported and can inherit/override configuration through the original merge hierarchy.

Example:

```yaml
light:
  variables:
    motion: null
  buttons:
    - icon: mdi:information-variant
      tap_action:
        action: more-info

    - icon: mdi:motion-sensor
      show: 'HCJS: return variables.motion;'
      entity: 'HCJS: return variables.motion;'
      active: true
      tap_action:
        action: toggle
```

Use it with:

```yaml
hold_action:
  action: fire-dom-event
  honeycomb_menu:
    template: light
    entity: light.kitchen
    variables:
      motion: automation.kitchen_motion
```

## Theme variables

Honeycomb Menu NG retains the original theme variables:

```css
--honeycomb-menu-icon-color: var(--paper-item-icon-color);
--honeycomb-menu-icon-active-color: var(--paper-item-icon-active-color);
--honeycomb-menu-background-color: var(--paper-card-background-color);
--honeycomb-menu-active-background-color: var(--paper-card-active-background-color, var(--paper-card-background-color));
--honeycomb-menu-disabled: #9a9a9a6e;
```

`button_defaults` is usually the easiest way to apply menu-specific styling directly from YAML.

## Updating

When updating through HACS:

1. Install the new Honeycomb Menu NG version.
2. Reload the Home Assistant frontend.
3. If the old JavaScript is still visible, perform a hard browser refresh / clear the frontend cache.

## Backwards compatibility

Honeycomb Menu NG aims to remain compatible with existing Honeycomb Menu configurations.

Notable compatibility behaviour:

- legacy `position` remains supported
- original Honeycomb templates remain supported
- XY pad behaviour remains available
- normal button actions remain compatible

New configurations should generally use `slot` instead of `position`.

## Roadmap

Planned / experimental ideas include:

- improved mouse-hover interaction
- improved touch-drag interaction
- additional nested-menu navigation options
- more reusable menu presets and examples

## Examples and original documentation

The original project contains additional examples and background information:

- [Original Honeycomb Menu](https://github.com/Sian-Lee-SA/honeycomb-menu)
- [Honeycomb Module: Hex PopUp Menu For Home Assistant](https://smarthomescene.com/guides/honeycomb-module-hex-popup-menu-for-home-assistant/)
- [button-card](https://github.com/custom-cards/button-card)

Existing media from the original project:

![Example of Honeycomb](examples/example-1.gif)
![Example of XYPad](examples/example-xypad.gif)

## Credits

Honeycomb Menu NG is based on the original [Honeycomb Menu](https://github.com/Sian-Lee-SA/honeycomb-menu) project by Sian Lee / Sian-Lee-SA.

The original project was designed around [button-card](https://github.com/custom-cards/button-card) by [@RomRider](https://github.com/RomRider).

## Support the original author

<a href="https://www.paypal.com/donate/?business=A82MM255CXF9L&no_recurring=0&item_name=Donating+will+help+justify+my+time+coding+and+doing+projects+that+also+benifits+others.+Any+amount+is+greatly+appreciated%21&currency_code=AUD"><img src="https://github.com/andreostrovsky/donate-with-paypal/raw/master/blue.svg" height="38"></a>

[![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/SianLee)
