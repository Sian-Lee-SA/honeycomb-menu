# Honeycomb-Menu for Home Assistant by [@Sian-Lee-SA](http://github.com/Sian-Lee-SA)

## About

Honeycomb menu is a [Home Assistant](https://www.home-assistant.io/) module (not a card) that can be applied to any lovelace card. When activated by the defined action on said card, the module will display a 'rounded' list of honeycomb buttons with an optional XY pad to make interfacing with lovelace more fluent. This module was designed with [button-card](https://github.com/custom-cards/button-card) by [@RomRider](https://github.com/RomRider) in mind.

The module uses a hierarchy override for honeycomb options and sub options so you can define a templated version of options then define another set of options that will merge / cascade.

> This is still in alpha stages and has only be used and tested in chrome. Please expect errors and bugs otherwise you will be overly frustrated & disappointed!

![Example of Honeycomb](examples/example-1.gif)
![Example of XYPad](examples/example-xypad.gif)

## Requirements
1. [Card Tools](https://github.com/thomasloven/lovelace-card-tools)

## How to install
1. Download the [module](https://github.com/Sian-Lee-SA/honeycomb-menu/releases)
1. Place the file into the `config/www` path of your home assistant installation
    > (you can place into a sub directory if you have OCD like me :grinning: just remember to point the resource url with the sub path)

1. Add the resource to the lovelace config. _There are two ways in doing this_
  1. `yaml` - find your lovelace.yaml then place the following into resources eg.
        ```yaml
            resources:
              - url: /local/{path-to-module}.js
                type: module
        ```
  1. `Web Interface` - (Home Assistant V0.108+):
    1. Goto the configuration page then open `Lovelace Dashboards`
    1. Select the `Resources` tab
    1. Click on the `+` (add) button in the lower right
    1. In the url field, add the module js file path ( Where your Home Assistant config/www/ path is needs to be replaced with /local/).  So a path to a saved file in `homeassistant_path/config/wwww/module.js` would be `/local/module.js` as the url path
    1. Ensure Resource type is left as Javascript Module

## How to use
when you define a card into your layout, you can just add honeycomb to the card config
```yaml
- type: vertical-stack
  cards:
  - type: custom:button-card
    entity: light.kitchen
    # custom:button-card Templates can also hold
    # honeycomb options and is written as the same
    template: light
    # below will bind the honeycomb to this card
    # This can be omited if honeycomb is already in template
    # Or you can simply merge and override the template values
    honeycomb:
```

## `honeycomb:` Options

Option          | Values        | Default   | Details
--              | -             |-          |-
action          | `tap \| hold \| double_tap` | `hold` | Define the action that will activate the honeycomb menu (the action is bound to the card). It maybe wise to ensure this action doesn't bubble that will execute the cards default action; so for [custom:button-card](https://github.com/custom-cards/button-card) just make sure the options for that card doesn't conflict with same action that opens honeycomb unless you have unique reasons to do so.
entity | `any:entity_id` | `card:entity` | This will call actions on the entity (entity_id) defined. If omitted then the card entity will be used.
template_buttons | `list[0-5]`: [Button](#button-options) `\| break` | `null` | if using template or card options then this will allow the use of both card and template button configs. `break` will disable the honeycomb on the index.
buttons | `list[0-5]`: [Button](#button-options) `\| skip \| break` | `null \| template_buttons` | The buttons are your honeycombs :grinning:. There are a max of 6 buttons that you can define. _* note: list indexes start at `0`_. Matching indexes with **template_buttons** will be overridden. Using the string `skip` on an index will use the `template_button` for that index and the string `break` will instead disable that honeycomb position regardless of the `template_button` value for that index.
active | `true \| false` | `false` | Setting this to true will apply active styles based on the entity it's assigned to
autoclose | `true \| false` | `true` | Close the menu if a button is pressed
audio | `true \| false` | `true` | Play button sound on tap
xy_pad | [XYPad](#xypad-options) | `null` | This will allow the adding of a xy pin in the middle of the honeycombs which can execute a service based on the x or y value
size | `int:px` | `225` | The size in px of the honeycomb menu. Each button item grows with the size
spacing | `int:px` | `2` | This will assign the padding in px for each honeycomb item

## `Button` Options

Option          | Values        | Default   | Details
--              | -             | -         | -
type | `any:card` | `custom:button-card` | The base card to use for the button **Be sure to set the underlying card to 100% height or it may not display correctly**
active | `true \| false` | `honeycomb:active` | Override the honeycomb active property for this button item
autoclose | `true \| false` | `honeycomb:autoclose` | Override the honeycomb autoclose property for this button
audio | `true \| false` | `honeycomb:audio` | Override the honeycomb audio property for this button
entity | `any:entity_id` | `honeycomb:entity` | You can define the entity that this button targets. Omitted will resort to the honeycombs entity.
icon | `any:icon` | `null` | Only adding here for reference to custom:button-card so you can show an icon for the item
color | `any:css_color` | var(--honeycomb-menu-icon-color) | Color of icon or background (depending on custom:button-card config). Leaving the default value allows the theme to handle the color
show_name | `true \| false` | `false` | Only relevant for cards that support this option
 * Any other options for `Button:type` | - | - | -

## `XYPad` Options

The x and y properties have the same options. If one of the x or y properties are omitted then the pad will only go the direction that's defined.

The pad can be useful for things like light brightness, color hue rotation, opening and closing shutters or roller doors etc.

![Example of XYPad](examples/example-xypad.gif)

Option          | Values        | Default   | Details
--              | -             | -         | -
repeat | `int:ms \| false` | `false` | If the xy pin is moved but idle, then repeat will continue calling the service otherwise the service will only be called when the xy pin is moving
on_release | `true \| false` | `false` | Only call the service when the xy pin has been released while providing the x y value that it was on
x | [XYConfig](#xyconfig) | `null` | See below for properties and values. * `null` will disable x movements
y | [XYConfig](#xyconfig) | `null` | See below for properties and values. * `null` will disable y movements

#### XYConfig
Option          | Values        | Default   | Details
--              | -             | -         | -
invert | `true \| false` | `false` | x or y will swap negative and positive values so moving xy pin up will give a positive value whereas down will give a negative value
service | `any:service` | `null` | The service to call eg. light.turn_on. If this value is omitted then the ball pin will have no effect on this axis
service_data | `dict` | `null` | Provide any service data as a dictionary / object. This property will be processed through the template system allowing access to variables and javascript. See [Templating](#templating).

## Theme Styles and Defaults

Adding the following style properties to your theme `.yaml` file will override the defaults
```css
/* Styles selector is used as a placeholder for syntax highlighting */
styes {
    --honeycomb-menu-icon-color: var(--paper-item-icon-color);
    --honeycomb-menu-icon-active-color: var(--paper-item-icon-active-color);
    --honeycomb-menu-background-color: var(--paper-card-background-color);
    --honeycomb-menu-active-background-color: var(--paper-card-active-background-color, var(--paper-card-background-color));
	--honeycomb-menu-disabled: #9a9a9a6e
}
```

## Templating
Templating is currently available for all `XYConfig:service_data` properties. Templating allows flexibility and provide values based on the xy pads positions.

A property only containing the word **entity** will be converted to the `honeycomb:entity` value.

There are two templating syntax's
1. Uses `{{ variable }}` syntax to retrieve the xy pad event variables. These variables come with either a negative or positive values depending on direction from center
        Available variables are:

        x: Pixels from the x center position
        y: Pixels from the y center position
        x_percentage: Percentage of the x position
        y_percentage: Percentage of the y position

1. Uses a modified version of [button-card](https://github.com/custom-cards/button-card) by [@RomRider](https://github.com/RomRider) templating system using the `[[[ return 'some_value' ]]]` syntax (remember to return your values!). Head over to [button-card templates](https://github.com/custom-cards/button-card#templates) for an insight to how this templating system works.

The first template syntax `{{ }}` will be parsed first allowing the [button-card templates](https://github.com/custom-cards/button-card#templates) syntax `[[[  ]]]` parser to work with the actual values from the xy pad. eg.

```javascript
[[[ return {{ x_percentage }} / 10; ]]]
```
_becomes_:

```javascript
[[[ return 50 / 10; ]]]
```
> the second parser would then give the value of `5` based on the example above and `x_percentage = 50`
#### Examples
It's also possible to just use the first parser or second parser without the other. The following example with result in the `service_data:brightness` value to be the actual percentage of the xy pin `x` or `y` value:

> Note: the following service `light.relative_brightnesss` is not a part of Home Assistant but instead is my own custom service that changes a lights brightness relatively. You could achieve the same outcome with the `light.turn_on` service and using the javascript template parser with some calculations

```yaml
honeycomb:
  entity: light.kitchen
  xy_pad:
    x:
      invert: true
      service: light.relative_color
      service_data:
        # The word entity will become light.kitchen
        entity_id: entity
        hue: '[[[ return {{ y }} / 18 * {{ y_percentage }}; ]]]'        
    y:
      service: light.relative_brightnesss
      service_data:
        # We can define another entity like normal
        entity_id: light.bathroom
        brightness: '{{ x_percentage }}'
        percentage: true
```
